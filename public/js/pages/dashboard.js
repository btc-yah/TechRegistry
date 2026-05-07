const FAVORITES_KEY = globalThis.TechRegistryStorageKeys?.dashboardFavorites || "devtwist:favorites";
const TIMER_HISTORY_KEY = globalThis.TechRegistryStorageKeys?.dashboardTimerHistory || "devtwist:timer-history";
const STATUS_ENDPOINTS_KEY = globalThis.TechRegistryStorageKeys?.dashboardStatusEndpoints || "devtwist:status-endpoints";
const storage = globalThis.TechRegistryStorage;
const DASHBOARD_TASKS_KEY = globalThis.TechRegistryStorageKeys?.taskHandlerEvents || "task-handler-events";

const $favoriteWidgetsEl = $("#favorite-widgets");
const $favoriteButtons = $(".favorite-toggle");

const getFavorites = () => {
	return storage?.getJson(FAVORITES_KEY, []) || [];
};

const setFavorites = (favorites) => {
	storage?.setJson(FAVORITES_KEY, favorites);
};

const renderFavorites = () => {
	const favorites = getFavorites();
	$favoriteButtons.each(function() {
		const $btn = $(this);
		const widget = $btn.data("widget");
		const isFavorite = favorites.includes(widget);
		$btn.text(isFavorite ? "Favorited" : "Favorite");
		$btn.toggleClass("btn-warning", isFavorite);
		$btn.toggleClass("btn-outline-warning", !isFavorite);
	});

	if (!$favoriteWidgetsEl.length) return;
	$favoriteWidgetsEl.empty();
	if (favorites.length === 0) {
		$favoriteWidgetsEl.html('<span class="text-body-secondary">No favorites selected yet.</span>');
		return;
	}

	favorites.forEach((widget) => {
		const $anchor = $('<a>');
		$anchor.addClass("badge text-bg-warning text-decoration-none p-2");
		$anchor.attr("href", `#widget-${widget}`);
		$anchor.text(widget.replace("-", " ").replace(/\b\w/g, (match) => match.toUpperCase()));
		$favoriteWidgetsEl.append($anchor);
	});
};

$(function() {
$favoriteButtons.on("click", function() {
		const widget = $(this).data("widget");
		const favorites = getFavorites();
		const next = favorites.includes(widget)
			? favorites.filter((item) => item !== widget)
			: [...favorites, widget];
		setFavorites(next);
		renderFavorites();
	});

	initDashboardWidgets();
});
 
const $clockLocalEl = $("#clock-local");
const $clockUtcEl = $("#clock-utc");
const $clockUnixEl = $("#clock-unix");
const tickClock = () => {
	const now = new Date();
	if ($clockLocalEl.length) $clockLocalEl.text(now.toLocaleString());
	if ($clockUtcEl.length) $clockUtcEl.text(now.toUTCString());
	if ($clockUnixEl.length) $clockUnixEl.text(Math.floor(now.getTime() / 1000).toString());
};
tickClock();
setInterval(tickClock, 1000);

const $calendarTitleEl = $("#calendar-title");
const $calendarGridEl = $("#calendar-grid");
const $calendarDateEl = $("#calendar-date");
const renderCalendar = (date) => {
	if (!$calendarGridEl.length || !$calendarTitleEl.length) return;
	const year = date.getFullYear();
	const month = date.getMonth();
	$calendarTitleEl.text(date.toLocaleString(undefined, { month: "long", year: "numeric" }));
	const firstDay = new Date(year, month, 1).getDay();
	const daysInMonth = new Date(year, month + 1, 0).getDate();

	let table = '<table class="table table-bordered table-sm text-center mb-0"><thead><tr>';
	const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	weekDays.forEach((day) => {
		table += `<th>${day}</th>`;
	});
	table += "</tr></thead><tbody><tr>";

	let cell = 0;
	for (; cell < firstDay; cell += 1) table += "<td></td>";
	for (let day = 1; day <= daysInMonth; day += 1) {
		if (cell % 7 === 0 && cell !== 0) table += "</tr><tr>";
		table += `<td>${day}</td>`;
		cell += 1;
	}
	while (cell % 7 !== 0) {
		table += "<td></td>";
		cell += 1;
	}
	table += "</tr></tbody></table>";
	$calendarGridEl.html(table);
};

