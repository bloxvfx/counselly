import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardVariant = "default" | "dark" | "coral";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: "bg-surface-card text-ink",
  dark:    "bg-surface-dark text-on-dark",
  coral:   "bg-primary text-on-primary",
};

export function Card({ variant = "default", className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-8",
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
