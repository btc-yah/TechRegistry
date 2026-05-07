$(function () {
	const $amount = $("#money-amount");
	const $from = $("#money-from");
	const $to = $("#money-to");
	const $fromSearch = $("#money-from-search");
	const $toSearch = $("#money-to-search");
	const $result = $("#money-result");
	const $meta = $("#money-meta");
	const rateCache = new Map();
	let currencies = [];
	let historyChart = null;

	function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); } // Keep as is
	async function copyText(text) {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true; // Keep as is
		}
		return false;
	}
	function formatMoney(value, code) {
		return `${Number(value).toLocaleString("en-US", { maximumFractionDigits: 4 })} ${String(code).toUpperCase()}`;
	}

	async function loadCurrencies() {
		if (currencies.length) return currencies;
		const response = await fetch("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies.json");
		const data = await response.json();
		currencies = Object.entries(data)
			.map(([code, label]) => ({ code, label }))
			.sort((a, b) => a.code.localeCompare(b.code));

		const options = currencies.map((item) => `<option value="${item.code}">${item.code.toUpperCase()} - ${item.label}</option>`).join("");
		$from.html(options).val("usd");
		$to.html(options).val("inr");
		return currencies;
	}

	function filterList($select, query) {
		const q = query.toLowerCase();
		const filtered = currencies.filter(item =>
			item.code.toLowerCase().includes(q) ||
			item.label.toLowerCase().includes(q)
		);
		const currentVal = $select.val();
		const options = filtered.map((item) => `<option value="${item.code}">${item.code.toUpperCase()} - ${item.label}</option>`).join("");
		$select.html(options);
		if (filtered.some(i => i.code === currentVal)) $select.val(currentVal);
	}

	async function loadRates(baseCode, forceRefresh = false) {
		const code = baseCode.toLowerCase();
		if (!forceRefresh && rateCache.has(code)) return rateCache.get(code);
		const response = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${code}.json`);
		const data = await response.json();
		rateCache.set(code, data);
		return data;
	}

	async function fetchHistory(fromCode, toCode) {
		const $chartContainer = $("#money-history-chart");
		if (!$chartContainer.length) return;

		$chartContainer.html('<div class="text-center py-5"><div class="spinner-border text-warning" role="status"></div><p class="mt-2 text-muted">Loading 30-day trend...</p></div>');

		const dates = [];
		const now = new Date();
		for (let i = 30; i >= 0; i--) {
			const d = new Date();
			d.setDate(now.getDate() - i);
			dates.push(d.toISOString().split("T")[0]);
		}

		try {
			const results = await Promise.all(dates.map(async (date) => {
				try {
					const resp = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${date}/v1/currencies/${fromCode}.json`);
					if (!resp.ok) return null;
					const data = await resp.json();
					return { x: date, y: data[fromCode][toCode] };
				} catch { return null; }
			}));

			const dataPoints = results.filter(r => r !== null && r.y !== undefined);
			if (!dataPoints.length) throw new Error("No historical data found.");

			const options = {
				chart: {
					type: "area",
					height: 250,
					fontFamily: "inherit",
					toolbar: { show: false },
					animations: { enabled: true }
				},
				colors: ["#add8e6"],
				stroke: { curve: "smooth", width: 2 },
				fill: {
					type: "gradient",
					gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [50, 100] }
				},
				series: [{ name: `${fromCode.toUpperCase()} to ${toCode.toUpperCase()} Exchange Rate`, data: dataPoints }],
				xaxis: { type: "datetime", labels: { style: { colors: "rgba(255,255,255,0.5)" } } },
				yaxis: {
					labels: {
						style: { colors: "rgba(255,255,255,0.5)" },
						formatter: (v) => v?.toFixed(4)
					}
				},
				grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
				legend: {
					show: true,
					position: "top",
					horizontalAlign: "right",
					markers: {
						width: 10,
						height: 10
					},
					labels: {
						colors: "#fff"
					}
				},
				theme: { mode: "dark" },
				tooltip: { theme: "dark", x: { format: "dd MMM yyyy" } }
			};

			$chartContainer.empty();
			if (historyChart) historyChart.destroy();
			historyChart = new ApexCharts($chartContainer[0], options);
			await historyChart.render();
		} catch (err) {
			$chartContainer.html(`<div class="text-center py-5 text-muted small">Historical trend unavailable for this pair.</div>`);
		}
	}

	let historyTimeout = null;
	async function render(showToast = true, forceRefresh = false) {
		try {
			await loadCurrencies();
			const fromCode = $from.val().toLowerCase();
			const toCode = $to.val().toLowerCase();
			const data = await loadRates(fromCode, forceRefresh);

			clearTimeout(historyTimeout);
			historyTimeout = setTimeout(() => {
				fetchHistory(fromCode, toCode);
			}, 500);

			const rate = fromCode === toCode ? 1 : data[fromCode][toCode];

			if (rate === undefined) throw new Error("Rate not available for the selected currencies.");

			const converted = Number($amount.val() || 0) * rate;
			$result.val(Number(converted).toLocaleString("en-US", { maximumFractionDigits: 4 }));
			$meta.text(`${formatMoney($amount.val() || 0, fromCode)} = ${formatMoney(converted, toCode)} | 1 ${fromCode.toUpperCase()} = ${Number(rate).toLocaleString("en-US", { maximumFractionDigits: 6 })} ${toCode.toUpperCase()} | ${data.date}`);

			if (showToast) notify(forceRefresh ? "Rates refreshed." : "Money conversion complete.", "success");
		} catch (error) {
			$result.val("");
			$meta.text("Unable to fetch live exchange rates right now.");
			if (showToast) notify(error instanceof Error ? error.message : "Currency conversion failed.", "error");
		}
	}

	$("#money-load-sample").on("click", () => { $amount.val("1"); $from.val("usd"); $to.val("inr"); render(false); notify("Sample loaded.", "neutral"); });
	$("#money-clear").on("click", () => { $amount.val(""); $result.val(""); $meta.text("Ready."); if (historyChart) { historyChart.destroy(); historyChart = null; } $("#money-history-chart").empty(); notify("Converter cleared.", "neutral"); });
	$("#money-swap").on("click", () => { const current = $from.val(); $from.val($to.val()); $to.val(current); render(false); notify("Currencies swapped.", "neutral"); });
	$("#money-refresh").on("click", () => render(true, true));
	$("#money-copy").on("click", async () => { const ok = await copyText($meta.text()); notify(ok ? "Result copied." : "Copy failed. Please copy manually.", ok ? "success" : "error"); });
	$from.on("change", () => render(false));
	$to.on("change", () => render(false));
	$amount.on("input", () => render(false));
	$fromSearch.on("input", function () { filterList($from, $(this).val()); });
	$toSearch.on("input", function () { filterList($to, $(this).val()); });

	loadCurrencies().then(() => render(false));
});
