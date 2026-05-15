"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "secondary-dark" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-active",
  secondary:
    "bg-canvas text-ink border border-hairline hover:bg-surface-soft",
  "secondary-dark":
    "bg-surface-dark-elevated text-on-dark border border-surface-dark-elevated hover:bg-surface-dark",
  ghost:
    "text-ink hover:text-muted bg-transparent",
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-4 text-xs gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-sans font-medium rounded-md transition-colors cursor-pointer",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
