import { describe, expect, it } from "vitest";
import {
	runClusteringFromText,
	runClusteringFromTextWithProgress,
} from "@/application/runClustering";
import { runKMeans } from "@/domain/kmeans";

describe("runClusteringFromText", () => {
	const source = [
		"id,f1,f2,f3",
		"a,1,1,1",
		"b,1.2,1.1,0.9",
		"c,0.9,1.0,1.2",
		"d,8,8,8",
		"e,8.1,7.9,8.2",
		"f,7.8,8.2,7.9",
	].join("\n");

	it("同じseedで同じクラスタ割当になる", () => {
		const config = {
			k: 2,
			seed: 42,
			useStandardize: true,
			usePcaBeforeClustering: false,
			vizDim: 2 as const,
		};

		const first = runClusteringFromText(source, config);
		const second = runClusteringFromText(source, config);

		expect(first.clusters).toEqual(second.clusters);
	});

	it("可視化次元が3Dのとき座標長が3になる", () => {
		const result = runClusteringFromText(source, {
			k: 2,
			seed: 42,
			useStandardize: true,
			usePcaBeforeClustering: false,
			vizDim: 3,
		});

		expect(result.visualizedCoordinates[0]).toHaveLength(3);
	});

	it("特徴量が2次元でも3D可視化座標を0埋めで生成できる", () => {
		const twoDimSource = ["id,f1,f2", "a,1,1", "b,1.2,1.1", "c,8,8", "d,8.2,8.1"].join("\n");
		const result = runClusteringFromText(twoDimSource, {
			k: 2,
			seed: 42,
			useStandardize: true,
			usePcaBeforeClustering: false,
			vizDim: 3,
		});

		expect(result.visualizedCoordinates[0]).toHaveLength(3);
		expect(result.visualizedCoordinates.every((row) => row[2] === 0)).toBe(true);
	});

	it("進捗付き実行が100%で完了する", async () => {
		const progresses: number[] = [];
		await runClusteringFromTextWithProgress(
			source,
			{
				k: 2,
				seed: 42,
				useStandardize: true,
				usePcaBeforeClustering: false,
				vizDim: 2,
			},
			(state) => {
				progresses.push(state.progress);
			},
		);

		expect(progresses.length).toBeGreaterThan(0);
		expect(progresses.at(-1)).toBe(100);
	});
});

describe("runKMeans", () => {
	it("n_init複数実行は単回より慣性が悪化しない", () => {
		const matrix = [
			[0, 0],
			[0.1, 0.2],
			[0.2, -0.1],
			[9, 9],
			[9.2, 9.1],
			[8.8, 9.2],
			[5, 5],
			[5.2, 4.8],
			[4.8, 5.1],
		];

		const single = runKMeans(matrix, { k: 3, seed: 7, nInit: 2 });
		const multi = runKMeans(matrix, { k: 3, seed: 7, nInit: 10 });

		expect(multi.inertia).toBeLessThanOrEqual(single.inertia);
	});
});
