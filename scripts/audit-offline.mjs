import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT_DIR = new URL("../", import.meta.url).pathname;
const SRC_DIR = join(ROOT_DIR, "src");
const DIST_DIR = join(ROOT_DIR, "dist");

/**
 * 指定ディレクトリ配下のファイルを再帰収集する。
 */
function collectFiles(dirPath) {
	const files = [];
	for (const entry of readdirSync(dirPath)) {
		const fullPath = join(dirPath, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			files.push(...collectFiles(fullPath));
		} else {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * 自作ソース内の外向き通信API利用を検出する。
 */
function auditSourceForNetworkApis() {
	const targets = collectFiles(SRC_DIR).filter((filePath) => {
		const extension = extname(filePath);
		return extension === ".ts" || extension === ".tsx";
	});

	const violations = [];
	const patterns = [/\bfetch\s*\(/g, /\bXMLHttpRequest\b/g, /\bWebSocket\b/g];

	for (const filePath of targets) {
		const content = readFileSync(filePath, "utf8");
		const matched = patterns
			.filter((pattern) => pattern.test(content))
			.map((pattern) => pattern.toString());
		if (matched.length > 0) {
			violations.push({ filePath, matched });
		}
	}

	return violations;
}

/**
 * dist成果物のHTML/CSSに外部URL参照が含まれないか検出する。
 */
function auditDistForExternalReferences() {
	const targets = collectFiles(DIST_DIR).filter((filePath) => {
		const extension = extname(filePath);
		return extension === ".html" || extension === ".css";
	});

	const violations = [];
	const externalUrlPattern = /https?:\/\//g;

	for (const filePath of targets) {
		const content = readFileSync(filePath, "utf8");
		if (externalUrlPattern.test(content)) {
			violations.push({ filePath, matched: [externalUrlPattern.toString()] });
		}
	}

	return violations;
}

/**
 * オフライン監査を実行し、違反時は非0で終了する。
 */
function runAudit() {
	const sourceViolations = auditSourceForNetworkApis();
	const distViolations = auditDistForExternalReferences();
	const allViolations = [...sourceViolations, ...distViolations];

	if (allViolations.length > 0) {
		console.error("[offline-audit] 違反を検出しました。");
		for (const violation of allViolations) {
			console.error(`- ${violation.filePath}`);
			console.error(`  patterns: ${violation.matched.join(", ")}`);
		}
		process.exit(1);
	}

	console.log("[offline-audit] 問題は検出されませんでした。");
}

runAudit();