const now = new Date();
if ($calendarDateEl.length) {
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	$calendarDateEl.val(`${year}-${month}-${day}`);
	$calendarDateEl.on("change", function() {
		renderCalendar(new Date(`${$(this).val()}T00:00:00`));
	});
}
// Typing test: computes WPM and accuracy
function initTypingTest() {
	const targetEl = document.getElementById('typing-text');
	const inputEl = document.getElementById('typing-input');
	const statsEl = document.getElementById('typing-stats');
	const sampleSelect = document.getElementById('typing-sample-select');
	if (!targetEl || !inputEl || !statsEl) return;

	const samples = [
		'The quick brown fox jumps over the lazy dog.',
		'Clean code is easier to change when each function has one clear job and names explain the intent.',
		'Today we shipped a smoother dashboard with faster filters, better previews, and fewer clicks for repeated tasks.',
		'Focus on the current paragraph, keep your hands relaxed, and let steady rhythm matter more than raw speed.',
		'Typing practice works best when the sample is long enough to reveal habits. Watch punctuation, capitalization, and spaces between words while keeping a calm pace through the whole passage.',
	];
	let startedAt = null;

	function resetTest(nextSample) {
		if (typeof nextSample === 'string') targetEl.textContent = nextSample;
		inputEl.value = '';
		startedAt = null;
		computeStats();
	}

	function computeStats() {
		const target = targetEl.textContent || '';
		const typed = inputEl.value || '';
		const typedLen = typed.length;
		let correct = 0;
		for (let i = 0; i < typedLen; i++) if (typed[i] === target[i]) correct++;
		const accuracy = typedLen === 0 ? 0 : Math.round((correct / typedLen) * 100);
		const elapsedMin = startedAt ? Math.max((Date.now() - startedAt) / 60000, 1/60) : 1/60;
		const wpm = Math.round((correct / 5) / elapsedMin);
		statsEl.textContent = `WPM: ${isFinite(wpm) ? wpm : 0} | Acc: ${accuracy}%`;
	}

	inputEl.addEventListener('input', () => {
		if (!startedAt && inputEl.value.length > 0) startedAt = Date.now();
		computeStats();
	});

	inputEl.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			resetTest();
		}
	});

	if (sampleSelect) {
		sampleSelect.addEventListener('change', () => {
			const sampleIndex = Number.parseInt(sampleSelect.value, 10);
			resetTest(samples[sampleIndex] || samples[0]);
		});
		resetTest(samples[Number.parseInt(sampleSelect.value, 10)] || samples[0]);
	}

	// reset when text changes externally
	const observer = new MutationObserver(() => {
		inputEl.value = '';
		startedAt = null;
		computeStats();
	});
	observer.observe(targetEl, { childList: true, characterData: true, subtree: true });
}

// Sudoku widget wiring
function initSudokuWidget() {
	if (typeof Sudoku === 'undefined') {
		const statusEl = document.getElementById('sudoku-status');
		if (statusEl) {
			statusEl.textContent = 'Sudoku library not loaded.';
			statusEl.className = 'alert alert-danger py-2 small border-secondary';
		} else {
			console.error('Sudoku library not loaded.');
		}
		return;
	}
	const boardEl = document.getElementById('sudoku-board');
	const resetBtn = document.getElementById('sudoku-reset');
	const validateBtn = document.getElementById('sudoku-validate');
	const showBtn = document.getElementById('sudoku-show');
	const statusEl = document.getElementById('sudoku-status');
	if (!boardEl || !resetBtn || !validateBtn) return;

	let current = null;

	function setStatus(msg, type) {
		if (!statusEl) return;
		statusEl.textContent = msg;
		statusEl.className = type ? `alert alert-${type} py-2 small border-secondary` : 'alert alert-dark py-2 small border-secondary';
	}

	function renderPuzzle(p) {
		boardEl.innerHTML = '';
		boardEl.style.maxWidth = '340px';
		boardEl.style.width = '100%';
		Sudoku.render(boardEl, p);
	}

	function enableControls({ canValidate = false, canShow = false } = {}) {
		resetBtn.disabled = false;
		validateBtn.disabled = !canValidate;
		if (showBtn) showBtn.disabled = !canShow;
	}

	function generateNew() {
		setStatus('Generating puzzle...', 'info');
		setTimeout(() => {
			const generated = Sudoku.generate(40);
			current = generated;
			renderPuzzle(generated.puzzle);
			setStatus('Puzzle ready. Fill the blanks and Validate.', null);
			enableControls({ canValidate: true, canShow: true });
		}, 50);
	}

	resetBtn.addEventListener('click', () => generateNew());

	validateBtn.addEventListener('click', () => {
		if (!current) return setStatus('Start a puzzle first.', 'warning');
		const grid = Sudoku.getGrid(boardEl);
		// check filled
		for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (!grid[r][c]) return setStatus('Puzzle incomplete.', 'warning');
		const ok = Sudoku.validate(grid, current.solution);
		if (ok) {
			setStatus('Correct! Well done.', 'success');
			if (globalThis.appToast) globalThis.appToast('Sudoku solved!', 'success');
		} else {
			setStatus('Some entries are incorrect. Keep trying.', 'danger');
		}
	});

	if (showBtn) {
		showBtn.addEventListener('click', () => {
			if (!current) return setStatus('Start a puzzle first.', 'warning');
			renderPuzzle(current.solution);
			setStatus('Solution shown.', 'info');
			// after showing solution, validation is trivially true
			enableControls({ canValidate: true, canShow: false });
		});
	}

	enableControls({ canValidate: false, canShow: false });
	generateNew();
}
renderCalendar(now);

