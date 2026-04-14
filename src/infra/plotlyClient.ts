export type PlotTrace = Record<string, unknown>;
export type PlotLayout = Record<string, unknown>;
type PlotlyClient = {
	newPlot: (
		element: HTMLDivElement,
		traces: never,
		layout: never,
		config: { responsive: boolean; displaylogo: boolean },
	) => Promise<void>;
	toImage: (
		element: HTMLDivElement,
		options: { format: "png" | "svg"; width: number; height: number },
	) => Promise<string>;
};

let plotlyClientPromise: Promise<PlotlyClient> | null = null;
let plotlyBundlePromise: Promise<string> | null = null;

/**
 * Plotlyでグラフを描画する。
 */
export async function renderPlot(
	element: HTMLDivElement,
	traces: PlotTrace[],
	layout: PlotLayout,
): Promise<void> {
	const plotly = await loadPlotlyClient();
	await plotly.newPlot(element, traces as never, layout as never, {
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
	const plotly = await loadPlotlyClient();
	const dataUrl = await plotly.toImage(element, {
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
export async function getPlotlyBundleContent(): Promise<string> {
	if (!plotlyBundlePromise) {
		plotlyBundlePromise = import("plotly.js-dist-min/plotly.min.js?raw").then(
			(module) => module.default,
		);
	}
	return plotlyBundlePromise;
}

/**
 * Plotly本体を埋め込んだ単一HTML文字列を生成する。
 */
export async function buildSelfContainedHtmlContent(
	title: string,
	traces: PlotTrace[],
	layout: PlotLayout,
): Promise<string> {
	const plotlyBundleText = await getPlotlyBundleContent();
	const renderScript = buildInteractiveScriptContent(traces, layout);
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
  <script>${escapeScriptTag(plotlyBundleText)}</script>
  <script>${escapeScriptTag(renderScript)}</script>
</body>
</html>`;
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

/**
 * scriptタグ内に安全に埋め込むための最小エスケープを行う。
 */
function escapeScriptTag(value: string): string {
	return value.replaceAll("</script>", "<\\/script>");
}

/**
 * Plotlyクライアントを遅延読み込みで取得する。
 */
async function loadPlotlyClient(): Promise<PlotlyClient> {
	if (!plotlyClientPromise) {
		plotlyClientPromise = import("plotly.js-dist-min").then((module) => module.default as PlotlyClient);
	}
	return plotlyClientPromise;
}
