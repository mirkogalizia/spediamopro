// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Unisce classi Tailwind evitando duplicati e conflitti */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}