const $githubUserEl = $("#github-username");
const $githubLoadEl = $("#github-load");
const $githubGraphEl = $("#github-graph");
const setGithubGraph = (username) => {
	if (!$githubGraphEl.length || !username) return;
	$githubGraphEl.attr("src", `https://ghchart.rshah.org/${encodeURIComponent(username)}`);
};
if ($githubLoadEl.length && $githubUserEl.length) {
	$githubLoadEl.on("click", () => setGithubGraph($githubUserEl.val().trim()));
	$githubUserEl.val("octocat");
	setGithubGraph("octocat");
}

const loadTimerHistory = () => {
	return storage?.getJson(TIMER_HISTORY_KEY, []) || [];
};

const saveTimerHistory = (history) => {
	storage?.setJson(TIMER_HISTORY_KEY, history.slice(0, 20));
};

const formatDuration = (seconds) => {
	const safeSeconds = Math.max(0, Math.floor(seconds));
	const hrs = String(Math.floor(safeSeconds / 3600)).padStart(2, "0");
	const mins = String(Math.floor((safeSeconds % 3600) / 60)).padStart(2, "0");
	const secs = String(safeSeconds % 60).padStart(2, "0");
	return `${hrs}:${mins}:${secs}`;
};

const weatherCityEl = document.querySelector("#weather-city");
const weatherLoadEl = document.querySelector("#weather-load");
const weatherResultEl = document.querySelector("#weather-result");

