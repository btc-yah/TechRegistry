(function () {
	const LEGACY_STORAGE_KEYS = {
		"techregistry:sidebar-expanded": ["techregistry.sidebar.expanded"],
		"techregistry:task-handler-events": ["task-handler-events"],
		"techregistry:api-testing-history": ["techregistry-api-testing-history"],
		"techregistry:notes": ["notes"],
		"techregistry:game-2048-best": ["techregistry-2048-best"],
		"techregistry:dashboard-favorites": ["devtwist:favorites"],
		"techregistry:dashboard-timer-history": ["devtwist:timer-history"],
		"techregistry:dashboard-status-endpoints": ["devtwist:status-endpoints"],
	};

	function getStorage() {
		try {
			return globalThis.localStorage;
		} catch {
			return null;
		}
	}

	function getString(key, fallback = "") {
		const storage = getStorage();
		if (!storage) return fallback;

		try {
			const value = storage.getItem(key);
			return value === null ? fallback : value;
		} catch {
			return fallback;
		}
	}

	function setString(key, value) {
		const storage = getStorage();
		if (!storage) return false;

		try {
			storage.setItem(key, String(value));
			return true;
		} catch {
			return false;
		}
	}

	function getJson(key, fallback) {
		const raw = getString(key, "__techregistry_storage_missing__");
		if (raw === "__techregistry_storage_missing__") return fallback;

		try {
			return JSON.parse(raw);
		} catch {
			return fallback;
		}
	}

	function setJson(key, value) {
		return setString(key, JSON.stringify(value));
	}

	function remove(key) {
		const storage = getStorage();
		if (!storage) return false;

		try {
			storage.removeItem(key);
			return true;
		} catch {
			return false;
		}
	}

	function migrateLegacyKeys() {
		const storage = getStorage();
		if (!storage) return;

		try {
			for (const [nextKey, legacyKeys] of Object.entries(LEGACY_STORAGE_KEYS)) {
				if (storage.getItem(nextKey) !== null) continue;

				for (const legacyKey of legacyKeys) {
					const legacyValue = storage.getItem(legacyKey);
					if (legacyValue === null) continue;

					storage.setItem(nextKey, legacyValue);
					storage.removeItem(legacyKey);
					break;
				}
			}
		} catch {
			// Ignore migration failures and keep runtime storage helpers available.
		}
	}

	migrateLegacyKeys();

	globalThis.TechRegistryStorage = Object.freeze({
		getString,
		setString,
		getJson,
		setJson,
		remove,
	});
})();
