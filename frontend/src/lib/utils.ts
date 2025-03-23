import { clsx, type ClassValue } from "clsx"; 
import { twMerge } from "tailwind-merge"; 

// Utility function to combine and optimize class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs)); // Merge and deduplicate Tailwind classes
}