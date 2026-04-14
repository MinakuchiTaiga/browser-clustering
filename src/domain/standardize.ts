/**
 * 列単位でz-score標準化を実行した行列を返す。
 */
export function zScoreStandardize(matrix: number[][]): number[][] {
	if (matrix.length === 0) {
		return [];
	}
	const colSize = matrix[0].length;
	const means = new Array<number>(colSize).fill(0);
	const stds = new Array<number>(colSize).fill(0);

	for (const row of matrix) {
		for (let i = 0; i < colSize; i += 1) {
			means[i] += row[i];
		}
	}

	for (let i = 0; i < colSize; i += 1) {
		means[i] /= matrix.length;
	}

	for (const row of matrix) {
		for (let i = 0; i < colSize; i += 1) {
			const diff = row[i] - means[i];
			stds[i] += diff * diff;
		}
	}

	for (let i = 0; i < colSize; i += 1) {
		stds[i] = Math.sqrt(stds[i] / matrix.length);
	}

	return matrix.map((row) =>
		row.map((value, i) => {
			if (stds[i] === 0) {
				return 0;
			}
			return (value - means[i]) / stds[i];
		}),
	);
}
