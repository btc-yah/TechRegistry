const STORAGE_KEY = globalThis.TechRegistryStorageKeys?.apiTestingHistory || "techregistry-api-testing-history";
const HISTORY_LIMIT = 16;
const METHODS_WITH_BODY = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const storage = globalThis.TechRegistryStorage;

const state = {
  abortController: null,
  lastRequest: null,
  lastResponse: null
};

const $method = $("#method");
const $url = $("#url");
const $sendBtn = $("#sendBtn");
const $cancelBtn = $("#cancelBtn");
const $loadSampleBtn = $("#loadSampleBtn");
const $clearFormBtn = $("#clearFormBtn");
const $copyCurlBtn = $("#copyCurlBtn");
const $copyResponseBtn = $("#copyResponseBtn");
const $paramsTable = $("#paramsTable");
const $headersTable = $("#headersTable");
const $addParamBtn = $("#addParamBtn");
const $addHeaderBtn = $("#addHeaderBtn");
const $bodyType = $("#bodyType");
const $body = $("#body");
const $bodyPanel = $("#bodyPanel");
const $status = $("#status");
const $statusCode = $("#statusCode");
const $responseTime = $("#responseTime");
const $responseSize = $("#responseSize");
const $responseType = $("#responseType");
const $responseSummary = $(".api-response-summary");
const $responseBody = $("#responseBody");
const $responseRaw = $("#responseRaw");
const $responseHeaders = $("#responseHeaders");
const $historyList = $("#historyList");
const $historyEmpty = $("#historyEmpty");
const $historyCount = $("#historyCount");
const $clearHistoryBtn = $("#clearHistoryBtn");

const sampleRequest = {
  method: "GET",
  url: "https://jsonplaceholder.typicode.com/posts/1",
  params: [],
  headers: [{ enabled: true, key: "Accept", value: "application/json" }],
  bodyType: "json",
  body: ""
};

function getHistory() {
  const parsed = storage?.getJson(STORAGE_KEY, []);
  return Array.isArray(parsed) ? parsed : [];
}

function saveHistory(items) {
  storage?.setJson(STORAGE_KEY, items.slice(0, HISTORY_LIMIT));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return entities[char] || char;
  });
}

function truncate(value, maxLength) {
  const text = String(value || "");
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown time" : date.toLocaleString();
}

function byteSize(value) {
  return new Blob([value || ""]).size;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function rowTemplate(type, row = {}) {
  return `
    <tr data-row="${type}">
      <td class="api-check-cell">
        <input class="form-check-input" type="checkbox" data-field="enabled" ${row.enabled === false ? "" : "checked"} aria-label="Enable row" />
      </td>
      <td>
        <input class="form-control form-control-sm font-monospace" data-field="key" value="${escapeHtml(row.key || "")}" placeholder="${type === "params" ? "Query key" : "Header name"}" />
      </td>
      <td>
        <input class="form-control form-control-sm font-monospace" data-field="value" value="${escapeHtml(row.value || "")}" placeholder="${type === "params" ? "Query value" : "Header value"}" />
      </td>
      <td class="api-action-cell">
        <button type="button" class="btn btn-sm btn-outline-secondary api-icon-btn" data-remove-row title="Remove row" aria-label="Remove row">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </td>
    </tr>
  `;
}

function ensureTrailingEmptyRow($table, type) {
  if (!$table.find("tbody tr").length) {
    $table.find("tbody").append(rowTemplate(type));
  }
}

function readRows($table) {
  return $table.find("tbody tr").toArray().map((row) => {
    const $row = $(row);
    return {
      enabled: $row.find('[data-field="enabled"]').prop("checked"),
      key: $row.find('[data-field="key"]').val().trim(),
      value: $row.find('[data-field="value"]').val()
    };
  }).filter((row) => row.key || row.value);
}

function writeRows($table, type, rows) {
  const $body = $table.find("tbody");
  $body.empty();
  (Array.isArray(rows) && rows.length ? rows : [{}]).forEach((row) => {
    $body.append(rowTemplate(type, row));
  });
}

function buildUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  params.filter((param) => param.enabled && param.key).forEach((param) => {
    url.searchParams.set(param.key, param.value || "");
  });
  return url.toString();
}

function buildHeaders(headers) {
  const result = {};
  headers.filter((header) => header.enabled && header.key).forEach((header) => {
    result[header.key] = header.value || "";
  });
  return result;
}

function normalizeRequestFromForm() {
  const method = String($method.val() || "GET").toUpperCase();
  return {
    method,
    url: String($url.val() || "").trim(),
    params: readRows($paramsTable),
    headers: readRows($headersTable),
    bodyType: String($bodyType.val() || "none"),
    body: String($body.val() || "")
  };
}

function setRequestForm(request) {
  $method.val(request.method || "GET");
  $url.val(request.url || "");
  writeRows($paramsTable, "params", request.params || []);
  writeRows($headersTable, "headers", request.headers || []);
  $bodyType.val(request.bodyType || "json");
  $body.val(request.body || "");
  syncBodyState();
}