const loadWeather = async (city) => {
	if (!weatherResultEl || !city) return;
	weatherResultEl.textContent = "Loading weather...";
	const $result = $("#weather-result");
	if (!$result.length || !city) return;
	$result.html('<div class="p-4 text-muted small"><div class="spinner-border spinner-border-sm me-2"></div>Fetching...</div>');
	try {
		const geoResponse = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
		);
		const geoData = await geoResponse.json();
		const location = geoData?.results?.[0];
		if (!location) {
			weatherResultEl.textContent = "Location not found.";
			$result.html('<div class="p-4 text-warning small">Location not found.</div>');
			return;
		}

		const weatherResponse = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`,
		);
		const weatherData = await weatherResponse.json();
		const current = weatherData?.current;
		if (!current) {
			weatherResultEl.textContent = "Weather data unavailable.";
			return;
		}

		weatherResultEl.innerHTML = `
			<div><strong>${location.name}, ${location.country}</strong></div>
			<div>Temperature: ${current.temperature_2m}${weatherData.current_units.temperature_2m}</div>
			<div>Feels Like: ${current.apparent_temperature}${weatherData.current_units.apparent_temperature}</div>
			<div>Humidity: ${current.relative_humidity_2m}${weatherData.current_units.relative_humidity_2m}</div>
			<div>Wind: ${current.wind_speed_10m} ${weatherData.current_units.wind_speed_10m}</div>
			<div>Weather Code: ${current.weather_code}</div>
		`;
		
		const units = weatherData.current_units;
		$result.html(`
			<div class="px-3 py-2 text-start">
				<div class="fw-bold text-dark mb-0">${location.name}</div>
				<div class="text-muted mb-2" style="font-size: 0.7rem;">${location.country}</div>
				<div class="row g-1 small">
					<div class="col-6 text-muted">Temp: <span class="text-dark fw-bold">${current.temperature_2m}${units.temperature_2m}</span></div>
					<div class="col-6 text-muted">Feels: <span class="text-dark fw-bold">${current.apparent_temperature}${units.apparent_temperature}</span></div>
					<div class="col-6 text-muted">Wind: <span class="text-dark fw-bold">${current.wind_speed_10m}${units.wind_speed_10m}</span></div>
					<div class="col-6 text-muted">Humid: <span class="text-dark fw-bold">${current.relative_humidity_2m}${units.relative_humidity_2m}</span></div>
				</div>
			</div>
		`);
	} catch {
		weatherResultEl.textContent = "Unable to load weather right now.";
		$result.html('<div class="p-4 text-danger small">Weather service unavailable.</div>');
	}
};

if (weatherLoadEl && weatherCityEl) {
	weatherLoadEl.addEventListener("click", () => loadWeather(weatherCityEl.value.trim()));
	weatherCityEl.value = "Bengaluru";
	loadWeather("Bengaluru");
}

const $statusEndpointEl = $("#status-endpoint");
const $statusAddEl = $("#status-add");
const $statusCheckEl = $("#status-check");
const $statusListEl = $("#status-list");

const getStatusEndpoints = () => {
	const saved = storage?.getJson(STATUS_ENDPOINTS_KEY, []);
	if (Array.isArray(saved) && saved.length > 0) {
		return saved;
	}
	return [
		"https://www.githubstatus.com/api/v2/status.json",
		"https://www.cloudflarestatus.com/api/v2/status.json",
	];
};

const setStatusEndpoints = (endpoints) => {
	storage?.setJson(STATUS_ENDPOINTS_KEY, endpoints.slice(0, 15));
};

const renderStatusList = (items) => {
	if (!$statusListEl.length) return;
	$statusListEl.empty();
	items.forEach((item) => {
		const $listItem = $('<li>');
		$listItem.addClass("list-group-item d-flex justify-content-between align-items-center");
		const badgeClass =
			item.status === "Up" ? "text-bg-success" : item.status === "Degraded" ? "text-bg-warning" : "text-bg-danger";
		$listItem.html(`
			<span class="text-truncate me-2">${item.url}</span>
			<span class="badge ${badgeClass}">${item.status}${item.ms ? ` (${item.ms} ms)` : ""}</span>
		`);
		$statusListEl.append($listItem);
	});
};

const checkStatus = async () => {
	const endpoints = getStatusEndpoints();
	const results = [];
	for (const url of endpoints) {
		const start = performance.now();
		try {
			const response = await fetch(url, { method: "GET" });
			const ms = Math.round(performance.now() - start);
			results.push({
				url,
				status: response.ok ? "Up" : "Degraded",
				ms,
			});
		} catch {
			results.push({
				url,
				status: "Down",
				ms: undefined,
			});
		}
	}
	renderStatusList(results);
};

if ($statusAddEl.length && $statusEndpointEl.length) {
	$statusAddEl.on("click", () => {
		const value = $statusEndpointEl.val().trim();
		if (!value) return;
		const endpoints = getStatusEndpoints();
		if (!endpoints.includes(value)) {
			endpoints.push(value);
			setStatusEndpoints(endpoints);
			$statusEndpointEl.val("");
			checkStatus();
		}
	});
}

if ($statusCheckEl.length) {
	$statusCheckEl.on("click", checkStatus);
}

renderFavorites();
checkStatus();

/** Dashboard Widget Logic (Migrated from index.astro) **/

function initDashboardWidgets() {
	updateWorldClocks();
	setInterval(updateWorldClocks, 1000);

	loadWeatherWidgetScript();
	fetchDailyQuote();
	fetchTwitterTrends();
	initRedditTags();
	renderDashboardTasks();
	initTodaySummary();
	initWeatherSearch();
	initDoodle();
	initTypingTest();
	initSudokuWidget();
	if (typeof Sudoku === 'undefined') {
		const statusEl = document.getElementById('sudoku-status');
		if (statusEl) {
			statusEl.textContent = 'Sudoku library not loaded.';
			statusEl.className = 'alert alert-danger py-2 small border-secondary';
		} else {
			console.error('Sudoku library not loaded.');
		}
		return;
	}
	initCountdownTimer();
}

async function initTodaySummary() {
	const dayEl = document.getElementById('dash-today-day');
	const dateStrEl = document.getElementById('dash-today-date-str');
	const eventsEl = document.getElementById('dash-today-events');
	
	if (!dayEl || !dateStrEl || !eventsEl) return;

	const now = new Date();
	dayEl.textContent = now.getDate();
	dateStrEl.textContent = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

	const year = now.getFullYear();
	const todayStr = now.toISOString().split('T')[0];
	
	try {
		const url = `https://corsproxy.io/?${encodeURIComponent(`https://date.nager.at/api/v3/PublicHolidays/${year}/IN`)}`;
		const resp = await fetch(url);
		const holidays = await resp.json();
		const todayHoliday = holidays.find(h => h.date === todayStr);
		
		if (todayHoliday) {
			eventsEl.innerHTML = `
				<div class="badge bg-warning text-dark mb-2 p-2 px-3">
					<i class="fas fa-star me-1"></i> Special Today
				</div>
				<h6 class="fw-bold mb-1">${todayHoliday.name}</h6>
				<p class="small opacity-75 mb-0">${todayHoliday.localName}</p>
			`;
		} else {
			eventsEl.innerHTML = `<p class="small opacity-75 mb-0">No public holidays today.</p>`;
		}
	} catch (e) { eventsEl.innerHTML = `<p class="small text-danger mb-0">Events unavailable.</p>`; }
}

