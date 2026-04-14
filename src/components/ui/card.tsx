import type { HTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib";

/**
 * カードコンテナを描画する。
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return <div className={cn("card", className)} {...props} />;
}

/**
 * カードのタイトルを描画する。
 */
export function CardTitle({
	className,
	...props
}: HTMLAttributes<HTMLHeadingElement>): ReactElement {
	return <h2 className={cn("card-title", className)} {...props} />;
}

/**
 * カードの本文領域を描画する。
 */
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>): ReactElement {
	return <div className={cn("card-content", className)} {...props} />;
}
