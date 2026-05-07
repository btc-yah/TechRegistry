$(document).ready(function () {

    const $value = $("#time-value");
    const $from = $("#time-from");
    const $to = $("#time-to");
    const $result = $("#time-result");

    // ✅ Get all timezones
    const zones = Intl.supportedValuesOf("timeZone");

    function formatZoneName(zone) {
        return zone.replaceAll("_", " ");
    }

    function fillZones() {
        const options = zones.map(z =>
            `<option value="${z}">${formatZoneName(z)}</option>`
        ).join("");

        $from.html(options);
        $to.html(options);

        $from.val("Asia/Kolkata");
        $to.val("UTC");
    }

    function formatTime(date, zone) {
        return new Intl.DateTimeFormat("en-US", {
            timeZone: zone,
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        }).format(date);
    }

    function convert() {
        if (!$value.val()) {
            $result.val("");
            return;
        }

        const inputDate = new Date($value.val());
        const converted = formatTime(inputDate, $to.val());

        $result.val(converted);
    }

    // Swap
    $("#time-swap").click(function () {
        let temp = $from.val();
        $from.val($to.val());
        $to.val(temp);
        convert();
    });

    // Events
    $("#time-run").click(convert);
    $value.on("change", convert);
    $from.on("change", convert);
    $to.on("change", convert);

    // 🌍 Live clocks
    function updateClocks() {
        const now = new Date();

        $("#clock-ist").text(formatTime(now, "Asia/Kolkata"));
        $("#clock-ny").text(formatTime(now, "America/New_York"));
        $("#clock-london").text(formatTime(now, "Europe/London"));
    }

    setInterval(updateClocks, 1000);
    updateClocks();

    // Init
    fillZones();

    const now = new Date();
    $value.val(now.toISOString().slice(0, 16));
    convert();
});