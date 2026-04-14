import type { OutputRecord, ParsedInputRow } from "@/domain/types";

/**
 * Blobをダウンロードする。
 */
export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	URL.revokeObjectURL(url);
}

/**
 * data URLをBlobに変換する。
 */
export function dataUrlToBlob(dataUrl: string): Blob {
	const [meta, raw] = dataUrl.split(",");
	const mimeMatch = meta.match(/data:(.*?);base64/);
	const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
	const decoded = atob(raw);
	const array = new Uint8Array(decoded.length);
	for (let i = 0; i < decoded.length; i += 1) {
		array[i] = decoded.charCodeAt(i);
	}
	return new Blob([array], { type: mime });
}

/**
 * 入力行とクラスタ結果からCSV出力用行を生成する。
 */
export function buildOutputRecords(
	rows: ParsedInputRow[],
	clusters: number[],
	clusterLabels: Record<number, string>,
): OutputRecord[] {
	return rows.map((row, index) => ({
		...row.original,
		cluster_id: clusters[index],
		cluster_label: clusterLabels[clusters[index]] ?? `クラスタ ${clusters[index]}`,
	}));
}

/**
 * レコード配列をCSV文字列へ変換する。
 */
export function toCsv(records: OutputRecord[]): string {
	if (records.length === 0) {
		return "";
	}

	const headers = Object.keys(records[0]);
	const lines = [headers.join(",")];
	for (const record of records) {
		const row = headers.map((header) => escapeCsvCell(record[header] ?? ""));
		lines.push(row.join(","));
	}
	return lines.join("\n");
}

/**
 * CSVセル値をエスケープする。
 */
export function escapeCsvCell(value: string | number): string {
	const text = String(value);
	if (text.includes(",") || text.includes('"') || text.includes("\n")) {
		return `"${text.replaceAll('"', '""')}"`;
	}
	return text;
}
