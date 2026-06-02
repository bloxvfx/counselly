import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ProfileSectionContent } from "../profile-section-content";
import { ProfileFormSkeleton } from "@/components/loading/page-skeletons";
import { isProfileSectionSlug, type ProfileSectionSlug } from "../sections";

type Props = {
  params: Promise<{ section: string }>;
};

export default async function ProfileSectionPage({ params }: Props) {
  const { section } = await params;
  if (!isProfileSectionSlug(section)) notFound();

  return (
    <div className="min-h-full bg-canvas">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 lg:px-6 lg:py-12">
        <div className="mb-6 sm:mb-8">
          <h1 className="type-display-md text-ink">Your profile</h1>
          <p className="type-body-sm text-muted mt-2">
            The more complete your profile, the better Counselly can tailor your
            college list, essays, and strategy.
          </p>
        </div>
        <Suspense fallback={<ProfileFormSkeleton />}>
          <ProfileSectionContent section={section as ProfileSectionSlug} />
        </Suspense>
      </div>
    </div>
  );
}
