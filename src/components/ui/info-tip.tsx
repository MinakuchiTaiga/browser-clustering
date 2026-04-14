import type { ReactElement } from "react";

export type InfoTipProps = {
	text: string;
};

/**
 * 項目説明を表示する簡易ツールチップを描画する。
 */
export function InfoTip({ text }: InfoTipProps): ReactElement {
	return (
		<span className="info-tip-wrap">
			<button type="button" className="info-tip" data-tip={text} aria-label={text}>
				?
			</button>
		</span>
	);
}
