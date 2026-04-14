import type { Delimiter, ParsedInputRow, ParseResult } from "@/domain/types";

/**
 * 入力文字列をCSV/TSVとして解析し、正常行と除外行を返す。
 */
export function parseDelimitedText(content: string): ParseResult {
	const lines = content
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.filter((line) => line.trim().length > 0);

	if (lines.length === 0) {
		return {
			delimiter: ",",
			headers: [],
			rows: [],
			excludedRows: [],
		};
	}

	const delimiter = detectDelimiter(lines);
	const firstTokens = splitLine(lines[0], delimiter);
	const hasHeader = detectHeader(firstTokens);
	const headers = hasHeader
		? normalizeHeaders(firstTokens)
		: createDefaultHeaders(firstTokens.length);

	const rows: ParsedInputRow[] = [];
	const excludedRows: ParseResult["excludedRows"] = [];

	const startIndex = hasHeader ? 1 : 0;
	for (let index = startIndex; index < lines.length; index += 1) {
		const lineNumber = index + 1;
		const tokens = splitLine(lines[index], delimiter);

		if (tokens.length !== headers.length) {
			excludedRows.push({ lineNumber, reason: "列数が一致しません。" });
			continue;
		}

		const label = tokens[0]?.trim();
		if (!label) {
			excludedRows.push({ lineNumber, reason: "ID/名称ラベルが空です。" });
			continue;
		}

		const features: number[] = [];
		let invalid = false;

		for (let featureIndex = 1; featureIndex < tokens.length; featureIndex += 1) {
			const token = tokens[featureIndex]?.trim();
			const value = Number(token);
			if (!token || Number.isNaN(value) || !Number.isFinite(value)) {
				excludedRows.push({
					lineNumber,
					reason: `${headers[featureIndex]} が数値ではありません。`,
				});
				invalid = true;
				break;
			}
			features.push(value);
		}

		if (invalid) {
			continue;
		}

		const original: Record<string, string | number> = {};
		headers.forEach((header, tokenIndex) => {
			if (tokenIndex === 0) {
				original[header] = label;
			} else {
				original[header] = features[tokenIndex - 1];
			}
		});

		rows.push({
			lineNumber,
			original,
			input: {
				label,
				features,
			},
		});
	}

	return {
		delimiter,
		headers,
		rows,
		excludedRows,
	};
}

/**
 * 先頭行群から区切り文字を推定する。
 */
export function detectDelimiter(lines: string[]): Delimiter {
	const sample = lines.slice(0, 5).join("\n");
	const commaCount = (sample.match(/,/g) ?? []).length;
	const tabCount = (sample.match(/\t/g) ?? []).length;
	return tabCount > commaCount ? "\t" : ",";
}

/**
 * 1行のテキストを区切り文字で分割する。
 */
export function splitLine(line: string, delimiter: Delimiter): string[] {
	return line.split(delimiter).map((cell) => cell.trim());
}

/**
 * 先頭行がヘッダーかどうかを判定する。
 */
export function detectHeader(tokens: string[]): boolean {
	if (tokens.length < 2) {
		return false;
	}
	return tokens.slice(1).some((token) => Number.isNaN(Number(token.trim())));
}

/**
 * 先頭行から空欄を補完したヘッダー配列を生成する。
 */
export function normalizeHeaders(headers: string[]): string[] {
	return headers.map((header, index) =>
		header.trim().length > 0 ? header.trim() : `column_${index + 1}`,
	);
}

/**
 * データ行のみの入力時に既定ヘッダーを生成する。
 */
export function createDefaultHeaders(columnCount: number): string[] {
	const headers: string[] = [];
	for (let i = 0; i < columnCount; i += 1) {
		if (i === 0) {
			headers.push("label");
		} else {
			headers.push(`feature_${i}`);
		}
	}
	return headers;
}