function loadWeatherWidgetScript() {
	const el = document.getElementById('ww_eb276cd9717e9');
	if (!el) return;

	// Set the required configuration attributes dynamically
	el.setAttribute('v', '1.3');
	el.setAttribute('loc', 'auto');
	el.setAttribute('a', '{"t":"horizontal","lang":"en","sl_lpl":1,"ids":["wl635"],"font":"Arial","sl_ics":"one_a","sl_sot":"celsius","cl_bkg":"image","cl_font":"#FFFFFF","cl_cloud":"#FFFFFF","cl_persp":"#81D4FA","cl_sun":"#FFC107","cl_moon":"#FFC107","cl_thund":"#FF5722"}');

	const script = document.createElement('script');
	script.src = "https://app3.weatherwidget.org/js/?id=ww_eb276cd9717e9";
	script.async = true;
	document.body.appendChild(script);
}

function initWeatherSearch() {
	const $city = $("#weather-city");
	const $load = $("#weather-load");
	if (!$city.length || !$load.length) return;

	$load.on("click", () => loadWeather($city.val().trim()));
	$city.on("keypress", (e) => { if(e.which == 13) loadWeather($city.val().trim()); });
	
	// Trigger initial load
	loadWeather($city.val() || "Bengaluru");
}

function updateWorldClocks() {
	updateAnalogClock('india', 'Asia/Kolkata');
	updateAnalogClock('us', 'America/New_York');
	updateAnalogClock('uk', 'Europe/London');
}

function updateAnalogClock(id, timeZone) {
	const now = new Date();
	const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
	
	const seconds = tzDate.getSeconds();
	const minutes = tzDate.getMinutes();
	const hours = tzDate.getHours();

	const secDegree = (seconds / 60) * 360;
	const minDegree = (minutes / 60) * 360 + (seconds / 60) * 6;
	const hourDegree = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;

	const el = document.getElementById(`analog-clock-${id}`);
	if (!el) return;

	const hourHand = el.querySelector('.hour');
	const minHand = el.querySelector('.minute');
	const secHand = el.querySelector('.second');

	if (hourHand) hourHand.style.transform = `translateX(-50%) rotate(${hourDegree}deg)`;
	if (minHand) minHand.style.transform = `translateX(-50%) rotate(${minDegree}deg)`;
	if (secHand) secHand.style.transform = `translateX(-50%) rotate(${secDegree}deg)`;
}

async function fetchDailyQuote() {
	const quoteText = document.getElementById('quote-text');
	const quoteAuthor = document.getElementById('quote-author');
	if (!quoteText) return;

	const proxyUrl = `https://corsproxy.io/?${encodeURIComponent('https://zenquotes.io/api/random')}`;
	try {
		const resp = await fetch(proxyUrl);
		const quote = (await resp.json())[0];
		quoteText.textContent = `"${quote.q}"`;
		if (quoteAuthor) quoteAuthor.textContent = `- ${quote.a}`;
	} catch (e) { console.error("Quote fetch failed", e); }
}

