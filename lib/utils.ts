import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard Shadcn UI cn() utility to cleanly merge Tailwind CSS classes
 * with conditional logic and precedence resolution.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
