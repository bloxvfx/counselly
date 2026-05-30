import type { ComponentKey, DestinationKey, Tier } from '@/types/profile-context';

// The single source of truth for what matters at each destination.
// Edit this file when adding a country or changing a tier — all dashboard logic reads from here.
export const RELEVANCE_MATRIX: Record<ComponentKey, Record<DestinationKey, Tier>> = {
  entrance_exam: {
    USA: 'NA', UK: 'NA', Canada: 'NA', Australia: 'T1', Singapore: 'NA',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'T1', India_NEET: 'T1', India_Holistic: 'NA',
  },
  grades: {
    USA: 'T1', UK: 'T1', Canada: 'T1', Australia: 'T1', Singapore: 'T1',
    Germany: 'T1', Netherlands: 'T1', India_JEE: 'T2', India_NEET: 'T2', India_Holistic: 'T1',
  },
  sat_act: {
    USA: 'T1', UK: 'NA', Canada: 'T2', Australia: 'NA', Singapore: 'T2',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'NA',
  },
  ielts_toefl: {
    USA: 'T2', UK: 'T1', Canada: 'T1', Australia: 'T1', Singapore: 'T1',
    Germany: 'T1', Netherlands: 'T1', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'NA',
  },
  extracurriculars: {
    USA: 'T1', UK: 'T3', Canada: 'T2', Australia: 'T3', Singapore: 'T2',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'T1',
  },
  essays: {
    USA: 'T1', UK: 'T1', Canada: 'T2', Australia: 'NA', Singapore: 'NA',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'T1',
  },
  recommendations: {
    USA: 'T1', UK: 'T3', Canada: 'T2', Australia: 'NA', Singapore: 'T2',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'T2',
  },
  admissions_tests: {
    USA: 'NA', UK: 'DEP', Canada: 'NA', Australia: 'NA', Singapore: 'NA',
    Germany: 'DEP', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'NA',
  },
  interviews: {
    USA: 'T2', UK: 'DEP', Canada: 'NA', Australia: 'NA', Singapore: 'DEP',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'T2',
  },
  language_proficiency: {
    USA: 'NA', UK: 'NA', Canada: 'NA', Australia: 'NA', Singapore: 'NA',
    Germany: 'T1', Netherlands: 'T1', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'NA',
  },
  honors_awards: {
    USA: 'T1', UK: 'T2', Canada: 'T2', Australia: 'NA', Singapore: 'T2',
    Germany: 'NA', Netherlands: 'NA', India_JEE: 'NA', India_NEET: 'NA', India_Holistic: 'T2',
  },
  predicted_grades: {
    USA: 'T2', UK: 'T1', Canada: 'T2', Australia: 'T2', Singapore: 'T2',
    Germany: 'T1', Netherlands: 'T1', India_JEE: 'T3', India_NEET: 'T3', India_Holistic: 'T2',
  },
};

const TIER_RANK: Record<Tier, number> = { T1: 4, T2: 3, T3: 2, DEP: 1, NA: 0 };

// Returns the highest-priority tier for a component across a set of destinations.
export function maxTier(component: ComponentKey, destinations: DestinationKey[]): Tier {
  if (destinations.length === 0) return 'NA';
  return destinations.reduce<Tier>((best, dest) => {
    const t = RELEVANCE_MATRIX[component][dest];
    return TIER_RANK[t] > TIER_RANK[best] ? t : best;
  }, 'NA');
}

export function isActionable(tier: Tier): boolean {
  return tier === 'T1' || tier === 'T2';
}
