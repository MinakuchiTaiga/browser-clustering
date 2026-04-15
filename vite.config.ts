import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * Viteのビルド設定を返す。
 * `BASE_PATH` 環境変数がある場合はその値を優先し、未指定時は `/` を利用する。
 */
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const base = env.BASE_PATH?.trim() ? env.BASE_PATH : "/";

	return {
		base,
		plugins: [react()],
		resolve: {
			alias: {
				"@": "/src",
			},
		},
		test: {
			environment: "jsdom",
			setupFiles: "./src/test/setup.ts",
			globals: true,
		},
	};
});
