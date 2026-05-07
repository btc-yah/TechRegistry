const unitSets = {
	length: {
		sample: { value: "12", from: "m", to: "km" },
		units: [
			{ value: "Em", label: "exameter [Em]", factor: 1e18 },
			{ value: "Pm", label: "petameter [Pm]", factor: 1e15 },
			{ value: "Tm", label: "terameter [Tm]", factor: 1e12 },
			{ value: "Gm", label: "gigameter [Gm]", factor: 1e9 },
			{ value: "Mm", label: "megameter [Mm]", factor: 1e6 },
			{ value: "km", label: "kilometer [km]", factor: 1e3 },
			{ value: "hm", label: "hectometer [hm]", factor: 1e2 },
			{ value: "dam", label: "dekameter [dam]", factor: 1e1 },
			{ value: "m", label: "meter [m]", factor: 1 },
			{ value: "dm", label: "decimeter [dm]", factor: 1e-1 },
			{ value: "cm", label: "centimeter [cm]", factor: 1e-2 },
			{ value: "mm", label: "millimeter [mm]", factor: 1e-3 },
			{ value: "um", label: "micrometer [um]", factor: 1e-6 },
			{ value: "nm", label: "nanometer [nm]", factor: 1e-9 },
			{ value: "mi", label: "mile [mi]", factor: 1609.344 },
			{ value: "yd", label: "yard [yd]", factor: 0.9144 },
			{ value: "ft", label: "foot [ft]", factor: 0.3048 },
			{ value: "in", label: "inch [in]", factor: 0.0254 },
			{ value: "nmi", label: "nautical mile [nmi]", factor: 1852 }
		]
	},
	area: {
		sample: { value: "2.5", from: "ac", to: "m2" },
		units: [
			{ value: "km2", label: "square kilometer [km2]", factor: 1e6 },
			{ value: "ha", label: "hectare [ha]", factor: 1e4 },
			{ value: "ac", label: "acre [ac]", factor: 4046.8564224 },
			{ value: "m2", label: "square meter [m2]", factor: 1 },
			{ value: "ft2", label: "square foot [ft2]", factor: 0.09290304 },
			{ value: "yd2", label: "square yard [yd2]", factor: 0.83612736 },
			{ value: "in2", label: "square inch [in2]", factor: 0.00064516 },
			{ value: "cm2", label: "square centimeter [cm2]", factor: 1e-4 },
			{ value: "mm2", label: "square millimeter [mm2]", factor: 1e-6 },
			{ value: "mi2", label: "square mile [mi2]", factor: 2.589988110336e6 }
		]
	},
	volume: {
		sample: { value: "18", from: "l", to: "gal" },
		units: [
			{ value: "km3", label: "cubic kilometer [km3]", factor: 1e9 },
			{ value: "m3", label: "cubic meter [m3]", factor: 1 },
			{ value: "l", label: "liter [l]", factor: 1e-3 },
			{ value: "ml", label: "milliliter [ml]", factor: 1e-6 },
			{ value: "cm3", label: "cubic centimeter [cm3]", factor: 1e-6 },
			{ value: "ft3", label: "cubic foot [ft3]", factor: 0.028316846592 },
			{ value: "yd3", label: "cubic yard [yd3]", factor: 0.764554857984 },
			{ value: "in3", label: "cubic inch [in3]", factor: 1.6387064e-5 },
			{ value: "gal", label: "gallon [gal]", factor: 0.003785411784 },
			{ value: "qt", label: "quart [qt]", factor: 0.000946352946 },
			{ value: "pt", label: "pint [pt]", factor: 0.000473176473 },
			{ value: "cup", label: "cup [cup]", factor: 0.0002365882365 }
		]
	}
};

const measure = document.querySelector("#metric-measure");
const valueInput = document.querySelector("#metric-value");
const from = document.querySelector("#metric-from");
const to = document.querySelector("#metric-to");
const resultInput = document.querySelector("#metric-result");
const meta = document.querySelector("#metric-meta");

function notify(message, kind = "neutral") { globalThis.appToast?.(message, kind); }

function formatNumber(value) {
	return Number(value).toLocaleString("en-US", { maximumFractionDigits: 8, minimumFractionDigits: 0 });
}

function getUnits() {
	return unitSets[measure.value]?.units ?? unitSets.length.units;
}

function getUnitMap() {
	return new Map(getUnits().map((unit) => [unit.value, unit]));
}

function fillUnits(fromValue, toValue) {
	const units = getUnits();
	const options = units.map((unit) => `<option value="${unit.value}">${unit.label}</option>`).join("");
	from.innerHTML = options;
	to.innerHTML = options;
	from.value = fromValue ?? units[0]?.value ?? "";
	to.value = toValue ?? units[1]?.value ?? units[0]?.value ?? "";
}

function render(showToast = false) {
	const rawValue = Number(valueInput.value);
	if (Number.isNaN(rawValue)) {
		resultInput.value = "";
		meta.textContent = "Enter a valid number to convert.";
		return;
	}

	const units = getUnitMap();
	const fromUnit = units.get(from.value);
	const toUnit = units.get(to.value);
	if (!fromUnit || !toUnit) {
		resultInput.value = "";
		meta.textContent = "Select both source and target units.";
		return;
	}

	const baseValue = rawValue * fromUnit.factor;
	const convertedValue = baseValue / toUnit.factor;
	resultInput.value = formatNumber(convertedValue);
	meta.textContent = `${formatNumber(rawValue)} ${fromUnit.label} = ${formatNumber(convertedValue)} ${toUnit.label}`;
	if (showToast) notify("Metric conversion complete.", "success");
}

function applySample() {
	const sample = unitSets[measure.value] ?? unitSets.length;
	valueInput.value = sample.sample.value;
	fillUnits(sample.sample.from, sample.sample.to);
	render();
}

document.querySelector("#metric-swap")?.addEventListener("click", () => {
	const current = from.value;
	from.value = to.value;
	to.value = current;
	render();
	notify("Units swapped.", "neutral");
});

document.querySelector("#metric-run")?.addEventListener("click", () => render(true));
measure?.addEventListener("change", () => applySample());
from?.addEventListener("change", () => render());
to?.addEventListener("change", () => render());

applySample();
