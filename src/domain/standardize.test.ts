import { describe, expect, it } from "vitest";
import { zScoreStandardize } from "@/domain/standardize";

describe("zScoreStandardize", () => {
	it("列ごとの平均が0付近になる", () => {
		const matrix = [
			[1, 10],
			[2, 20],
			[3, 30],
		];
		const standardized = zScoreStandardize(matrix);

		const means = [0, 1].map(
			(col) => standardized.reduce((sum, row) => sum + row[col], 0) / standardized.length,
		);

		expect(Math.abs(means[0])).toBeLessThan(1e-9);
		expect(Math.abs(means[1])).toBeLessThan(1e-9);
	});

	it("分散0の列を0で返す", () => {
		const matrix = [
			[1, 5],
			[2, 5],
			[3, 5],
		];
		const standardized = zScoreStandardize(matrix);

		expect(standardized.every((row) => row[1] === 0)).toBe(true);
	});
});
