import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app/App";
import "@/app/styles.css";

/**
 * アプリケーションを初期化して描画する。
 */
function bootstrap(): void {
	const rootElement = document.getElementById("root");
	if (!rootElement) {
		throw new Error("root要素が見つかりません。");
	}
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}

bootstrap();
