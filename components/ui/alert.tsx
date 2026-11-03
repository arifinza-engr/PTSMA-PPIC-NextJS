import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Alert({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="alert" className={cn("relative w-full rounded-lg border border-destructive/50 bg-background p-4 text-destructive [&>svg~*]:pl-7", className)} {...props} />;
}
