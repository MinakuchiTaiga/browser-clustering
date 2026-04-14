import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, ReactElement } from "react";
import { cn } from "@/lib";

const buttonVariants = cva("btn", {
	variants: {
		variant: {
			default: "btn-primary",
			secondary: "btn-secondary",
			ghost: "btn-ghost",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
	VariantProps<typeof buttonVariants>;

/**
 * 共通ボタンコンポーネントを描画する。
 */
export function Button({ className, variant, ...props }: ButtonProps): ReactElement {
	return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
