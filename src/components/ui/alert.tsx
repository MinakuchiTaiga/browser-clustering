import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
	tone?: "default" | "warning" | "error";
};

/**
 * 警告やエラー表示に利用するアラートを描画する。
 */
export function Alert({ className, tone = "default", ...props }: AlertProps): ReactElement {
	return <div className={cn("alert", `alert-${tone}`, className)} role="status" {...props} />;
}
