import { PCA } from "ml-pca";

/**
 * PCAで指定次元に射影した行列を返す。
 */
export function projectWithPca(matrix: number[][], targetDim: number): number[][] {
	if (matrix.length === 0) {
		return [];
	}
	if (targetDim < 1 || targetDim > matrix[0].length) {
		throw new Error("PCA次元数が不正です。");
	}

	const pca = new PCA(matrix, {
		center: true,
		scale: false,
	});
	const projected = pca.predict(matrix, {
		nComponents: targetDim,
	});
	return projected.to2DArray();
}
