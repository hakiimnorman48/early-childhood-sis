import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreToColor(score: number): string {
  if (score <= 3) return "red";
  if (score <= 6) return "yellow";
  return "green";
}

export function scoreToLabel(score: number): string {
  if (score <= 3) return "Pengenalan";
  if (score <= 6) return "Cukup";
  return "Baik";
}

export function scoreToCode(score: number): string {
  if (score <= 3) return "P";
  if (score <= 6) return "C";
  return "B";
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}
