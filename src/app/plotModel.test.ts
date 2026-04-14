import { describe, expect, it, vi } from "vitest";
import type { RunResult } from "@/domain/types";

vi.mock("@/infra/plotlyClient", async () => {
	return {
		buildInteractiveHtmlContent: vi.fn(() => "<html></html>"),
		buildInteractiveScriptContent: vi.fn(() => "console.log('plot')"),
		renderPlot: vi.fn(async () => {}),
		exportPlotAsImageDataUrl: vi.fn(async () => "data:image/png;base64,iVBORw0KGgo="),
		getPlotlyBundleContent: vi.fn(() => "console.log('plotly')"),
	};
});

import { buildOriginalValuePreview, buildPlotModel } from "@/app/App";

describe("buildOriginalValuePreview", () => {
	it("指定件数を超える場合は省略記号を付ける", () => {
		const preview = buildOriginalValuePreview(
			{
				id: "A001",
				hourly_wage: 1200,
				latitude: 35.68,
				longitude: 139.76,
				has_overtime: 1,
				monthly_hours: 180,
			},
			5,
		);

		expect(preview).toContain("id: A001");
		expect(preview).not.toContain("monthly_hours");
		expect(preview).toContain("...");
	});
});

describe("buildPlotModel", () => {
	it("hoverテキストに元データのプレビューを含める", () => {
		const runResult: RunResult = {
			parseResult: {
				delimiter: ",",
				headers: ["id", "hourly_wage", "latitude", "longitude", "has_overtime", "monthly_hours"],
				rows: [
					{
						lineNumber: 2,
						original: {
							id: "JOB00001",
							hourly_wage: 1320,
							latitude: 35.123,
							longitude: 139.456,
							has_overtime: 1,
							monthly_hours: 176,
						},
						input: {
							label: "JOB00001",
							features: [1320, 35.123, 139.456, 1, 176],
						},
					},
				],
				excludedRows: [],
			},
			clusters: [0],
			clusterLabels: { 0: "クラスタA" },
			visualizedCoordinates: [[0.5, -0.1]],
			candidates: {
				elbow: [{ k: 2, inertia: 100 }],
				silhouette: [{ k: 2, score: 0.4 }],
				recommendedByElbow: 2,
				recommendedBySilhouette: 2,
			},
		};

		const model = buildPlotModel(runResult, 2);
		const firstTrace = model.traces[0] as { text: string[] };
		expect(firstTrace.text[0]).toContain("元データ:");
		expect(firstTrace.text[0]).toContain("hourly_wage");
		expect(firstTrace.text[0]).toContain("...");
	});
});
