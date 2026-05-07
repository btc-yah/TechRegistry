$(document).ready(function () {

    // ✅ All units normalized to BYTES
    const units = [
        // Bits / Bytes
        { name: "Bits", abbr: "b", toBytes: 1 / 8, description: "The most basic unit of digital information (binary digit)." },
        { name: "Bytes", abbr: "B", toBytes: 1, description: "A group of 8 bits. The standard unit for storage and processing." },

        // Decimal (SI)
        { name: "Kilobytes", abbr: "KB", toBytes: 1000, description: "1,000 (10^3) bytes. Standard SI unit used for disk storage labels." },
        { name: "Megabytes", abbr: "MB", toBytes: 1000 ** 2, description: "1,000,000 (10^6) bytes. Commonly used for small files and images." },
        { name: "Gigabytes", abbr: "GB", toBytes: 1000 ** 3, description: "1,000,000,000 (10^9) bytes. The standard for modern consumer storage." },
        { name: "Terabytes", abbr: "TB", toBytes: 1000 ** 4, description: "1,000,000,000,000 (10^12) bytes. Common in high-capacity server drives." },

        // Binary (IEC)
        { name: "Kibibytes", abbr: "KiB", toBytes: 1024, description: "1,024 (2^10) bytes. The binary equivalent of a kilobyte." },
        { name: "Mebibytes", abbr: "MiB", toBytes: 1024 ** 2, description: "1,048,576 (2^20) bytes. Often used by OS kernels and memory." },
        { name: "Gibibytes", abbr: "GiB", toBytes: 1024 ** 3, description: "1,073,741,824 (2^30) bytes. Precise unit for computing logic." },
        { name: "Tebibytes", abbr: "TiB", toBytes: 1024 ** 4, description: "1,099,511,627,776 (2^40) bytes. Used in high-performance computing." }
    ];

    const $value = $("#data-value");
    const $from = $("#data-from");
    const $to = $("#data-to");
    const $result = $("#data-result");
    const $description = $("#unit-description");

    function formatNumber(val) {
        return Number(val).toLocaleString("en-US", {
            maximumFractionDigits: 6
        });
    }

    function getUnit(unit) {
        return units.find(u => u.abbr === unit);
    }

    function fillUnits() {
        const options = units.map(u =>
            `<option value="${u.abbr}">${u.name} (${u.abbr})</option>`
        ).join("");

        $from.html(options);
        $to.html(options);

        $from.val("MB");
        $to.val("MiB");
    }

    function convert() {
        let value = parseFloat($value.val());

        if (isNaN(value)) {
            $result.val("");
            return;
        }

        const fromUnit = getUnit($from.val());
        const toUnit = getUnit($to.val());

        if (!fromUnit || !toUnit) {
            $result.val("Error");
            return;
        }

        // Update dynamic description based on "From" unit
        $description.html(`<strong>${fromUnit.name} (${fromUnit.abbr}):</strong> ${fromUnit.description}`);

        // ✅ Convert → BYTES → TARGET
        const bytes = value * fromUnit.toBytes;
        const finalValue = bytes / toUnit.toBytes;

        $result.val(formatNumber(finalValue));
    }

    // ✅ Events
    $("#data-run").click(convert);

    $("#data-swap").click(function () {
        const temp = $from.val();
        $from.val($to.val());
        $to.val(temp);
        convert();
    });

    $value.on("input", convert);
    $from.on("change", convert);
    $to.on("change", convert);

    // ✅ Init
    fillUnits();
    convert();
});