import * as LabelPrimitive from "@radix-ui/react-label";
import type { ComponentPropsWithoutRef, ReactElement } from "react";
import { cn } from "@/lib";

export type LabelProps = ComponentPropsWithoutRef<typeof LabelPrimitive.Root>;

/**
 * 共通ラベルコンポーネントを描画する。
 */
export function Label({ className, ...props }: LabelProps): ReactElement {
	return <LabelPrimitive.Root className={cn("label", className)} {...props} />;
}
