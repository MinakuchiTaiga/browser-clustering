# browser-clustering

ブラウザ上で完結する（サーバー送信なし）`k-means`クラスタリングWebアプリです。

- 実装スタック: `TypeScript` + `React` + `Vite` + `Biome` + `Vitest` + `shadcn/ui`(最小構成)
- 可視化: `Plotly.js`
- 前処理: `z-score`（ON/OFF可）+ 任意の事前PCA
- 出力: `PNG` / `SVG` / `HTML + JS（オフライン閲覧用）` / `CSV`
- 大規模データ実行時: 進捗率表示 + ローディングアニメーション
- 入力支援: CSV/TSV入力形式ガイド（モーダル）+ 各項目説明ツールチップ

## セットアップ

```bash
pnpm install
pnpm dev
```

## テスト・検査

```bash
pnpm test
pnpm build
pnpm audit:offline
```

## 入力仕様

- 受け付け: `CSV`, `TSV`
- 区切り文字: `,` / `\t` を自動判定
- 先頭列: ID/名称ラベル（文字列）
- 2列目以降: 数値特徴量
- 欠損値・非数値セルを含む行は除外し、行番号をUIに表示

### ヘッダー判定の実装ルール

- 先頭行の2列目以降に非数値が1つでもあればヘッダー行として扱う
- ヘッダーが無い場合は `label`, `feature_1`, `feature_2` ... を自動付与

## 実行パラメータ

- `k`: クラスタ数（手動指定）
- `seed`: 乱数シード（既定値 `42`）
- `useStandardize`: z-score標準化ON/OFF（既定値 `ON`）
- `usePcaBeforeClustering`: クラスタリング前PCA ON/OFF（既定値 `OFF`）
- `pcaTargetDim`: 事前PCA次元（ON時のみ）
- `vizDim`: 可視化次元 `2 | 3`

## クラスタリング仕様

- 初期化: `k-means++`
- 反復戦略: `n_init = 10` の複数初期値から最良慣性を採用
- 候補提示: `Elbow` / `Silhouette` を計算して推奨 `k` を提示

## 可視化仕様

- クラスタリング後に可視化用PCAを実行
- `2D` / `3D` を切り替え可能
- hover表示: `ID + cluster名 + 可視化座標 + 元データ先頭5項目（超過時は...）`
- `cluster_id` ごとに `cluster_label` を編集可能

## エクスポート仕様

- 画像: `PNG`, `SVG`
- インタラクティブ: `HTML + JS`
  - `clustering-result.html`
  - `plot-data.js`
  - `plotly.min.js`
  - 3ファイルを同じフォルダに置くと単体表示可能
- 表形式CSV: `元データ列 + cluster_id + cluster_label`

## ガードレール

- 推奨上限: `50万セル（行数 × 特徴量数）`
- 超過時は確認ダイアログを表示し、ユーザーが明示許可した場合のみ続行

### 安全実行の目安

- 10万セル未満: ほぼ快適
- 10万〜50万セル: ブラウザ性能に依存して待ち時間が増加
- 50万セル超: フリーズリスクが高く、分割投入または特徴量削減を推奨

### 重くなる条件

- 行数が多い
- 特徴量数が多い
- `vizDim = 3` + 高密度描画
- 候補探索（Elbow/Silhouette）で試行kが多い

### 中断推奨条件

- ブラウザの応答遅延が継続する
- メモリ使用量が急増する
- 既に同等分析結果が得られている

## プライバシー・セキュリティ

- クライアントオンリー（サーバー送信なし）
- CDN不使用（依存はビルド時同梱）
- 外向き通信を行う実装を含めない方針
- `Content-Security-Policy` を `index.html` に設定
- `pnpm audit:offline` で成果物の外部URL/通信APIパターンを静的監査

## 対応ブラウザ

- 最新版 `Chrome/Edge`（Chromium系、最新2バージョン想定）

## データ契約（実装インターフェース）

```ts
type InputRecord = {
  label: string;
  features: number[];
};

type RunConfig = {
  k: number;
  seed: number;
  useStandardize: boolean;
  usePcaBeforeClustering: boolean;
  pcaTargetDim?: number;
  vizDim: 2 | 3;
};

type OutputRecord = {
  [originalColumn: string]: string | number;
  cluster_id: number;
  cluster_label: string;
};
```

## 実装済みテスト観点

- ユニットテスト
  - CSV/TSV判定
  - 欠損/非数値行の除外と行番号
  - z-score標準化の性質
  - seed再現性
  - `n_init` 複数実行の慣性比較
  - 2D/3D PCA座標形状
- 結合テスト（Vitest + Testing Library）
  - ファイル読込 → 実行 → ラベル編集 → CSV出力
  - 50万セル超過時の確認ダイアログ表示
