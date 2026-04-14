import { describe, expect, it, vi } from "vitest";

vi.mock("plotly.js-dist-min", () => {
	return {
		default: {
			newPlot: vi.fn(async () => {}),
			toImage: vi.fn(async () => ""),
		},
	};
});

vi.mock("plotly.js-dist-min/plotly.min.js?raw", () => {
	return {
		default: "window.Plotly={newPlot:function(){}};",
	};
});

import { buildSelfContainedHtmlContent } from "@/infra/plotlyClient";

describe("buildSelfContainedHtmlContent", () => {
	it("単一HTMLとして自己完結した内容を返す", () => {
		const html = buildSelfContainedHtmlContent("test", [{ x: [1], y: [2], type: "scatter" }], {
			title: "test",
		});

		expect(html).toContain("<script>");
		expect(html).toContain("window.Plotly.newPlot");
		expect(html).not.toContain('src="./plotly.min.js"');
	});
});
