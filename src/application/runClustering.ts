import { computeCandidates, computeCandidatesAsync } from "@/domain/candidates";
import { runKMeans } from "@/domain/kmeans";
import { parseDelimitedText } from "@/domain/parser";
import { projectWithPca } from "@/domain/pca";
import { zScoreStandardize } from "@/domain/standardize";
import type { RunConfig, RunResult } from "@/domain/types";

export type RunProgress = {
	progress: number;
	message: string;
};

/**
 * 入力テキストを解析してクラスタリング実行結果を返す。
 */
export function runClusteringFromText(content: string, config: RunConfig): RunResult {
	const parseResult = parseDelimitedText(content);
	if (parseResult.rows.length === 0) {
		throw new Error("有効な入力行がありません。");
	}

	const sourceMatrix = parseResult.rows.map((row) => row.input.features);
	const prepared = config.useStandardize ? zScoreStandardize(sourceMatrix) : sourceMatrix;

	const matrixForClustering =
		config.usePcaBeforeClustering && config.pcaTargetDim
			? projectWithPca(prepared, config.pcaTargetDim)
			: prepared;

	if (config.k < 2 || config.k > matrixForClustering.length) {
		throw new Error("kは2以上かつデータ件数以下で指定してください。");
	}

	const clustering = runKMeans(matrixForClustering, {
		k: config.k,
		seed: config.seed,
		nInit: 10,
	});

	const vizCoordinates = buildVisualizationCoordinates(matrixForClustering, config.vizDim);

	const clusterLabels: Record<number, string> = {};
	for (let clusterId = 0; clusterId < config.k; clusterId += 1) {
		clusterLabels[clusterId] = `クラスタ ${clusterId}`;
	}

	const candidates = computeCandidates(matrixForClustering, {
		seed: config.seed,
		minK: 2,
		maxK: Math.min(8, matrixForClustering.length - 1),
	});

	return {
		parseResult,
		clusters: clustering.clusters,
		clusterLabels,
		visualizedCoordinates: vizCoordinates,
		candidates,
	};
}

/**
 * 進捗通知を行いながらクラスタリングを実行する。
 */
export async function runClusteringFromTextWithProgress(
	content: string,
	config: RunConfig,
	onProgress: (state: RunProgress) => void,
): Promise<RunResult> {
	emitProgress(onProgress, 5, "入力データを解析しています");
	const parseResult = parseDelimitedText(content);
	await yieldToMainThread();
	if (parseResult.rows.length === 0) {
		throw new Error("有効な入力行がありません。");
	}

	emitProgress(onProgress, 20, "前処理を準備しています");
	const sourceMatrix = parseResult.rows.map((row) => row.input.features);
	const prepared = config.useStandardize ? zScoreStandardize(sourceMatrix) : sourceMatrix;
	await yieldToMainThread();

	emitProgress(onProgress, 35, "クラスタリング用の特徴量を作成しています");
	const matrixForClustering =
		config.usePcaBeforeClustering && config.pcaTargetDim
			? projectWithPca(prepared, config.pcaTargetDim)
			: prepared;

	if (config.k < 2 || config.k > matrixForClustering.length) {
		throw new Error("kは2以上かつデータ件数以下で指定してください。");
	}
	await yieldToMainThread();

	emitProgress(onProgress, 55, "k-meansを実行しています");
	const clustering = runKMeans(matrixForClustering, {
		k: config.k,
		seed: config.seed,
		nInit: 10,
	});
	await yieldToMainThread();

	emitProgress(onProgress, 72, "可視化座標を計算しています");
	const vizCoordinates = buildVisualizationCoordinates(matrixForClustering, config.vizDim);
	await yieldToMainThread();

	const clusterLabels: Record<number, string> = {};
	for (let clusterId = 0; clusterId < config.k; clusterId += 1) {
		clusterLabels[clusterId] = `クラスタ ${clusterId}`;
	}

	emitProgress(onProgress, 80, "k候補を評価しています");
	const candidates = await computeCandidatesAsync(
		matrixForClustering,
		{
			seed: config.seed,
			minK: 2,
			maxK: Math.min(8, matrixForClustering.length - 1),
		},
		(candidateProgress) => {
			const ratio =
				candidateProgress.total > 0 ? candidateProgress.completed / candidateProgress.total : 1;
			emitProgress(
				onProgress,
				Math.round(80 + ratio * 18),
				`k候補を評価しています (k=${candidateProgress.currentK})`,
			);
		},
	);

	emitProgress(onProgress, 100, "完了");
	return {
		parseResult,
		clusters: clustering.clusters,
		clusterLabels,
		visualizedCoordinates: vizCoordinates,
		candidates,
	};
}

/**
 * 進捗値を正規化して通知する。
 */
function emitProgress(
	onProgress: (state: RunProgress) => void,
	progress: number,
	message: string,
): void {
	const normalized = Math.max(0, Math.min(100, progress));
	onProgress({
		progress: normalized,
		message,
	});
}

/**
 * メインスレッドへ制御を返して再描画を促す。
 */
async function yieldToMainThread(): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * 可視化次元に合わせて座標行列を生成し、必要に応じて0埋めする。
 */
function buildVisualizationCoordinates(matrix: number[][], vizDim: 2 | 3): number[][] {
	if (matrix.length === 0) {
		return [];
	}

	const sourceDim = matrix[0]?.length ?? 0;
	const projectionDim = Math.max(1, Math.min(vizDim, sourceDim));
	const base =
		sourceDim === projectionDim
			? matrix.map((row) => row.slice(0, projectionDim))
			: projectWithPca(matrix, projectionDim);

	if (projectionDim === vizDim) {
		return base;
	}

	return base.map((row) => {
		const padded = row.slice();
		while (padded.length < vizDim) {
			padded.push(0);
		}
		return padded;
	});
}
