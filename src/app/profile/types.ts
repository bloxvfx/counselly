import type { PersonalDetails } from "@/lib/personal-details";

export type ProfileData = {
  full_name: string | null;
  personal_details: PersonalDetails | Record<string, unknown> | null;
  grade: string | null;
  board: string | null;
  target_countries: string[] | null;
  intended_major: string | null;
  india_track: string | null;
  academic_score: string | null;
  score_type: string | null;
  subject_scores: Record<string, unknown> | null;
  predicted_grades: Record<string, string> | null;
  tests_taken: string[] | null;
  application_cycle: string | null;
  financial_aid_importance: string | null;
  help_needed: string[] | null;
};

export type TestScoreRow = {
  id: string;
  test_name: string;
  status: string;
  total_score: string | null;
  test_date: string | null;
  planned_date: string | null;
  attempt_number: number;
};

export type ActivityRow = {
  id: string;
  activity_type: string;
  name: string;
  organization: string | null;
  position: string | null;
  description: string | null;
  is_leadership: boolean;
  hours_per_week: number | null;
  weeks_per_year: number | null;
  grade_9: boolean;
  grade_10: boolean;
  grade_11: boolean;
  grade_12: boolean;
  continued_in_college: boolean;
  status: string;
  sort_order: number;
};

export type HonorRow = {
  id: string;
  title: string;
  field: string | null;
  issuing_org: string | null;
  level: string | null;
  recognition_level: string | null;
  year: string | null;
  grade: string | null;
  status: string | null;
  award: string | null;
  description: string | null;
  sort_order: number;
};
