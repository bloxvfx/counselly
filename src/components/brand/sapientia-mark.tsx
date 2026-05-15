import Image from "next/image";
import { cn } from "@/lib/utils";

const MARK_WIDTH = 455;
const MARK_HEIGHT = 574;

type SapientiaMarkProps = {
  className?: string;
  /** Use when the word “Sapientia” or equivalent is visible beside the mark */
  decorative?: boolean;
  priority?: boolean;
};

export function SapientiaMark({
  className,
  decorative = false,
  priority = false,
}: SapientiaMarkProps) {
  return (
    <Image
      src="/Sapientia.svg"
      alt={decorative ? "" : "Sapientia"}
      width={MARK_WIDTH}
      height={MARK_HEIGHT}
      className={cn("w-auto shrink-0 object-contain object-left", className)}
      priority={priority}
    />
  );
}
