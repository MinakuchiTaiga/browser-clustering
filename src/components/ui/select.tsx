import type { ReactElement, SelectHTMLAttributes } from "react";
import { cn } from "@/lib";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * 共通セレクトボックスを描画する。
 */
export function Select({ className, ...props }: SelectProps): ReactElement {
	return <select className={cn("select", className)} {...props} />;
}