function setBusy(isBusy) {
  $sendBtn.prop("disabled", isBusy);
  $cancelBtn.toggleClass("d-none", !isBusy).prop("disabled", !isBusy);
  $sendBtn.html(isBusy ? '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Sending' : '<i class="fa-solid fa-paper-plane me-2"></i>Send');
}

function setStatus(message, type = "info") {
  const classes = {
    info: "alert-info",
    success: "alert-success",
    danger: "alert-danger",
    warning: "alert-warning"
  };
  $status.removeClass("d-none alert-info alert-success alert-danger alert-warning").addClass(classes[type] || classes.info).text(message);
}

function resetResponse() {
  $status.addClass("d-none").text("");
  $responseSummary.removeClass("is-success is-danger");
  $statusCode.text("-");
  $responseTime.text("-");
  $responseSize.text("-");
  $responseType.text("-");
  $responseBody.val("");
  $responseRaw.val("");
  $responseHeaders.val("");
}

function formatBody(rawBody, contentType) {
  if (!rawBody) return { pretty: "", kind: contentType || "empty" };

  try {
    return { pretty: JSON.stringify(JSON.parse(rawBody), null, 2), kind: "JSON" };
  } catch {
    if ((contentType || "").includes("html")) {
      return { pretty: rawBody, kind: "HTML" };
    }
    if ((contentType || "").includes("xml")) {
      return { pretty: rawBody, kind: "XML" };
    }
    return { pretty: rawBody, kind: "Text" };
  }
}

function responseHeaderText(response) {
  return Array.from(response.headers.entries()).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function requestToCurl(request) {
  let targetUrl = request.url;
  try {
    targetUrl = buildUrl(request.url, request.params || []);
  } catch {
    targetUrl = request.url;
  }

  const parts = [`curl -X ${request.method}`, `"${targetUrl.replace(/"/g, '\\"')}"`];
  request.headers?.filter((header) => header.enabled && header.key).forEach((header) => {
    parts.push(`-H "${header.key.replace(/"/g, '\\"')}: ${String(header.value || "").replace(/"/g, '\\"')}"`);
  });
  if (METHODS_WITH_BODY.has(request.method) && request.bodyType !== "none" && request.body) {
    parts.push(`--data '${request.body.replace(/'/g, "'\\''")}'`);
  }
  return parts.join(" \\\n  ");
}

function renderHistory() {
  const items = getHistory();
  $historyCount.text(`${items.length} request${items.length === 1 ? "" : "s"}`);
  $historyEmpty.toggleClass("d-none", items.length > 0);
  $historyList.empty();

  items.forEach((item, index) => {
    const statusClass = item.error ? "text-bg-danger" : item.ok ? "text-bg-success" : "text-bg-warning";
    const statusText = item.error ? "Failed" : item.statusCode ? `${item.statusCode}` : "Pending";

    $historyList.append(`
      <button type="button" class="api-history-item" data-history-item="${index}">
        <span class="badge text-bg-primary">${escapeHtml(item.method || "GET")}</span>
        <span class="api-history-url">${escapeHtml(truncate(item.url || "Untitled request", 64))}</span>
        <span class="badge ${statusClass}">${escapeHtml(statusText)}</span>
        <span class="api-history-time">${escapeHtml(formatTimestamp(item.timestamp))}</span>
      </button>
    `);
  });
}

function addHistoryEntry(entry) {
  const items = getHistory();
  items.unshift(entry);
  saveHistory(items);
  renderHistory();
}

function loadHistoryItem(index) {
  const item = getHistory()[index];
  if (!item) return;
  setRequestForm(item.request || item);
  state.lastResponse = item;

  $statusCode.text(item.error ? "Error" : item.statusCode ? `${item.statusCode} ${item.statusText || ""}`.trim() : "-");
  $responseTime.text(item.durationMs ? `${item.durationMs} ms` : "-");
  $responseSize.text(item.responseSize ? formatBytes(item.responseSize) : "-");
  $responseType.text(item.responseKind || "-");
  $responseBody.val(item.prettyResponseBody || item.responseBody || "");
  $responseRaw.val(item.rawResponseBody || item.responseBody || "");
  $responseHeaders.val(item.responseHeaders || "");

  if (item.error) {
    setStatus(`Error: ${item.error}`, "danger");
  } else if (item.statusCode) {
    setStatus(`Status: ${item.statusCode} ${item.statusText || ""}`.trim(), item.ok ? "success" : "danger");
  }
}

function syncBodyState() {
  const method = String($method.val() || "GET").toUpperCase();
  const bodyType = String($bodyType.val() || "none");
  const disabled = !METHODS_WITH_BODY.has(method) || bodyType === "none";
  $bodyPanel.toggleClass("is-disabled", disabled);
  $body.prop("disabled", disabled);
}

function clearForm() {
  setRequestForm({
    method: "GET",
    url: "",
    params: [],
    headers: [{ enabled: true, key: "Accept", value: "application/json" }],
    bodyType: "json",
    body: ""
  });
  resetResponse();
}

async function copyText(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    globalThis.appToast?.(successMessage, "success");
  } catch {
    globalThis.appToast?.("Could not copy to clipboard.", "error");
  }
}

