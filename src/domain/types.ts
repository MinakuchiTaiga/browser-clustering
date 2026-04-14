/**
 * 入力データの1行分を表す内部表現。
 */
export type InputRecord = {
	label: string;
	features: number[];
};

/**
 * クラスタリング実行時の設定値を表す。
 */
export type RunConfig = {
	k: number;
	seed: number;
	useStandardize: boolean;
	usePcaBeforeClustering: boolean;
	pcaTargetDim?: number;
	vizDim: 2 | 3;
};

/**
 * 出力CSVの1行分を表す。
 */
export type OutputRecord = {
	[originalColumn: string]: string | number;
	cluster_id: number;
	cluster_label: string;
};

/**
 * 解析済み入力行を表す。
 */
export type ParsedInputRow = {
	lineNumber: number;
	original: Record<string, string | number>;
	input: InputRecord;
};

/**
 * 除外された入力行を表す。
 */
export type ExcludedRow = {
	lineNumber: number;
	reason: string;
};

/**
 * 区切り文字種別を表す。
 */
export type Delimiter = "," | "\t";

/**
 * パース結果を表す。
 */
export type ParseResult = {
	delimiter: Delimiter;
	headers: string[];
	rows: ParsedInputRow[];
	excludedRows: ExcludedRow[];
};

/**
 * クラスタリング結果を表す。
 */
export type ClusteringResult = {
	clusters: number[];
	centroids: number[][];
	inertia: number;
};

/**
 * 候補提示に利用する評価結果を表す。
 */
export type CandidateScores = {
	elbow: Array<{ k: number; inertia: number }>;
	silhouette: Array<{ k: number; score: number }>;
	recommendedByElbow: number | null;
	recommendedBySilhouette: number | null;
};

/**
 * 実行後にUIへ返す結果を表す。
 */
export type RunResult = {
	parseResult: ParseResult;
	clusters: number[];
	clusterLabels: Record<number, string>;
	visualizedCoordinates: number[][];
	candidates: CandidateScores;
};
