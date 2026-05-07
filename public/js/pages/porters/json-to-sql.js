function notify(message, kind = "neutral") {
	globalThis.appToast?.(message, kind);
}

function safeJsonParse(text) {
	try {
		return { ok: true, data: JSON.parse(text) };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : "Invalid JSON." };
	}
}

function quoteIdentifier(value, dialect) {
	if (dialect === "ansi") return `"${value.replace(/"/g, "\"\"")}"`;
	if (dialect === "mysql") return `\`${value.replace(/`/g, "``")}\``;
	if (dialect === "sqlserver") return `[${value.replace(/]/g, "]]")}]`;
	return value;
}

function toSqlValue(value) {
	if (value === null || value === undefined) return "NULL";
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
	if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
	if (typeof value === "object") return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
	return `'${String(value).replace(/'/g, "''")}'`;
}

function buildRowPredicate(row, dialect, pretty) {
	const conditions = Object.entries(row).map(([key, value]) => {
		const column = quoteIdentifier(key, dialect);
		if (value === null || value === undefined) {
			return `${column} IS NULL`;
		}
		return `${column} = ${toSqlValue(value)}`;
	});

	if (!conditions.length) {
		throw new Error("Each JSON object must have at least one property.");
	}

	if (pretty && conditions.length > 1) {
		return `(\n    ${conditions.join("\n    AND ")}\n  )`;
	}

	return conditions.length > 1 ? `(${conditions.join(" AND ")})` : conditions[0];
}

function buildWhereClause(rows, dialect, pretty) {
	const predicates = rows.map((row) => buildRowPredicate(row, dialect, pretty));

	if (predicates.length === 1) {
		if (pretty) {
			return `WHERE\n  ${predicates[0]}`;
		}
		return `WHERE ${predicates[0]}`;
	}

	if (pretty) {
		return `WHERE\n  ${predicates.join("\n  OR\n  ")}`;
	}

	return `WHERE ${predicates.join(" OR ")}`;
}

function buildSqlFromJson(data, options) {
	const rows = Array.isArray(data) ? data : [data];
	const validRows = rows.filter((row) => row && typeof row === "object" && !Array.isArray(row));

	if (!validRows.length) {
		throw new Error("JSON must be an object or an array of objects.");
	}

	const columns = [...new Set(validRows.flatMap((row) => Object.keys(row)))];
	const quotedColumns = columns.map((column) => quoteIdentifier(column, options.dialect));
	const quotedTable = quoteIdentifier(options.tableName, options.dialect);
	const rowValues = validRows.map((row) => `(${columns.map((column) => toSqlValue(row[column])).join(", ")})`);

	if (options.mode === "select") {
		const whereClause = buildWhereClause(validRows, options.dialect, options.pretty);
		return options.pretty
			? `SELECT * FROM ${quotedTable}\n${whereClause};`
			: `SELECT * FROM ${quotedTable} ${whereClause};`;
	}

	if (options.mode === "delete") {
		const whereClause = buildWhereClause(validRows, options.dialect, options.pretty);
		return options.pretty
			? `DELETE FROM ${quotedTable}\n${whereClause};`
			: `DELETE FROM ${quotedTable} ${whereClause};`;
	}

	if (options.pretty) {
		const valuesBlock = rowValues.map((row) => `  ${row}`).join(",\n");
		const columnsBlock = options.includeColumns ? ` (${quotedColumns.join(", ")})` : "";
		return `INSERT INTO ${quotedTable}${columnsBlock}\nVALUES\n${valuesBlock};`;
	}

	const columnsBlock = options.includeColumns ? ` (${quotedColumns.join(", ")})` : "";
	return `INSERT INTO ${quotedTable}${columnsBlock} VALUES ${rowValues.join(", ")};`;
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return true;
	}
	return false;
}

const configElement = document.querySelector("[data-json-to-sql-config]");

if (configElement) {
	const $jsonInput = $("#json-input");
	const $output = $("#sql-output");
	const $tableNameInput = $("#table-name");
	const $sqlDialectInput = $("#sql-dialect");
	const $sqlModeInput = $("#sql-mode");
	const $prettySqlInput = $("#pretty-sql");
	const $includeColumnsInput = $("#include-columns");
	const $generateButton = $("#generate-sql");
	const $loadSampleButton = $("#load-sample");
	const $clearButton = $("#clear-input");
	const $copyButton = $("#copy-output");
	const sampleJson = decodeURIComponent(configElement.getAttribute("data-sample-json") ?? "");
	// const sampleSql = decodeURIComponent(configElement.getAttribute("data-sample-sql") ?? ""); // Not used

	function renderOutput(result) {
		$output.text(result);
	}

	function generate() {
		if (!$jsonInput.val().trim()) {
			$output.text("-- Paste JSON to generate SQL.");
			notify("Paste a JSON object or array of objects to generate SQL.", "error");
			return;
		}

		if (!$tableNameInput.val().trim()) {
			$output.text("-- Provide a table name to generate SQL.");
			notify("Enter a table name before generating SQL.", "error");
			return;
		}

		const parsed = safeJsonParse($jsonInput.val());
		if (!parsed.ok) {
			$output.text("-- Fix the JSON input and try again.");
			notify(parsed.error, "error");
			return;
		}

		try {
			const generated = buildSqlFromJson(parsed.data, {
				tableName: $tableNameInput.val().trim(),
				dialect: $sqlDialectInput.val(),
				mode: $sqlModeInput.val(),
				pretty: $prettySqlInput.prop("checked"),
				includeColumns: $includeColumnsInput.prop("checked"),
			});

			renderOutput(generated);
			notify(`${$sqlModeInput.val().toUpperCase()} SQL generated successfully.`, "success");
		} catch (error) {
			$output.text("-- JSON rows could not be converted to SQL.");
			notify(error instanceof Error ? error.message : "Unable to generate SQL.", "error");
		}
	}

	$loadSampleButton.on("click", () => {
		$jsonInput.val(sampleJson);
		generate();
		notify("Sample JSON loaded.", "neutral");
	});

	$clearButton.on("click", () => {
		$jsonInput.val("");
		$output.text("-- Your generated SQL will appear here.");
		notify("Editor cleared.", "neutral");
	});

	$copyButton.on("click", async () => {
		const ok = await copyText($output.text());
		notify(ok ? "Generated SQL copied to clipboard." : "Copy failed. Please copy manually.", ok ? "success" : "error");
	});

	$generateButton.on("click", generate);
	$tableNameInput.on("change", generate);
	$sqlDialectInput.on("change", generate);
	$sqlModeInput.on("change", generate);
	$prettySqlInput.on("change", generate);
	$includeColumnsInput.on("change", generate);

	$jsonInput.val(sampleJson);
	generate();
}
