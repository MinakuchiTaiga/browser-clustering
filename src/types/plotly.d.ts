declare module "plotly.js-dist-min" {
	const Plotly: {
		newPlot: (...args: unknown[]) => Promise<unknown>;
		toImage: (...args: unknown[]) => Promise<string>;
	};

	export default Plotly;
}

declare module "plotly.js-dist-min/plotly.min.js?raw" {
	const content: string;
	export default content;
}
