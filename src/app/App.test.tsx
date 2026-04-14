import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { downloadBlobMock } = vi.hoisted(() => ({ downloadBlobMock: vi.fn() }));

vi.mock("@/infra/plotlyClient", async () => {
	return {
		buildInteractiveHtmlContent: vi.fn(() => "<html></html>"),
		buildInteractiveScriptContent: vi.fn(() => "console.log('plot')"),
		renderPlot: vi.fn(async () => {}),
		exportPlotAsImageDataUrl: vi.fn(async () => "data:image/png;base64,iVBORw0KGgo="),
		getPlotlyBundleContent: vi.fn(() => "console.log('plotly')"),
	};
});

vi.mock("@/infra/exporters", async () => {
	const actual = await vi.importActual<typeof import("@/infra/exporters")>("@/infra/exporters");
	return {
		...actual,
		downloadBlob: downloadBlobMock,
	};
});

import { App } from "@/app/App";

/**
 * Appの結合動作を検証する。
 */
describe("App integration", () => {
	it("ファイル読込から実行、ラベル編集、CSV出力まで実行できる", async () => {
		const user = userEvent.setup();
		render(<App />);

		const csv = ["id,f1,f2", "a,1,1", "b,1.2,1.1", "c,8,8", "d,8.2,8.1"].join("\n");
		const input = screen.getByLabelText("CSV/TSVファイル") as HTMLInputElement;
		const file = new File([csv], "sample.csv", { type: "text/csv" });

		await user.upload(input, file);
		await user.click(screen.getByRole("button", { name: "実行" }));

		expect(await screen.findByText(/有効行:/)).toBeInTheDocument();

		const labelInput = await screen.findByLabelText("cluster-label-0");
		await user.clear(labelInput);
		await user.type(labelInput, "営業クラスタ");

		await user.click(screen.getByRole("button", { name: "CSV出力" }));

		await waitFor(() => {
			expect(downloadBlobMock).toHaveBeenCalled();
		});

		const firstCall = downloadBlobMock.mock.calls.find(
			(call) => call[1] === "clustering-result.csv",
		);
		expect(firstCall).toBeTruthy();
		expect(firstCall?.[0]).toBeInstanceOf(Blob);
	});

	it("50万セル超過時に確認ダイアログで中断できる", async () => {
		const user = userEvent.setup();
		const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
		render(<App />);

		const hugeRows: string[] = ["id,f1,f2,f3,f4,f5"]; // 5 features
		for (let i = 0; i < 100_001; i += 1) {
			hugeRows.push(`id-${i},1,2,3,4,5`);
		}

		const input = screen.getByLabelText("CSV/TSVファイル") as HTMLInputElement;
		const file = new File([hugeRows.join("\n")], "huge.csv", { type: "text/csv" });

		await user.upload(input, file);
		await user.click(screen.getByRole("button", { name: "実行" }));

		expect(confirmSpy).toHaveBeenCalled();
		expect(screen.queryByText(/有効行:/)).not.toBeInTheDocument();
		confirmSpy.mockRestore();
	});

	it("入力形式ガイドモーダルを開閉できる", async () => {
		const user = userEvent.setup();
		render(<App />);

		await user.click(screen.getByRole("button", { name: "入力形式ガイドを見る" }));
		expect(screen.getByRole("dialog", { name: "入力形式ガイド" })).toBeInTheDocument();
		expect(screen.getByText("CSV / TSV 入力形式ガイド")).toBeInTheDocument();

		await user.click(screen.getByRole("button", { name: "閉じる" }));
		expect(screen.queryByRole("dialog", { name: "入力形式ガイド" })).not.toBeInTheDocument();
	});
});
