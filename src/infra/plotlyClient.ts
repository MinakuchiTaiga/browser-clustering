import Plotly from "plotly.js-dist-min";
import plotlyBundleText from "plotly.js-dist-min/plotly.min.js?raw";

export type PlotTrace = Record<string, unknown>;
export type PlotLayout = Record<string, unknown>;

/**
 * Plotlyでグラフを描画する。
 */
export async function renderPlot(
	element: HTMLDivElement,
	traces: PlotTrace[],
	layout: PlotLayout,
): Promise<void> {
	await Plotly.newPlot(element, traces as never, layout as never, {
		responsive: true,
		displaylogo: false,
	});
}

/**
 * Plotlyの画像エクスポート用データURLを返す。
 */
export async function exportPlotAsImageDataUrl(
	element: HTMLDivElement,
	format: "png" | "svg",
): Promise<string> {
	const dataUrl = await Plotly.toImage(element, {
		format,
		width: 1280,
		height: 800,
	});
	return dataUrl;
}

/**
 * オフライン表示用のHTML文字列を生成する。
 */
export function buildInteractiveHtmlContent(title: string): string {
	return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>body{margin:0;font-family:sans-serif}#plot{width:100vw;height:100vh}</style>
</head>
<body>
  <div id="plot"></div>
  <script src="./plotly.min.js"></script>
  <script src="./plot-data.js"></script>
</body>
</html>`;
}

/**
 * オフライン表示用の描画スクリプト文字列を生成する。
 */
export function buildInteractiveScriptContent(traces: PlotTrace[], layout: PlotLayout): string {
	return `const traces=${JSON.stringify(traces)};\nconst layout=${JSON.stringify(layout)};\nwindow.Plotly.newPlot('plot', traces, layout, {responsive:true,displaylogo:false});`;
}

/**
 * 同梱用Plotlyスクリプトを返す。
 */
export function getPlotlyBundleContent(): string {
	return plotlyBundleText;
}

/**
 * HTML用に文字列をエスケープする。
 */
export function escapeHtml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}
