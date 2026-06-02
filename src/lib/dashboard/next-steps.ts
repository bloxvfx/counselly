export type NextStepId =
  | "academics"
  | "activities"
  | "tests"
  | "honors"
  | "college_list"
  | "plan";

export type NextStepDefinition = {
  id: NextStepId;
  title: string;
  subtitle: string;
  description: string;
  href: string;
};

export type NextStepFlags = {
  hasAcademics: boolean;
  hasActivities: boolean;
  hasTests: boolean;
  hasHonors: boolean;
  hasCollegeList: boolean;
  hasPlan: boolean;
};

export const NEXT_STEPS: NextStepDefinition[] = [
  {
    id: "academics",
    title: "Add your academics",
    subtitle: "Scores of highschool",
    description: "Enter your high school marks and academic averages.",
    href: "/profile/academics",
  },
  {
    id: "activities",
    title: "Add extracurricular activities",
    subtitle: "List extracurricular activities",
    description: "Showcase your sports, clubs, volunteer work, or hobbies.",
    href: "/profile/activities",
  },
  {
    id: "tests",
    title: "Add your tests",
    subtitle: "List your scores & test dates",
    description: "Add SAT, ACT, AP, IELTS, JEE, or other exam records.",
    href: "/profile/testing",
  },
  {
    id: "honors",
    title: "Add honors & competitions",
    subtitle: "Add honors and awards",
    description: "Highlight your academic achievements and competitions.",
    href: "/profile/honors",
  },
  {
    id: "college_list",
    title: "Make your college list",
    subtitle: "Build it with AI or manually",
    description: "Find and shortlist matching universities for your applications.",
    href: "/dashboard/college-list",
  },
  {
    id: "plan",
    title: "Create your plan",
    subtitle: "Add activities/tasks/events",
    description: "Schedule your tasks, application deadlines, and milestones.",
    href: "/dashboard/plan",
  },
];

export function buildNextSteps(flags: NextStepFlags) {
  const statusById: Record<NextStepId, boolean> = {
    academics: flags.hasAcademics,
    activities: flags.hasActivities,
    tests: flags.hasTests,
    honors: flags.hasHonors,
    college_list: flags.hasCollegeList,
    plan: flags.hasPlan,
  };

  return NEXT_STEPS.map((step) => ({
    ...step,
    isDone: statusById[step.id],
  }));
}