async function fetchTwitterTrends() {
	const el = document.getElementById('twitter-trends');
	if (!el) return;
	try {
		const trends = [
			{ name: "#OpenAI", category: "Technology • Trending", count: "125K" },
			{ name: "TypeScript 5.4", category: "Programming • Trending", count: "42K" },
			{ name: "#AstroBuild", category: "Web Development", count: "12K" },
			{ name: "X-API", category: "Business", count: "89K" },
			{ name: "#TailwindCSS", category: "Design", count: "25K" },
			{ name: "React 19", category: "Technology", count: "67K" },
			{ name: "#CyberSecurity", category: "Tech", count: "110K" },
			{ name: "Rust", category: "Programming", count: "33K" }
		];
		
		el.innerHTML = trends.map(trend => `
			<a href="https://twitter.com/search?q=${encodeURIComponent(trend.name)}" target="_blank" class="list-group-item news-item py-2 px-4 text-decoration-none">
				<div class="fw-bold mb-0 small">${trend.name}</div>
			</a>
		`).join('');
	} catch (e) {
		el.innerHTML = '<div class="p-4 text-danger small">Failed to load Twitter trends.</div>';
	}
}

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function normalizeRedditTag(value) {
	return String(value || '')
		.trim()
		.replace(/^\/?r\//i, '')
		.replace(/[^a-z0-9_]/gi, '')
		.slice(0, 50);
}

function setRedditTitle(tag) {
	const titleEl = document.getElementById('reddit-title');
	if (titleEl) titleEl.textContent = `r/${tag} Top Stories`;
}

async function fetchReddit(tag = 'technology') {
	const el = document.getElementById('reddit-news');
	if (!el) return;
	const subreddit = normalizeRedditTag(tag) || 'technology';
	setRedditTitle(subreddit);
	el.innerHTML = '<div class="p-5 text-center"><div class="spinner-border spinner-border-sm text-secondary"></div></div>';
	try {
		const url = `https://corsproxy.io/?${encodeURIComponent(`https://www.reddit.com/r/${subreddit}/top.json?limit=8`)}`;
		const resp = await fetch(url);
		const json = await resp.json();
		if (json.data?.children?.length) {
			el.innerHTML = json.data.children.map(p => `
				<a href="https://reddit.com${p.data.permalink}" target="_blank" class="list-group-item news-item py-3 px-4 text-decoration-none">
					<div class="fw-bold mb-0 small">${escapeHtml(p.data.title)}</div>
				</a>
			`).join('');
		} else {
			el.innerHTML = `<div class="p-4 text-muted small">No top stories found for r/${escapeHtml(subreddit)}.</div>`;
		}
	} catch (e) { if (el) el.innerHTML = `<div class="p-4 text-danger small">Failed to fetch r/${escapeHtml(subreddit)}.</div>`; }
}

function initRedditTags() {
	const selectEl = document.getElementById('reddit-tag-select');
	const searchEl = document.getElementById('reddit-tag-search');
	const loadEl = document.getElementById('reddit-tag-load');

	const loadTag = (rawTag) => {
		const tag = normalizeRedditTag(rawTag);
		if (!tag) return;
		if (searchEl) searchEl.value = tag;
		if (selectEl && [...selectEl.options].some(option => option.value.toLowerCase() === tag.toLowerCase())) {
			selectEl.value = [...selectEl.options].find(option => option.value.toLowerCase() === tag.toLowerCase()).value;
		}
		fetchReddit(tag);
	};

	if (selectEl) {
		selectEl.addEventListener('change', () => loadTag(selectEl.value));
	}
	if (loadEl && searchEl) {
		loadEl.addEventListener('click', () => loadTag(searchEl.value));
		searchEl.addEventListener('keydown', (event) => {
			if (event.key === 'Enter') loadTag(searchEl.value);
		});
	}

	loadTag(selectEl?.value || 'technology');
}

function renderDashboardTasks() {
	const el = document.getElementById('dash-tasks');
	const countEl = document.getElementById('dash-task-count');
	if (!el) return;

	const tasks = storage?.getJson(DASHBOARD_TASKS_KEY, []) || [];
	if (countEl) countEl.textContent = tasks.length;

	if (tasks.length > 0) {
		el.innerHTML = tasks.slice(0, 5).map(t => `
			<li class="list-group-item border-0 border-bottom py-3 px-4">
				<div class="d-flex align-items-center">
					<div class="me-3" style="width: 4px; height: 24px; background-color: ${t.color}; border-radius: 2px;"></div>
					<div class="flex-grow-1">
						<div class="fw-bold small text-dark">${t.title}</div>
						<div class="text-muted" style="font-size: 0.7rem;">${t.startDate} ${t.startTime || ''}</div>
					</div>
					<i class="fa-solid fa-chevron-right text-light"></i>
				</div>
			</li>
		`).join('');
	}
}

function initDoodle() {
	const canvas = document.getElementById('doodlePad');
	const colorInput = document.getElementById('doodleColor');
	const clearBtn = document.getElementById('clearDoodle');
	const saveBtn = document.getElementById('saveDoodle');
	const sizeInput = document.getElementById('doodleSize');
	const sizeLabel = document.getElementById('doodleSizeLabel');
	const paletteBtns = document.querySelectorAll('.doodle-palette-btn');

	if (!canvas) return;

	let lastWidth = 0;
	let lastHeight = 0;

	const signaturePad = new SignaturePad(canvas, {
		minWidth: 1,
		maxWidth: 2.5,
		penColor: colorInput ? colorInput.value : '#222222',
		backgroundColor: '#ffffff'
	});

	const resizeCanvas = () => {
		const width = canvas.offsetWidth;
		const height = canvas.offsetHeight;
		
		if (width === 0 || height === 0 || (width === lastWidth && height === lastHeight)) return;
		
		lastWidth = width;
		lastHeight = height;

		const ratio = Math.max(window.devicePixelRatio || 1, 1);
		canvas.width = width * ratio;
		canvas.height = height * ratio;
		canvas.getContext("2d").scale(ratio, ratio);
		signaturePad.clear(); // Applies the background color and clears internal state
	};

	window.addEventListener("resize", resizeCanvas);
	resizeCanvas();

	if (colorInput) {
		colorInput.oninput = () => signaturePad.penColor = colorInput.value;
	}

	paletteBtns.forEach(btn => {
		btn.addEventListener('click', () => {
			const color = btn.getAttribute('data-color');
			signaturePad.penColor = color;
			if (colorInput) colorInput.value = color;
		});
	});

	if (clearBtn) clearBtn.onclick = () => signaturePad.clear();

	if (sizeInput) {
		sizeInput.oninput = () => {
			const val = parseFloat(sizeInput.value);
			signaturePad.minWidth = val * 0.5;
			signaturePad.maxWidth = val * 1.5;
			if (sizeLabel) sizeLabel.textContent = `${val}px`;
		};
	}

	if (saveBtn) {
		saveBtn.onclick = () => {
			if (signaturePad.isEmpty()) {
				if (globalThis.appToast) globalThis.appToast("Please draw something first!", "warning");
				else alert("Please draw something first!");
				return;
			}
			const dataURL = signaturePad.toDataURL("image/png");
			const link = document.createElement('a');
			link.download = `doodle-${Date.now()}.png`;
			link.href = dataURL;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		};
	}
}
function initCountdownTimer() {
	const display = document.getElementById('timer-display');
	const startBtn = document.getElementById('startTimer');
	const pauseBtn = document.getElementById('pauseTimer');
	const resetBtn = document.getElementById('resetTimer');
	const modeSelect = document.getElementById('timer-mode');
	const minutesInput = document.getElementById('timer-minutes');
	const helperText = document.getElementById('timer-helper-text');
	const statusText = document.getElementById('timer-status');
	const modeBadge = document.getElementById('timer-mode-badge');
	const presetButtons = document.querySelectorAll('.timer-preset');

	if (!display || !startBtn || !resetBtn || !modeSelect || !minutesInput) return;

	const modeConfig = {
		stopwatch: {
			label: 'Stopwatch',
			helper: 'Tracks elapsed time from zero.',
			start(seconds) {
				return seconds > 0 ? seconds : 0;
			},
			tick(seconds) {
				return seconds + 1;
			},
			done() {
				return false;
			},
			status(seconds, running) {
				if (running) return `Running ${formatDuration(seconds)}`;
				return seconds > 0 ? `Paused at ${formatDuration(seconds)}` : 'Ready';
			},
		},
		countup: {
			label: 'Count Up',
			helper: 'Counts upward toward your target minutes.',
			start(seconds) {
				return seconds > 0 ? seconds : 0;
			},
			tick(seconds) {
				return seconds + 1;
			},
			done(seconds, targetSeconds) {
				return targetSeconds > 0 && seconds >= targetSeconds;
			},
			status(seconds, running, targetSeconds) {
				if (!targetSeconds) return running ? `Running ${formatDuration(seconds)}` : 'Set a target to use count up.';
				if (seconds >= targetSeconds) return `Target reached: ${formatDuration(targetSeconds)}`;
				if (running) return `${formatDuration(seconds)} of ${formatDuration(targetSeconds)}`;
				return seconds > 0 ? `Paused at ${formatDuration(seconds)}` : `Target ${formatDuration(targetSeconds)}`;
			},
		},
		countdown: {
			label: 'Countdown',
			helper: 'Counts down from the selected number of minutes.',
			start(seconds, targetSeconds) {
				return seconds > 0 ? seconds : targetSeconds;
			},
			tick(seconds) {
				return Math.max(0, seconds - 1);
			},
			done(seconds) {
				return seconds <= 0;
			},
			status(seconds, running, targetSeconds) {
				if (!targetSeconds) return 'Enter minutes to begin.';
				if (seconds <= 0 && !running) return 'Countdown complete';
				if (running) return `${formatDuration(seconds)} remaining`;
				return seconds < targetSeconds ? `Paused with ${formatDuration(seconds)} left` : `Ready for ${formatDuration(targetSeconds)}`;
			},
		},
		pomodoro: {
			label: 'Pomodoro',
			helper: 'A focused 25 minute countdown by default. Presets work too.',
			start(seconds, targetSeconds) {
				return seconds > 0 ? seconds : targetSeconds;
			},
			tick(seconds) {
				return Math.max(0, seconds - 1);
			},
			done(seconds) {
				return seconds <= 0;
			},
			status(seconds, running, targetSeconds) {
				if (!targetSeconds) return 'Pomodoro needs a duration.';
				if (seconds <= 0 && !running) return 'Pomodoro complete. Take a break.';
				if (running) return `Focus: ${formatDuration(seconds)} left`;
				return seconds < targetSeconds ? `Paused with ${formatDuration(seconds)} left` : `Ready for a ${Math.round(targetSeconds / 60)} min session`;
			},
		},
	};

	const timerState = {
		mode: modeSelect.value || 'stopwatch',
		seconds: 0,
		targetSeconds: 25 * 60,
		interval: null,
	};

	const updateMinutesInput = () => {
		if (timerState.mode === 'pomodoro' && !minutesInput.value) {
			minutesInput.value = '25';
		}
	};

	const getTargetSeconds = () => {
		const parsed = Number.parseInt(minutesInput.value, 10);
		const safeMinutes = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
		return safeMinutes * 60;
	};

	const setRunningState = (running) => {
		startBtn.textContent = running ? 'Running' : timerState.seconds > 0 ? 'Resume' : 'Start';
		startBtn.disabled = running;
		if (pauseBtn) pauseBtn.disabled = !running;
	};

	const persistHistoryEntry = () => {
		const history = loadTimerHistory();
		history.unshift({
			task: modeConfig[timerState.mode].label,
			duration: formatDuration(timerState.mode === 'countdown' || timerState.mode === 'pomodoro'
				? timerState.targetSeconds
				: timerState.seconds),
			completedAt: new Date().toLocaleString(),
		});
		saveTimerHistory(history);
	};

	const renderTimerState = () => {
		const config = modeConfig[timerState.mode];
		timerState.targetSeconds = getTargetSeconds();
		display.textContent = formatDuration(timerState.seconds);
		if (helperText) helperText.textContent = config.helper;
		if (statusText) statusText.textContent = config.status(timerState.seconds, Boolean(timerState.interval), timerState.targetSeconds);
		if (modeBadge) modeBadge.textContent = config.label;
		updateMinutesInput();
	};

	const stopTimer = (completed = false) => {
		if (timerState.interval) {
			clearInterval(timerState.interval);
			timerState.interval = null;
		}
		if (completed) {
			persistHistoryEntry();
			if (globalThis.appToast) {
				globalThis.appToast(`${modeConfig[timerState.mode].label} finished.`, 'success');
			}
		}
		setRunningState(false);
		renderTimerState();
	};

	const resetTimer = () => {
		stopTimer(false);
		timerState.targetSeconds = getTargetSeconds();
		if (timerState.mode === 'countdown' || timerState.mode === 'pomodoro') {
			timerState.seconds = timerState.targetSeconds;
		} else {
			timerState.seconds = 0;
		}
		renderTimerState();
	};

	const startTimer = () => {
		if (timerState.interval) return;
		timerState.targetSeconds = getTargetSeconds();
		if (timerState.mode !== 'stopwatch' && timerState.targetSeconds <= 0) {
			if (statusText) statusText.textContent = 'Enter minutes to begin.';
			return;
		}
		const config = modeConfig[timerState.mode];
		timerState.seconds = config.start(timerState.seconds, timerState.targetSeconds);
		setRunningState(true);
		renderTimerState();
		timerState.interval = setInterval(() => {
			timerState.seconds = config.tick(timerState.seconds, timerState.targetSeconds);
			if (config.done(timerState.seconds, timerState.targetSeconds)) {
				stopTimer(true);
				return;
			}
			renderTimerState();
		}, 1000);
	};

	modeSelect.addEventListener('change', () => {
		stopTimer(false);
		timerState.mode = modeSelect.value;
		if (timerState.mode === 'pomodoro' && (!minutesInput.value || Number.parseInt(minutesInput.value, 10) <= 0)) {
			minutesInput.value = '25';
		}
		resetTimer();
	});

	minutesInput.addEventListener('input', () => {
		if (timerState.interval) return;
		resetTimer();
	});

	presetButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const minutes = button.getAttribute('data-minutes');
			if (!minutes) return;
			minutesInput.value = minutes;
			if (!timerState.interval) resetTimer();
		});
	});

	startBtn.addEventListener('click', startTimer);
	if (pauseBtn) {
		pauseBtn.addEventListener('click', () => stopTimer(false));
	}
	resetBtn.addEventListener('click', resetTimer);

	resetTimer();
}