async function sendRequest() {
  const request = normalizeRequestFromForm();
  state.lastRequest = request;

  if (!request.url) {
    setStatus("Enter an endpoint URL before sending the request.", "warning");
    $url.trigger("focus");
    return;
  }

  let finalUrl;
  try {
    finalUrl = buildUrl(request.url, request.params);
  } catch {
    setStatus("Enter a valid absolute URL, such as https://api.example.com/items.", "warning");
    return;
  }

  const headers = buildHeaders(request.headers);
  const options = { method: request.method, headers };

  if (METHODS_WITH_BODY.has(request.method) && request.bodyType !== "none" && request.body.trim()) {
    options.body = request.body;
    if (request.bodyType === "json" && !Object.keys(headers).some((key) => key.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }
  }

  resetResponse();
  setBusy(true);
  setStatus("Sending request...", "info");
  state.abortController = new AbortController();
  options.signal = state.abortController.signal;
  const start = performance.now();

  try {
    const response = await fetch(finalUrl, options);
    const rawBody = await response.text();
    const durationMs = Math.round(performance.now() - start);
    const contentType = response.headers.get("content-type") || "";
    const formatted = formatBody(rawBody, contentType);
    const headersText = responseHeaderText(response);
    const responseSize = byteSize(rawBody);

    $statusCode.text(`${response.status} ${response.statusText}`.trim());
    $responseSummary.toggleClass("is-success", response.ok).toggleClass("is-danger", !response.ok);
    $responseTime.text(`${durationMs} ms`);
    $responseSize.text(formatBytes(responseSize));
    $responseType.text(formatted.kind);
    $responseBody.val(formatted.pretty);
    $responseRaw.val(rawBody);
    $responseHeaders.val(headersText);
    setStatus(`Status: ${response.status} ${response.statusText}`.trim(), response.ok ? "success" : "danger");

    const entry = {
      request,
      method: request.method,
      url: finalUrl,
      statusCode: response.status,
      statusText: response.statusText,
      ok: response.ok,
      durationMs,
      responseSize,
      responseBody: formatted.pretty,
      prettyResponseBody: formatted.pretty,
      rawResponseBody: rawBody,
      responseHeaders: headersText,
      responseKind: formatted.kind,
      timestamp: new Date().toISOString()
    };
    state.lastResponse = entry;
    addHistoryEntry(entry);
  } catch (error) {
    const message = error?.name === "AbortError" ? "Request cancelled." : error instanceof Error ? error.message : "Unknown request error";
    const durationMs = Math.round(performance.now() - start);

    $statusCode.text(error?.name === "AbortError" ? "Cancelled" : "Error");
    $responseSummary.removeClass("is-success").addClass("is-danger");
    $responseTime.text(`${durationMs} ms`);
    $responseSize.text("-");
    $responseType.text("Error");
    $responseBody.val(message);
    $responseRaw.val(message);
    $responseHeaders.val("");
    setStatus(message, error?.name === "AbortError" ? "warning" : "danger");

    const entry = {
      request,
      method: request.method,
      url: finalUrl,
      ok: false,
      error: message,
      durationMs,
      responseBody: message,
      prettyResponseBody: message,
      rawResponseBody: message,
      responseHeaders: "",
      responseKind: "Error",
      timestamp: new Date().toISOString()
    };
    state.lastResponse = entry;
    addHistoryEntry(entry);
  } finally {
    state.abortController = null;
    setBusy(false);
  }
}

$(function () {
  writeRows($paramsTable, "params", []);
  writeRows($headersTable, "headers", [{ enabled: true, key: "Accept", value: "application/json" }]);
  syncBodyState();
  renderHistory();

  $addParamBtn.on("click", () => $paramsTable.find("tbody").append(rowTemplate("params")));
  $addHeaderBtn.on("click", () => $headersTable.find("tbody").append(rowTemplate("headers")));

  $(document).on("click", "[data-remove-row]", (event) => {
    const $table = $(event.currentTarget).closest("table");
    const type = $table.is($paramsTable) ? "params" : "headers";
    $(event.currentTarget).closest("tr").remove();
    ensureTrailingEmptyRow($table, type);
  });

  $method.on("change", syncBodyState);
  $bodyType.on("change", syncBodyState);
  $url.on("keydown", (event) => {
    if (event.key === "Enter") sendRequest();
  });

  $sendBtn.on("click", sendRequest);
  $cancelBtn.on("click", () => state.abortController?.abort());
  $loadSampleBtn.on("click", () => {
    setRequestForm(sampleRequest);
    resetResponse();
  });
  $clearFormBtn.on("click", clearForm);
  $clearHistoryBtn.on("click", () => {
    storage?.remove(STORAGE_KEY);
    renderHistory();
  });
  $historyList.on("click", "[data-history-item]", (event) => {
    loadHistoryItem(Number($(event.currentTarget).data("historyItem")));
  });
  $copyCurlBtn.on("click", () => copyText(requestToCurl(normalizeRequestFromForm()), "cURL copied."));
  $copyResponseBtn.on("click", () => copyText($responseBody.val() || $responseRaw.val() || "", "Response copied."));
});
