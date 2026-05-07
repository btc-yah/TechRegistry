(function () {
	const keys = {
		sidebarExpanded: "techregistry:sidebar-expanded",
		taskHandlerEvents: "techregistry:task-handler-events",
		apiTestingHistory: "techregistry:api-testing-history",
		notes: "techregistry:notes",
		game2048Best: "techregistry:game-2048-best",
		dashboardFavorites: "techregistry:dashboard-favorites",
		dashboardTimerHistory: "techregistry:dashboard-timer-history",
		dashboardStatusEndpoints: "techregistry:dashboard-status-endpoints",
	};

	globalThis.TechRegistryStorageKeys = Object.freeze(keys);
})();
