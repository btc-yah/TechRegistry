(function () {
	const COPY_SELECTOR = ".js-clipboard-copy";
	const FEEDBACK_RESET_MS = 1800;

	function resolveCopyText(trigger) {
		const explicitText = trigger.getAttribute("data-clipboard-text");
		if (explicitText) {
			return explicitText;
		}

		const sourceSelector = trigger.getAttribute("data-copy-from");
		if (!sourceSelector) {
			return "";
		}

		const sourceElement = document.querySelector(sourceSelector);
		if (!sourceElement) {
			return "";
		}

		if ("value" in sourceElement) {
			return sourceElement.value || "";
		}

		return sourceElement.textContent || "";
	}

	function setClipboardFeedback(trigger, copied) {
		const successLabel = trigger.getAttribute("data-copy-success") || "Copied";
		const errorLabel = trigger.getAttribute("data-copy-error") || "Copy failed";
		const statusSelector = trigger.getAttribute("data-copy-status-target");
		const statusElement = statusSelector ? document.querySelector(statusSelector) : null;

		if (!trigger.dataset.originalLabel) {
			trigger.dataset.originalLabel = trigger.innerHTML;
		}

		trigger.innerHTML = copied
			? `<i class="fa-solid fa-check me-1"></i>${successLabel}`
			: `<i class="fa-solid fa-triangle-exclamation me-1"></i>${errorLabel}`;

		trigger.classList.toggle("btn-outline-success", copied);
		trigger.classList.toggle("btn-outline-danger", !copied);
		trigger.classList.remove("btn-outline-info");

		if (statusElement) {
			statusElement.textContent = copied
				? trigger.getAttribute("data-copy-status-success") || "Copied to clipboard."
				: trigger.getAttribute("data-copy-status-error") || "Copy failed. Please try again.";
			statusElement.className = copied ? "tool-status is-success" : "tool-status is-error";
		}

		window.clearTimeout(Number(trigger.dataset.feedbackTimer || 0));
		trigger.dataset.feedbackTimer = String(
			window.setTimeout(() => {
				trigger.innerHTML = trigger.dataset.originalLabel || trigger.innerHTML;
				trigger.classList.remove("btn-outline-success", "btn-outline-danger");
				if (trigger.classList.contains("tool-toolbar-copy")) {
					trigger.classList.add("btn-outline-info");
				}
				if (statusElement) {
					statusElement.textContent = "";
					statusElement.className = "tool-status";
				}
			}, FEEDBACK_RESET_MS),
		);
	}

	function initClipboard() {
		const ClipboardCtor = window.ClipboardJS;
		if (!ClipboardCtor) {
			return;
		}

		if (window.techRegistryClipboard) {
			window.techRegistryClipboard.destroy();
		}

		window.techRegistryClipboard = new ClipboardCtor(COPY_SELECTOR, {
			text(trigger) {
				return resolveCopyText(trigger).trim();
			},
		});

		window.techRegistryClipboard.on("success", (event) => {
			setClipboardFeedback(event.trigger, true);
			event.clearSelection();
		});

		window.techRegistryClipboard.on("error", (event) => {
			setClipboardFeedback(event.trigger, false);
		});
	}

	function bootSite() {
		initClipboard();
	}

	window.TechRegistrySite = {
		initClipboard,
		boot: bootSite,
	};

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", bootSite, { once: true });
	} else {
		bootSite();
	}
})();
