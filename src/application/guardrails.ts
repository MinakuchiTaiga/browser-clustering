export const DEFAULT_CELL_LIMIT = 500_000;

/**
 * セル数が推奨上限を超えているか判定する。
 */
export function isCellLimitExceeded(
	rowCount: number,
	featureCount: number,
	limit = DEFAULT_CELL_LIMIT,
): boolean {
	return rowCount * featureCount > limit;
}
