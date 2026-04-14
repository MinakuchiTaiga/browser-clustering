import { describe, expect, it } from "vitest";
import { detectDelimiter, parseDelimitedText } from "@/domain/parser";

describe("parser", () => {
	it("CSVを正しく判定できる", () => {
		const delimiter = detectDelimiter(["id,a,b", "x,1,2"]);
		expect(delimiter).toBe(",");
	});

	it("TSVを正しく判定できる", () => {
		const delimiter = detectDelimiter(["id\ta\tb", "x\t1\t2"]);
		expect(delimiter).toBe("\t");
	});

	it("欠損と非数値行を除外し行番号を返す", () => {
		const input = ["id,f1,f2", "a,1,2", "b,3,", "c,hello,2", "d,4,5"].join("\n");
		const result = parseDelimitedText(input);

		expect(result.rows).toHaveLength(2);
		expect(result.excludedRows).toHaveLength(2);
		expect(result.excludedRows.map((row) => row.lineNumber)).toEqual([3, 4]);
	});
});
