import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-blue-600 text-white shadow-sm shadow-blue-500/20",
        secondary:
          "border-transparent bg-blue-50 text-blue-700 font-medium",
        outline:
          "border border-blue-200 text-blue-800 bg-white/80",
        sky:
          "border-transparent bg-sky-100 text-sky-800",
        success:
          "border-transparent bg-emerald-50 text-emerald-700 border border-emerald-200/50",
        warning:
          "border-transparent bg-amber-50 text-amber-700 border border-amber-200/50",
        roleAdmin:
          "bg-indigo-100 text-indigo-800 border border-indigo-200/60 font-medium",
        roleInstructor:
          "bg-blue-100 text-blue-800 border border-blue-200/60 font-medium",
        roleStudent:
          "bg-emerald-100 text-emerald-800 border border-emerald-200/60 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
