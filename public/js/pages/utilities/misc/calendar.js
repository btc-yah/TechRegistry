/**
 * Calendar Logic with Holiday Integration and Year View
 * Uses Nager.Date API for free public holidays
 */

$(function () {
	let currentDate = new Date();
	let viewMode = "month"; // 'month' or 'year'
	let holidayCache = new Map();
	let countriesCache = [];
	let selectedCountryCode = "";

	const $countrySelect = $("#countrySelect");
	const $monthText = $("#monthText");
	const $yearText = $("#yearText");
	const $calendarBody = $("#calendarBody");
	const $yearGrid = $("#yearGrid");
	const $calendarContainer = $("#calendarContainer");
	const $yearViewContainer = $("#yearViewContainer");
	const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
	const preferredCountryCode = "IN";

	const fetchCountries = async () => {
		if (countriesCache.length > 0) return countriesCache;

		try {
			const response = await fetch("https://date.nager.at/api/v3/AvailableCountries");
			if (!response.ok) return [];

			const data = await response.json();
			if (!Array.isArray(data)) return [];

			countriesCache = [...data].sort((a, b) => a.name.localeCompare(b.name));
			return countriesCache;
		} catch (error) {
			console.error("Failed to fetch countries:", error);
			return [];
		}
	};

	const populateCountrySelect = async () => {
		const countries = await fetchCountries();
		$countrySelect.empty();

		if (countries.length === 0) {
			$countrySelect.append('<option value="">Countries unavailable</option>');
			$countrySelect.prop("disabled", true);
			return;
		}

		$countrySelect.prop("disabled", false);
		countries.forEach((country) => {
			$countrySelect.append(`<option value="${country.countryCode}">${country.name}</option>`);
		});

		const hasPreferredCountry = countries.some((country) => country.countryCode === preferredCountryCode);
		selectedCountryCode = hasPreferredCountry ? preferredCountryCode : countries[0].countryCode;
		$countrySelect.val(selectedCountryCode);
	};

	const fetchHolidays = async (year, countryCode) => {
		if (!countryCode) return [];
		const cacheKey = `${year}-${countryCode}`;
		if (holidayCache.has(cacheKey)) return holidayCache.get(cacheKey);

		try {
			const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`);
			if (!response.ok) return [];

			const data = await response.json();
			const holidays = Array.isArray(data) ? data : [];
			holidayCache.set(cacheKey, holidays);
			return holidays;
		} catch (error) {
			console.error("Failed to fetch holidays:", error);
		}
		return [];
	};

	const renderMonth = (targetYear, targetMonth, targetTbody, holidays, isMini = false) => {
		const firstDay = (new Date(targetYear, targetMonth, 1).getDay() + 6) % 7;
		const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
		const today = new Date();

		$(targetTbody).empty();
		let date = 1;

		for (let i = 0; i < 6; i++) {
			const $row = $("<tr>");
			for (let j = 0; j < 7; j++) {
				const $cell = $("<td>");
				const dayIndex = i * 7 + j;

				if (dayIndex >= firstDay && date <= daysInMonth) {
					const currentDayStr = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
					const dayHoliday = holidays.find((h) => h.date === currentDayStr);

					$cell.html(`<div class="${isMini ? 'mini-day' : 'day-number'}">${date}</div>`);
					if (dayHoliday) {
						if (!isMini) $cell.append(`<span class="holiday-mark" title="${dayHoliday.localName}">${dayHoliday.name}</span>`);
						if (isMini) {
							const holidayLabel = dayHoliday.localName && dayHoliday.localName !== dayHoliday.name
								? `${dayHoliday.name} (${dayHoliday.localName})`
								: dayHoliday.name;
							$cell.attr("title", holidayLabel);
							$cell.find(".mini-day").addClass("mini-holiday").attr("title", holidayLabel);
						}
					}

					if (!isMini) $cell.addClass("calendar-day");

					if (date === today.getDate() && targetMonth === today.getMonth() && targetYear === today.getFullYear()) {
						if (isMini) $cell.find('.mini-day').addClass("mini-today");
						else $cell.addClass("today");
					}
					date++;
				} else {
					if (!isMini) $cell.addClass("calendar-day is-empty");
				}
				$row.append($cell);
			}
			$(targetTbody).append($row);
			if (date > daysInMonth) break;
		}
	};

	const renderYearView = (holidays) => {
		$yearGrid.empty();
		const year = currentDate.getFullYear();
		const months = [
			"January",
			"February",
			"March",
			"April",
			"May",
			"June",
			"July",
			"August",
			"September",
			"October",
			"November",
			"December",
		];

		months.forEach((monthName, m) => {
			const $monthCol = $('<div class="col">').html(`
				<div class="card year-month-card h-100 shadow-none">
					<div class="card-header py-2">
						<h6 class="mb-0 text-center fw-bold">${monthName}</h6>
					</div>
					<div class="card-body p-0 year-month-mini">
						<table class="table table-sm table-borderless mb-0">
							<thead>
								<tr>${weekdayLabels.map((label) => `<th style="width:14%">${label[0]}</th>`).join("")}</tr>
							</thead>
							<tbody id="mini-month-${m}"></tbody>
						</table>
					</div>
				</div>
			`);
			$yearGrid.append($monthCol);
			renderMonth(year, m, $(`#mini-month-${m}`), holidays, true);
		});
	};

	const updateDisplay = async () => {
		selectedCountryCode = $countrySelect.val();

		// Update header labels immediately for instant UI feedback
		if (viewMode === "month") {
			$monthText.text(currentDate.toLocaleDateString("en-US", { month: "long" }));
			$yearText.text(currentDate.getFullYear());
			$calendarContainer.removeClass("d-none");
			$yearViewContainer.addClass("d-none");
		} else {
			$monthText.text("Year View");
			$yearText.text(currentDate.getFullYear());
			$calendarContainer.addClass("d-none");
			$yearViewContainer.removeClass("d-none");
		}

		const holidays = await fetchHolidays(currentDate.getFullYear(), selectedCountryCode);

		if (viewMode === "month") {
			renderMonth(currentDate.getFullYear(), currentDate.getMonth(), $calendarBody, holidays);
		} else {
			renderYearView(holidays);
		}
	};

	// Event Listeners
	$("#prevBtn").on("click", () => {
		if (viewMode === "month") {
			// Set to 1st of month first to prevent rollover skips (e.g. March 31 -> March 3)
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
		} else {
			currentDate.setFullYear(currentDate.getFullYear() - 1);
		}
		updateDisplay();
	});

	$("#nextBtn").on("click", () => {
		if (viewMode === "month") {
			// Set to 1st of month first to prevent rollover skips
			currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
		} else {
			currentDate.setFullYear(currentDate.getFullYear() + 1);
		}
		updateDisplay();
	});

	$("#todayBtn").on("click", () => {
		currentDate = new Date();
		updateDisplay();
	});

	$("#toggleYearView").on("click", function () {
		viewMode = viewMode === "month" ? "year" : "month";
		const icon = viewMode === "month" ? "fa-calendar-alt" : "fa-calendar-day";
		const label = viewMode === "month" ? "Year View" : "Month View";
		$(this).html(`<i class="fas ${icon} me-1"></i> ${label}`);
		$(this).toggleClass("calendar-action-btn--accent", viewMode === "month");

		// Sync header buttons if needed
		const $prevBtn = $("#prevBtn");
		const $nextBtn = $("#nextBtn");
		if (viewMode === "year") {
			$prevBtn.html('<i class="fas fa-backward"></i>');
			$nextBtn.html('<i class="fas fa-forward"></i>');
		} else {
			$prevBtn.html('<i class="fas fa-caret-left"></i>');
			$nextBtn.html('<i class="fas fa-caret-right"></i>');
		}

		updateDisplay();
	});

	$countrySelect.on("change", updateDisplay);

	// Initial Render
	const init = async () => {
		await populateCountrySelect();
		await updateDisplay();
	};

	init();
});
