import {
  type ComponentKey,
  type DestinationKey,
  type IndiaTrack,
  type ProfileContext,
  type ProfileSnapshot,
} from '@/types/profile-context';
import { RELEVANCE_MATRIX, isActionable, maxTier } from '@/lib/relevance';

// Derive which India sub-track applies, combining DB-stored value with deterministic rules.
export function deriveIndiaTrack(
  major: string | null,
  board: string | null,
  stored: string | null,
): IndiaTrack | null {
  // Stored explicit value wins (unless 'unsure' — keep computing)
  if (stored && stored !== 'unsure') return stored as IndiaTrack;

  if (major === 'Medicine & Healthcare') return 'neet';

  if (major === 'Engineering & CS') {
    if (board && ['IB', 'Cambridge'].includes(board)) return 'holistic';
    return 'jee';
  }

  const holisticMajors = [
    'Business & Economics',
    'Humanities & Social Sciences',
    'Arts & Design',
    'Law & Political Science',
  ];
  if (holisticMajors.includes(major ?? '')) return 'holistic';

  // Ambiguous (Sciences, Undecided) — return stored if 'unsure', else null
  return (stored as IndiaTrack) ?? null;
}

// Map a country string + indiaTrack to DestinationKey(s).
// India expands to one of the three track keys.
function toDestinationKeys(countries: string[], indiaTrack: IndiaTrack | null): DestinationKey[] {
  const keys: DestinationKey[] = [];
  for (const c of countries) {
    if (c === 'India') {
      if (indiaTrack === 'jee') keys.push('India_JEE');
      else if (indiaTrack === 'neet') keys.push('India_NEET');
      else if (indiaTrack === 'holistic') keys.push('India_Holistic');
      else {
        // Unknown track — include all three so we don't hide anything
        keys.push('India_JEE', 'India_NEET', 'India_Holistic');
      }
    } else {
      const map: Record<string, DestinationKey> = {
        USA: 'USA', UK: 'UK', Canada: 'Canada',
        Australia: 'Australia', Singapore: 'Singapore',
        Germany: 'Germany', Netherlands: 'Netherlands',
      };
      if (map[c]) keys.push(map[c]);
    }
  }
  // Deduplicate
  return [...new Set(keys)];
}

// Estimate profile completion % for a destination based on currently available profile fields.
// Returns 0–100. This is intentionally approximate — designed to be extended as more tables are added.
function estimateCompletion(
  dest: DestinationKey,
  profile: ProfileSnapshot,
): number {
  const tests = profile.tests_taken ?? [];
  const ecs = profile.activities ?? [];

  // Per-destination T1 checks: [is_filled, weight]
  type Check = [boolean, number];
  const checks: Record<DestinationKey, Check[]> = {
    USA: [
      [Boolean(profile.academic_score), 1],   // grades
      [tests.some(t => ['SAT', 'ACT'].includes(t)), 1], // SAT/ACT
      [ecs.length > 0, 1],                     // ECs
      [Boolean(profile.intended_major), 0.5],
    ],
    UK: [
      [Boolean(profile.academic_score), 1],
      [tests.some(t => ['IELTS', 'TOEFL'].includes(t)), 1],
      [Boolean(profile.board), 0.5],
    ],
    Canada: [
      [Boolean(profile.academic_score), 1],
      [tests.some(t => ['IELTS', 'TOEFL'].includes(t)), 0.8],
      [Boolean(profile.intended_major), 0.5],
    ],
    Australia: [
      [Boolean(profile.academic_score), 1],
      [tests.some(t => ['IELTS', 'TOEFL'].includes(t)), 1],
    ],
    Singapore: [
      [Boolean(profile.academic_score), 1],
      [tests.some(t => ['SAT', 'ACT', 'IELTS'].includes(t)), 0.8],
      [ecs.length > 0, 0.6],
    ],
    Germany: [
      [Boolean(profile.academic_score), 1],
    ],
    Netherlands: [
      [Boolean(profile.academic_score), 1],
    ],
    India_JEE: [
      [tests.some(t => ['JEE_MAINS', 'JEE_ADVANCED'].includes(t)), 1],
      [Boolean(profile.academic_score), 0.5],
    ],
    India_NEET: [
      [tests.some(t => ['NEET'].includes(t)), 1],
      [Boolean(profile.academic_score), 0.5],
    ],
    India_Holistic: [
      [Boolean(profile.academic_score), 1],
      [ecs.length > 0, 0.8],
      [Boolean(profile.intended_major), 0.5],
    ],
  };

  const destChecks = checks[dest] ?? [];
  if (destChecks.length === 0) return 0;

  const total = destChecks.reduce((sum, [, w]) => sum + w, 0);
  const filled = destChecks.reduce((sum, [ok, w]) => sum + (ok ? w : 0), 0);

  return Math.round((filled / total) * 100);
}

// Display label for a DestinationKey
export function destinationLabel(key: DestinationKey): string {
  const labels: Record<DestinationKey, string> = {
    USA: 'USA', UK: 'UK', Canada: 'Canada', Australia: 'Australia',
    Singapore: 'Singapore', Germany: 'Germany', Netherlands: 'Netherlands',
    India_JEE: 'India (JEE)', India_NEET: 'India (NEET)', India_Holistic: 'India',
  };
  return labels[key];
}

const EMPTY_CONTEXT: ProfileContext = {
  targetCountries: [],
  destinationKeys: [],
  indiaTrack: null,
  needsECs: false,
  needsEssays: false,
  needsRecs: false,
  needsLanguageTest: false,
  needsEntranceExam: false,
  needsSAT: false,
  relevance: Object.fromEntries(
    (Object.keys({
      entrance_exam: '', grades: '', sat_act: '', ielts_toefl: '', extracurriculars: '',
      essays: '', recommendations: '', admissions_tests: '', interviews: '',
      language_proficiency: '', honors_awards: '', predicted_grades: '',
    }) as string[]).map(k => [k, 'NA'])
  ) as Record<ComponentKey, 'NA'>,
  completionByDestination: {},
};

export function getProfileContext(profile: ProfileSnapshot | null): ProfileContext {
  if (!profile) return EMPTY_CONTEXT;
  const targetCountries = profile.target_countries ?? [];
  const indiaTrack = targetCountries.includes('India')
    ? deriveIndiaTrack(profile.intended_major, profile.board, profile.india_track ?? null)
    : null;

  const destinationKeys = toDestinationKeys(targetCountries, indiaTrack);

  // Build per-component relevance (highest tier across all destinations)
  const components = Object.keys(RELEVANCE_MATRIX) as ComponentKey[];
  const relevance = Object.fromEntries(
    components.map(c => [c, maxTier(c, destinationKeys)])
  ) as Record<ComponentKey, ReturnType<typeof maxTier>>;

  // Convenience booleans
  const needsECs = isActionable(relevance.extracurriculars);
  const needsEssays = isActionable(relevance.essays);
  const needsRecs = isActionable(relevance.recommendations);
  const needsLanguageTest = isActionable(relevance.ielts_toefl) || isActionable(relevance.language_proficiency);
  const needsEntranceExam = relevance.entrance_exam === 'T1';
  const needsSAT = isActionable(relevance.sat_act);

  // Per-destination completion
  const completionByDestination = Object.fromEntries(
    destinationKeys.map(dest => [destinationLabel(dest), estimateCompletion(dest, profile)])
  );

  return {
    targetCountries,
    destinationKeys,
    indiaTrack,
    needsECs,
    needsEssays,
    needsRecs,
    needsLanguageTest,
    needsEntranceExam,
    needsSAT,
    relevance,
    completionByDestination,
  };
}
