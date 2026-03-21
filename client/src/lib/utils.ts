import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const bdtFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("en-BD", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const numberFormatter = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 0,
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrencyBDT(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "BDT 0";
  }
  return bdtFormatter.format(amount).replace(/\s+/g, " ").trim();
}

export const formatCurrency = formatCurrencyBDT;

export function formatCompactNumber(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }
  return compactFormatter.format(amount);
}

export function formatNumber(amount: number): string {
  if (!Number.isFinite(amount)) {
    return "0";
  }
  return numberFormatter.format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) {
    return "0%";
  }
  return `${value.toFixed(digits)}%`;
}

export function computeVariantPrice(basePrice: number, adjustment: number): number {
  return basePrice + adjustment;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.slice(0, maxLength)}...`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
