import { type ChangeEvent, type ReactElement, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_CELL_LIMIT, isCellLimitExceeded } from "@/application/guardrails";
import { runClusteringFromTextWithProgress } from "@/application/runClustering";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { parseDelimitedText } from "@/domain/parser";
import type { RunConfig, RunResult } from "@/domain/types";
import { buildOutputRecords, dataUrlToBlob, downloadBlob, toCsv } from "@/infra/exporters";
import type { PlotLayout, PlotTrace } from "@/infra/plotlyClient";
import {
	buildInteractiveHtmlContent,
	buildInteractiveScriptContent,
	exportPlotAsImageDataUrl,
	getPlotlyBundleContent,
	renderPlot,
} from "@/infra/plotlyClient";

const INITIAL_CONFIG: RunConfig = {
	k: 3,
	seed: 42,
	useStandardize: true,
	usePcaBeforeClustering: false,
	pcaTargetDim: 2,
	vizDim: 2,
};

/**
 * アプリケーション本体を描画する。
 */
export function App(): ReactElement {
	const [rawText, setRawText] = useState<string>("");
	const [fileName, setFileName] = useState<string>("");
	const [config, setConfig] = useState<RunConfig>(INITIAL_CONFIG);
	const [result, setResult] = useState<RunResult | null>(null);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [isRunning, setIsRunning] = useState<boolean>(false);
	const [progress, setProgress] = useState<number>(0);
	const [progressMessage, setProgressMessage] = useState<string>("");
	const [isInputGuideOpen, setIsInputGuideOpen] = useState<boolean>(false);

	const plotRef = useRef<HTMLDivElement>(null);

	const plotModel = useMemo(() => {
		if (!result) {
			return null;
		}
		return buildPlotModel(result, config.vizDim);
	}, [result, config.vizDim]);

	useEffect(() => {
		if (!plotModel || !plotRef.current) {
			return;
		}
		void renderPlot(plotRef.current, plotModel.traces, plotModel.layout);
	}, [plotModel]);

	/**
	 * ファイル入力を読み込んでテキスト化する。
	 */
	async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
		const file = event.target.files?.[0];
		if (!file) {
			return;
		}
		const content = await readFileContent(file);
		setRawText(content);
		setFileName(file.name);
		setResult(null);
		setErrorMessage("");
	}

	/**
	 * 設定にもとづいてクラスタリング処理を実行する。
	 */
	async function handleRun(): Promise<void> {
		try {
			setIsRunning(true);
			setProgress(0);
			setProgressMessage("開始しています");
			const parsed = parseDelimitedText(rawText);
			const rowCount = parsed.rows.length;
			const featureCount = parsed.rows[0]?.input.features.length ?? 0;
			if (isCellLimitExceeded(rowCount, featureCount, DEFAULT_CELL_LIMIT)) {
				const ok = window.confirm(
					`推奨上限(${DEFAULT_CELL_LIMIT.toLocaleString()}セル)を超えています。処理を続行しますか？`,
				);
				if (!ok) {
					setIsRunning(false);
					setProgress(0);
					setProgressMessage("");
					return;
				}
			}
			const preview = await runClusteringFromTextWithProgress(rawText, config, (state) => {
				setProgress(state.progress);
				setProgressMessage(state.message);
			});
			setResult(preview);
			setErrorMessage("");
		} catch (error) {
			const message = error instanceof Error ? error.message : "実行中にエラーが発生しました。";
			setErrorMessage(message);
			setResult(null);
		} finally {
			setIsRunning(false);
		}
	}

	/**
	 * cluster_idに紐づく表示名を更新する。
	 */
	function updateClusterLabel(clusterId: number, value: string): void {
		if (!result) {
			return;
		}
		setResult({
			...result,
			clusterLabels: {
				...result.clusterLabels,
				[clusterId]: value,
			},
		});
	}

	/**
	 * Plotlyグラフを画像としてエクスポートする。
	 */
	async function exportImage(format: "png" | "svg"): Promise<void> {
		if (!plotRef.current) {
			return;
		}
		const dataUrl = await exportPlotAsImageDataUrl(plotRef.current, format);
		const blob = dataUrlToBlob(dataUrl);
		downloadBlob(blob, `clustering-result.${format}`);
	}

	/**
	 * インタラクティブHTML用のファイル群を出力する。
	 */
	function exportInteractiveBundle(): void {
		if (!plotModel) {
			return;
		}
		const html = buildInteractiveHtmlContent("browser-clustering result");
		const dataScript = buildInteractiveScriptContent(plotModel.traces, plotModel.layout);
		const plotlyBundle = getPlotlyBundleContent();

		downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), "clustering-result.html");
		downloadBlob(
			new Blob([dataScript], { type: "application/javascript;charset=utf-8" }),
			"plot-data.js",
		);
		downloadBlob(
			new Blob([plotlyBundle], { type: "application/javascript;charset=utf-8" }),
			"plotly.min.js",
		);
	}

	/**
	 * クラスタ結果をCSVとして出力する。
	 */
	function exportCsvFile(): void {
		if (!result) {
			return;
		}
		const records = buildOutputRecords(
			result.parseResult.rows,
			result.clusters,
			result.clusterLabels,
		);
		const csv = toCsv(records);
		downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "clustering-result.csv");
	}

	return (
		<main>
			<h1>browser-clustering</h1>
			<p>CSV/TSVをブラウザ内で解析してクラスタリングするオフラインアプリです。</p>

			<div className="grid grid-cols-2">
				<Card>
					<CardContent>
						<CardTitle>入力と設定</CardTitle>
						<div className="form-row">
							<div className="label-row">
								<Label htmlFor="dataset">CSV/TSVファイル</Label>
								<InfoTip text="CSVまたはTSVを選択します。先頭列はID/名称、2列目以降は数値を入力してください。" />
							</div>
							<Input
								id="dataset"
								type="file"
								accept=".csv,.tsv,text/csv,text/tab-separated-values"
								onChange={handleFileChange}
							/>
							<div className="inline">
								<Button type="button" variant="ghost" onClick={() => setIsInputGuideOpen(true)}>
									入力形式ガイドを見る
								</Button>
							</div>
							{fileName && <small>読み込み: {fileName}</small>}
						</div>

						<div className="form-row">
							<div className="label-row">
								<Label htmlFor="k">クラスタ数 k</Label>
								<InfoTip text="分けたいクラスタ数を指定します。一般に2以上で、データ件数以下の整数を入力します。" />
							</div>
							<Input
								id="k"
								type="number"
								min={2}
								value={config.k}
								onChange={(event) => setConfig({ ...config, k: Number(event.target.value) })}
							/>
						</div>

						<div className="form-row">
							<div className="label-row">
								<Label htmlFor="seed">乱数seed</Label>
								<InfoTip text="初期値生成に使う乱数の種です。同じseedなら同じ条件で結果を再現しやすくなります。" />
							</div>
							<Input
								id="seed"
								type="number"
								value={config.seed}
								onChange={(event) => setConfig({ ...config, seed: Number(event.target.value) })}
							/>
						</div>

						<div className="inline">
							<Input
								id="useStandardize"
								type="checkbox"
								checked={config.useStandardize}
								onChange={(event) =>
									setConfig({
										...config,
										useStandardize: event.target.checked,
									})
								}
							/>
							<Label htmlFor="useStandardize">z-score標準化</Label>
							<InfoTip text="各特徴量のスケール差を均す前処理です。通常はON推奨です。" />
						</div>

						<div className="inline">
							<Input
								id="usePcaBefore"
								type="checkbox"
								checked={config.usePcaBeforeClustering}
								onChange={(event) =>
									setConfig({
										...config,
										usePcaBeforeClustering: event.target.checked,
									})
								}
							/>
							<Label htmlFor="usePcaBefore">クラスタリング前PCA</Label>
							<InfoTip text="クラスタリング前に次元圧縮します。特徴量が多い場合の高速化やノイズ低減に有効です。" />
						</div>

						{config.usePcaBeforeClustering && (
							<div className="form-row">
								<div className="label-row">
									<Label htmlFor="pcaTargetDim">前処理PCA次元</Label>
									<InfoTip text="PCA後に残す次元数です。1以上、元の特徴量数以下を指定してください。" />
								</div>
								<Input
									id="pcaTargetDim"
									type="number"
									min={1}
									value={config.pcaTargetDim ?? 2}
									onChange={(event) =>
										setConfig({
											...config,
											pcaTargetDim: Number(event.target.value),
										})
									}
								/>
							</div>
						)}

						<div className="form-row">
							<div className="label-row">
								<Label htmlFor="vizDim">可視化次元</Label>
								<InfoTip text="グラフ表示を2Dまたは3Dで切り替えます。3Dは視覚的だが重くなりやすいです。" />
							</div>
							<Select
								id="vizDim"
								value={String(config.vizDim)}
								onChange={(event) =>
									setConfig({ ...config, vizDim: Number(event.target.value) as 2 | 3 })
								}
							>
								<option value="2">2D</option>
								<option value="3">3D</option>
							</Select>
						</div>

						<Button onClick={() => void handleRun()} disabled={!rawText || isRunning}>
							実行
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardContent>
						<CardTitle>実行ステータス</CardTitle>
						{!result && !errorMessage && (
							<Alert>ファイルを読み込み、設定して実行してください。</Alert>
						)}
						{isRunning && (
							<Alert tone="warning">
								<div className="progress-stack">
									<div className="progress-header">
										<div className="spinner" aria-hidden="true" />
										<strong>処理中... {progress}%</strong>
									</div>
									<small>{progressMessage}</small>
									<div className="progress-track">
										<div className="progress-fill" style={{ width: `${progress}%` }} />
									</div>
								</div>
							</Alert>
						)}
						{errorMessage && <Alert tone="error">{errorMessage}</Alert>}
						{result && (
							<>
								<Alert tone={result.parseResult.excludedRows.length > 0 ? "warning" : "default"}>
									有効行: {result.parseResult.rows.length} / 除外行:{" "}
									{result.parseResult.excludedRows.length}
								</Alert>
								{result.parseResult.excludedRows.length > 0 && (
									<small>
										除外行番号:{" "}
										{result.parseResult.excludedRows.map((row) => row.lineNumber).join(", ")}
									</small>
								)}
								<small>
									候補k（Elbow/Silhouette）: {result.candidates.recommendedByElbow} /{" "}
									{result.candidates.recommendedBySilhouette}
								</small>
							</>
						)}
					</CardContent>
				</Card>
			</div>

			<section className="card" style={{ marginTop: 16 }}>
				<div className="card-content">
					<CardTitle>可視化</CardTitle>
					<div ref={plotRef} className="plot-wrap" />
					<div className="inline">
						<Button
							variant="secondary"
							onClick={() => void exportImage("png")}
							disabled={!result || isRunning}
						>
							PNG出力
						</Button>
						<Button
							variant="secondary"
							onClick={() => void exportImage("svg")}
							disabled={!result || isRunning}
						>
							SVG出力
						</Button>
						<Button
							variant="secondary"
							onClick={exportInteractiveBundle}
							disabled={!result || isRunning}
						>
							HTML+JS出力
						</Button>
						<Button variant="secondary" onClick={exportCsvFile} disabled={!result || isRunning}>
							CSV出力
						</Button>
					</div>
				</div>
			</section>

			{result && (
				<section className="card" style={{ marginTop: 16 }}>
					<div className="card-content">
						<CardTitle>クラスタ名編集</CardTitle>
						<table>
							<thead>
								<tr>
									<th>cluster_id</th>
									<th>cluster_label</th>
								</tr>
							</thead>
							<tbody>
								{Object.entries(result.clusterLabels).map(([clusterId, clusterLabel]) => (
									<tr key={clusterId}>
										<td>{clusterId}</td>
										<td>
											<Input
												aria-label={`cluster-label-${clusterId}`}
												value={clusterLabel}
												onChange={(event) =>
													updateClusterLabel(Number(clusterId), event.target.value)
												}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>
			)}

			{isInputGuideOpen && (
				<div className="modal-overlay" role="dialog" aria-modal="true" aria-label="入力形式ガイド">
					<div className="modal-card">
						<h2>CSV / TSV 入力形式ガイド</h2>
						<ul>
							<li>1列目: ID/名称（文字列）</li>
							<li>2列目以降: 数値特徴量</li>
							<li>欠損や非数値を含む行は除外されます</li>
							<li>区切り文字は `,` と `タブ` を自動判定します</li>
						</ul>
						<p>CSV例</p>
						<pre className="guide-code">
							id,feature_a,feature_b{"\n"}A001,12.3,4.5{"\n"}A002,8.1,3.9
						</pre>
						<p>TSV例</p>
						<pre className="guide-code">
							id{"\t"}feature_a{"\t"}feature_b{"\n"}A001{"\t"}12.3{"\t"}4.5{"\n"}A002{"\t"}8.1
							{"\t"}3.9
						</pre>
						<div className="inline">
							<Button type="button" variant="secondary" onClick={() => setIsInputGuideOpen(false)}>
								閉じる
							</Button>
						</div>
					</div>
				</div>
			)}
		</main>
	);
}

/**
 * 実行結果からPlotly描画モデルを生成する。
 */
export function buildPlotModel(
	result: RunResult,
	vizDim: 2 | 3,
): { traces: PlotTrace[]; layout: PlotLayout } {
	const grouped = new Map<number, Array<{ sourceIndex: number; label: string; coord: number[] }>>();

	for (let index = 0; index < result.clusters.length; index += 1) {
		const clusterId = result.clusters[index];
		const current = grouped.get(clusterId) ?? [];
		current.push({
			sourceIndex: index,
			label: result.parseResult.rows[index].input.label,
			coord: result.visualizedCoordinates[index],
		});
		grouped.set(clusterId, current);
	}

	const traces: PlotTrace[] = [];
	grouped.forEach((members, clusterId) => {
		const x = members.map((member) => member.coord[0]);
		const y = members.map((member) => member.coord[1]);
		const text = members.map((member) => {
			const z = member.coord[2] ?? 0;
			const label = result.clusterLabels[clusterId] ?? `クラスタ ${clusterId}`;
			const original = result.parseResult.rows[member.sourceIndex]?.original;
			const preview = original ? buildOriginalValuePreview(original, 5) : "元データ: 取得不可";
			return `ID: ${member.label}<br>cluster名: ${label}<br>座標: (${member.coord[0].toFixed(3)}, ${member.coord[1].toFixed(3)}, ${z.toFixed(3)})<br>${preview}`;
		});

		if (vizDim === 3) {
			traces.push({
				type: "scatter3d",
				mode: "markers",
				name: result.clusterLabels[clusterId] ?? `クラスタ ${clusterId}`,
				x,
				y,
				z: members.map((member) => member.coord[2] ?? 0),
				text,
				hovertemplate: "%{text}<extra></extra>",
			});
			return;
		}

		traces.push({
			type: "scatter",
			mode: "markers",
			name: result.clusterLabels[clusterId] ?? `クラスタ ${clusterId}`,
			x,
			y,
			text,
			hovertemplate: "%{text}<extra></extra>",
		});
	});

	const layout: PlotLayout = {
		title: "クラスタリング可視化",
		margin: { l: 30, r: 20, t: 40, b: 30 },
	};

	if (vizDim === 3) {
		layout.scene = {
			xaxis: { title: "PC1" },
			yaxis: { title: "PC2" },
			zaxis: { title: "PC3" },
		};
	} else {
		layout.xaxis = { title: "PC1" };
		layout.yaxis = { title: "PC2" };
	}

	return { traces, layout };
}

/**
 * 元データの値を指定件数までプレビュー文字列として整形する。
 */
export function buildOriginalValuePreview(
	original: Record<string, string | number>,
	limit: number,
): string {
	const entries = Object.entries(original);
	const head = entries.slice(0, limit).map(([key, value]) => `${key}: ${value}`);
	const suffix = entries.length > limit ? ", ..." : "";
	return `元データ: ${head.join(", ")}${suffix}`;
}

/**
 * ファイルオブジェクトからテキストを取得する。
 */
export async function readFileContent(file: File): Promise<string> {
	if (typeof file.text === "function") {
		return file.text();
	}

	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			resolve(typeof reader.result === "string" ? reader.result : "");
		};
		reader.onerror = () => {
			reject(new Error("ファイルの読み込みに失敗しました。"));
		};
		reader.readAsText(file);
	});
}
