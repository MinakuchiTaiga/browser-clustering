import { runKMeans } from "@/domain/kmeans";
import { euclideanDistance } from "@/domain/math";
import type { CandidateScores } from "@/domain/types";

export type CandidateConfig = {
	minK?: number;
	maxK?: number;
	seed: number;
};

export type CandidateProgress = {
	completed: number;
	total: number;
	currentK: number;
};

/**
 * ElbowとSilhouetteの候補スコアを計算して返す。
 */
export function computeCandidates(matrix: number[][], config: CandidateConfig): CandidateScores {
	const maxK = Math.min(config.maxK ?? 8, Math.max(matrix.length - 1, 2));
	const minK = Math.max(config.minK ?? 2, 2);
	const elbow: CandidateScores["elbow"] = [];
	const silhouette: CandidateScores["silhouette"] = [];

	for (let k = minK; k <= maxK; k += 1) {
		const result = runKMeans(matrix, {
			k,
			seed: config.seed,
			nInit: 5,
		});
		elbow.push({ k, inertia: result.inertia });
		silhouette.push({ k, score: calculateAverageSilhouette(matrix, result.clusters) });
	}

	const recommendedByElbow = recommendByElbow(elbow);
	const recommendedBySilhouette = recommendBySilhouette(silhouette);

	return {
		elbow,
		silhouette,
		recommendedByElbow,
		recommendedBySilhouette,
	};
}

/**
 * ElbowとSilhouetteの候補スコアを非同期で計算して返す。
 */
export async function computeCandidatesAsync(
	matrix: number[][],
	config: CandidateConfig,
	onProgress?: (progress: CandidateProgress) => void,
): Promise<CandidateScores> {
	const maxK = Math.min(config.maxK ?? 8, Math.max(matrix.length - 1, 2));
	const minK = Math.max(config.minK ?? 2, 2);
	const elbow: CandidateScores["elbow"] = [];
	const silhouette: CandidateScores["silhouette"] = [];
	const total = maxK - minK + 1;

	for (let k = minK; k <= maxK; k += 1) {
		const result = runKMeans(matrix, {
			k,
			seed: config.seed,
			nInit: 5,
		});
		elbow.push({ k, inertia: result.inertia });
		silhouette.push({ k, score: calculateAverageSilhouette(matrix, result.clusters) });

		onProgress?.({
			completed: k - minK + 1,
			total,
			currentK: k,
		});
		await yieldToMainThread();
	}

	return {
		elbow,
		silhouette,
		recommendedByElbow: recommendByElbow(elbow),
		recommendedBySilhouette: recommendBySilhouette(silhouette),
	};
}

/**
 * Silhouette係数の平均値を計算する。
 */
export function calculateAverageSilhouette(matrix: number[][], clusters: number[]): number {
	if (matrix.length < 3) {
		return 0;
	}
	const byCluster = groupIndicesByCluster(clusters);
	const scores = matrix.map((row, index) => {
		const clusterId = clusters[index];
		const sameCluster = byCluster.get(clusterId) ?? [];

		let a = 0;
		if (sameCluster.length > 1) {
			let sum = 0;
			let count = 0;
			for (const otherIndex of sameCluster) {
				if (otherIndex === index) {
					continue;
				}
				sum += euclideanDistance(row, matrix[otherIndex]);
				count += 1;
			}
			a = count > 0 ? sum / count : 0;
		}

		let b = Number.POSITIVE_INFINITY;
		for (const [otherClusterId, memberIndices] of byCluster) {
			if (otherClusterId === clusterId || memberIndices.length === 0) {
				continue;
			}
			let sum = 0;
			for (const memberIndex of memberIndices) {
				sum += euclideanDistance(row, matrix[memberIndex]);
			}
			const avg = sum / memberIndices.length;
			if (avg < b) {
				b = avg;
			}
		}

		const divisor = Math.max(a, b);
		if (!Number.isFinite(divisor) || divisor === 0) {
			return 0;
		}
		return (b - a) / divisor;
	});

	return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * クラスタIDごとに行インデックスをまとめる。
 */
export function groupIndicesByCluster(clusters: number[]): Map<number, number[]> {
	const map = new Map<number, number[]>();
	clusters.forEach((clusterId, index) => {
		const current = map.get(clusterId) ?? [];
		current.push(index);
		map.set(clusterId, current);
	});
	return map;
}

/**
 * Elbow法の慣性曲線から推奨kを返す。
 */
export function recommendByElbow(points: Array<{ k: number; inertia: number }>): number {
	if (points.length <= 2) {
		return points[0]?.k ?? 2;
	}

	const first = points[0];
	const last = points[points.length - 1];
	const denom = Math.sqrt((last.k - first.k) ** 2 + (last.inertia - first.inertia) ** 2);
	if (denom === 0) {
		return points[0].k;
	}

	let maxDistance = -1;
	let bestK = points[0].k;

	for (const point of points.slice(1, -1)) {
		const distance =
			Math.abs(
				(last.inertia - first.inertia) * point.k -
					(last.k - first.k) * point.inertia +
					last.k * first.inertia -
					last.inertia * first.k,
			) / denom;
		if (distance > maxDistance) {
			maxDistance = distance;
			bestK = point.k;
		}
	}

	return bestK;
}

/**
 * Silhouetteスコア配列から推奨kを返す。
 */
export function recommendBySilhouette(points: Array<{ k: number; score: number }>): number {
	if (points.length === 0) {
		return 2;
	}
	return points.reduce((best, current) => (current.score > best.score ? current : best)).k;
}

/**
 * メインスレッドへ制御を返してUI再描画機会を作る。
 */
async function yieldToMainThread(): Promise<void> {
	await new Promise<void>((resolve) => {
		setTimeout(resolve, 0);
	});
}
