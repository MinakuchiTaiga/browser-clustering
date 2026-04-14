import type { InputHTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/**
 * 共通入力コンポーネントを描画する。
 */
export function Input({ className, ...props }: InputProps): ReactElement {
	return <input className={cn("input", className)} {...props} />;
}
