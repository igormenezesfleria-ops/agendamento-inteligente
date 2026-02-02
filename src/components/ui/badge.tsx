import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status variants
        pending: "border-warning/30 bg-warning/10 text-warning",
        confirmed: "border-success/30 bg-success/10 text-success",
        delegated: "border-accent/30 bg-accent/10 text-accent",
        completed: "border-primary/30 bg-primary/10 text-primary",
        cancelled: "border-destructive/30 bg-destructive/10 text-destructive",
        rejected: "border-destructive/30 bg-destructive/10 text-destructive",
        // Slot availability variants
        available: "border-success/30 bg-success/10 text-success",
        limited: "border-warning/30 bg-warning/10 text-warning",
        full: "border-destructive/30 bg-destructive/10 text-destructive",
        // Role variants
        student: "border-primary/30 bg-primary/10 text-primary",
        admin: "border-accent/30 bg-accent/10 text-accent",
        collaborator: "border-success/30 bg-success/10 text-success",
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
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
