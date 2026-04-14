import { describe, expect, it } from "vitest";
import { buildOutputRecords, toCsv } from "@/infra/exporters";

describe("exporters", () => {
	it("クラスタラベル編集結果がCSVに反映される", () => {
		const rows = [
			{
				lineNumber: 2,
				original: { id: "a", f1: 1 },
				input: { label: "a", features: [1] },
			},
			{
				lineNumber: 3,
				original: { id: "b", f1: 2 },
				input: { label: "b", features: [2] },
			},
		];

		const records = buildOutputRecords(rows, [0, 1], {
			0: "営業クラスタ",
			1: "研究クラスタ",
		});

		const csv = toCsv(records);
		expect(csv).toContain("営業クラスタ");
		expect(csv).toContain("研究クラスタ");
		expect(csv).toContain("cluster_label");
	});
});
