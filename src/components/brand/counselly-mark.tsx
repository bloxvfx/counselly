import Image from "next/image";
import { cn } from "@/lib/utils";

const MARK_WIDTH = 290;
const MARK_HEIGHT = 305;
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
