/**
 * 2点間のユークリッド距離を返す。
 */
export function euclideanDistance(a: number[], b: number[]): number {
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		const diff = a[i] - b[i];
		sum += diff * diff;
	}
	return Math.sqrt(sum);
}

/**
 * 2点間のユークリッド距離の二乗を返す。
 */
export function squaredEuclideanDistance(a: number[], b: number[]): number {
	let sum = 0;
	for (let i = 0; i < a.length; i += 1) {
		const diff = a[i] - b[i];
		sum += diff * diff;
	}
	return sum;
}
