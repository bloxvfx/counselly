// Tier definitions for the component relevance matrix.
// T1 = required, T2 = important, T3 = optional, NA = not applicable, DEP = depends on college list
export type Tier = 'T1' | 'T2' | 'T3' | 'NA' | 'DEP';

export type ComponentKey =
  | 'entrance_exam'
  | 'grades'
  | 'sat_act'
  | 'ielts_toefl'
  | 'extracurriculars'
  | 'essays'
  | 'recommendations'
  | 'admissions_tests'
  | 'interviews'
  | 'language_proficiency'
  | 'honors_awards'
  | 'predicted_grades';

// Destination keys map to the matrix columns. India splits into three tracks.
export type DestinationKey =
  | 'USA'
  | 'UK'
  | 'Canada'
  | 'Australia'
  | 'Singapore'
  | 'Germany'
  | 'Netherlands'
  | 'India_JEE'
  | 'India_NEET'
  | 'India_Holistic';

export type IndiaTrack = 'jee' | 'neet' | 'holistic' | 'unsure';

export interface ProfileContext {
  targetCountries: string[];
  destinationKeys: DestinationKey[];
  indiaTrack: IndiaTrack | null;

  // Convenience booleans — true if the component is T1/T2 for at least one destination
  needsECs: boolean;
  needsEssays: boolean;
  needsRecs: boolean;
  needsLanguageTest: boolean;
  needsEntranceExam: boolean;
  needsSAT: boolean;

  // Per-component highest tier across all targeted destinations
  relevance: Record<ComponentKey, Tier>;

  // Estimated % complete for each targeted destination (0–100)
  completionByDestination: Record<string, number>;
}

// Minimal profile shape required to compute context.
// india_track is optional — it requires a DB migration before it's available.
export interface ProfileSnapshot {
  target_countries: string[] | null;
  intended_major: string | null;
  board: string | null;
  india_track?: string | null;
  academic_score: string | null;
  tests_taken: string[] | null;
  activities: string[] | null;
  help_needed: string[] | null;
}
