import { kmeans } from "ml-kmeans";
import { squaredEuclideanDistance } from "@/domain/math";
import type { ClusteringResult } from "@/domain/types";

export type KMeansConfig = {
	k: number;
	seed: number;
	nInit?: number;
	maxIterations?: number;
};

/**
 * 複数初期値を使ってk-meansを実行し、慣性が最小の結果を返す。
 */
export function runKMeans(matrix: number[][], config: KMeansConfig): ClusteringResult {
	const nInit = Math.max(config.nInit ?? 10, 2);
	const maxIterations = config.maxIterations ?? 100;

	let best: ClusteringResult | null = null;
	for (let i = 0; i < nInit; i += 1) {
		const result = kmeans(matrix, config.k, {
			initialization: "kmeans++",
			maxIterations,
			seed: config.seed + i,
		});

		const inertia = calculateInertia(matrix, result.clusters, result.centroids);
		const candidate: ClusteringResult = {
			clusters: result.clusters,
			centroids: result.centroids,
			inertia,
		};

		if (!best || candidate.inertia < best.inertia) {
			best = candidate;
		}
	}

	if (!best) {
		throw new Error("k-meansの実行に失敗しました。");
	}

	return best;
}

/**
 * クラスタ割り当てに対する慣性（SSE）を計算する。
 */
export function calculateInertia(
	matrix: number[][],
	clusters: number[],
	centroids: number[][],
): number {
	let inertia = 0;
	for (let i = 0; i < matrix.length; i += 1) {
		const centroid = centroids[clusters[i]];
		inertia += squaredEuclideanDistance(matrix[i], centroid);
	}
	return inertia;
}
