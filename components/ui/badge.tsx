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
          "border-transparent bg-blue-50 text-blue-700 font-medium border border-blue-100",
        outline:
          "border border-blue-200 text-blue-800 bg-white",
        sky:
          "border-transparent bg-blue-50 text-blue-800 border border-blue-100",
        success:
          "bg-blue-50 text-blue-700 border border-blue-200",
        warning:
          "bg-blue-50 text-blue-800 border border-blue-200",
        roleAdmin:
          "bg-[#0c2461] text-white border border-blue-900 font-bold",
        roleTutor:
          "bg-blue-600 text-white border border-blue-500 font-bold",
        roleInstructor:
          "bg-blue-600 text-white border border-blue-500 font-bold",
        roleStudent:
          "bg-blue-100 text-blue-800 border border-blue-200 font-bold",
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
