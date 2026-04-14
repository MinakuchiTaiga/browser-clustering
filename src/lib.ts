import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * クラス名を結合し、Tailwindの競合を解消した文字列を返す。
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}
