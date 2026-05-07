$(document).ready(function () {

    const units = [
        { name: "Celsius", abbr: "C" },
        { name: "Fahrenheit", abbr: "F" },
        { name: "Kelvin", abbr: "K" }
    ];

    const $value = $("#temp-value");
    const $from = $("#temp-from");
    const $to = $("#temp-to");
    const $result = $("#temp-result");
    const $meta = $("#temp-meta");

    function formatNumber(val) {
        return Number(val).toLocaleString("en-US", {
            maximumFractionDigits: 4
        });
    }

    function fillUnits() {
        const options = units.map(u =>
            `<option value="${u.abbr}">${u.name} (${u.abbr})</option>`
        ).join("");

        $from.html(options);
        $to.html(options);

        $from.val("C");
        $to.val("F");
    }

    // 🔥 Core conversion logic (NO API)
    function convertTemperature(value, from, to) {

        // Step 1: Convert → Celsius
        let celsius;

        switch (from) {
            case "C": celsius = value; break;
            case "F": celsius = (value - 32) * 5 / 9; break;
            case "K": celsius = value - 273.15; break;
            default: return null;
        }

        // Step 2: Celsius → Target
        switch (to) {
            case "C": return celsius;
            case "F": return (celsius * 9 / 5) + 32;
            case "K": return celsius + 273.15;
            default: return null;
        }
    }

    function render() {
        let value = parseFloat($value.val());

        if (isNaN(value)) {
            $result.val("");
            $meta.text("Enter a valid value");
            return;
        }

        let fromUnit = $from.val();
        let toUnit = $to.val();

        let result = convertTemperature(value, fromUnit, toUnit);

        if (result === null) {
            $result.val("Error");
            return;
        }

        $result.val(formatNumber(result));
        $meta.text(`${formatNumber(value)} ${fromUnit} = ${formatNumber(result)} ${toUnit}`);
    }

    // ✅ Events
    $("#temp-run").click(render); // if you add convert button later

    $("#temp-swap").click(function () {
        let temp = $from.val();
        $from.val($to.val());
        $to.val(temp);
        render();
    });

    $value.on("input", render);
    $from.on("change", render);
    $to.on("change", render);

    // Init
    fillUnits();
    render();
});