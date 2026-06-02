import Image from "next/image";
import { cn } from "@/lib/utils";

/** Gap between mark and wordmark in horizontal lockups */
export const counsellyLogoLockupClass = "gap-1.5";

const MARK_WIDTH = 277;
const MARK_HEIGHT = 232;
const MARK_ASPECT_RATIO = `${MARK_WIDTH} / ${MARK_HEIGHT}`;

type CounsellyMarkProps = {
  className?: string;
  /** Use when the word “Counselly” or equivalent is visible beside the mark */
  decorative?: boolean;
  priority?: boolean;
};

export function CounsellyMark({
  className,
  decorative = false,
  priority = false,
}: CounsellyMarkProps) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ aspectRatio: MARK_ASPECT_RATIO }}
    >
      <Image
        src="/counselly.svg"
        alt={decorative ? "" : "Counselly"}
        fill
        sizes="100vw"
        className="object-contain object-left"
        priority={priority}
      />
    </span>
  );
}

const TEXT_WIDTH = 590;
const TEXT_HEIGHT = 132;
const TEXT_ASPECT_RATIO = `${TEXT_WIDTH} / ${TEXT_HEIGHT}`;

type CounsellyTextProps = {
  className?: string;
  priority?: boolean;
};

export function CounsellyText({
  className,
  priority = false,
}: CounsellyTextProps) {
  return (
    <span
      className={cn("relative inline-block shrink-0", className)}
      style={{ aspectRatio: TEXT_ASPECT_RATIO }}
    >
      <Image
        src="/counselly-text.svg"
        alt="Counselly"
        fill
        sizes="100vw"
        className="object-contain object-left"
        priority={priority}
      />
    </span>
  );
}
