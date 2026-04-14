import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Vitestの設定を返す。
 */
export default defineConfig({
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
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
	},
});
