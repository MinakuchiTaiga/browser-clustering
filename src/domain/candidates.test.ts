import { describe, expect, it } from "vitest";
import {
	calculateAverageSilhouette,
	computeCandidates,
	recommendByElbow,
	recommendBySilhouette,
} from "@/domain/candidates";

describe("candidates", () => {
	it("singletonクラスタの点はSilhouetteを0として扱う", () => {
		const matrix = [
			[0, 0],
			[0.1, 0],
			[5, 5],
			[10, 10],
		];
		const clusters = [0, 0, 1, 2];

		const score = calculateAverageSilhouette(matrix, clusters);
		expect(score).toBeLessThan(0.6);
	});

	it("評価可能なkが存在しないとき候補は空配列になる", () => {
		const matrix = [
			[1, 2],
			[3, 4],
		];

		const result = computeCandidates(matrix, {
			seed: 42,
			minK: 2,
			maxK: 8,
		});

		expect(result.elbow).toEqual([]);
		expect(result.silhouette).toEqual([]);
		expect(result.recommendedByElbow).toBeNull();
		expect(result.recommendedBySilhouette).toBeNull();
	});

	it("候補配列が空のとき推奨kはnullを返す", () => {
		expect(recommendByElbow([])).toBeNull();
		expect(recommendBySilhouette([])).toBeNull();
	});
});
