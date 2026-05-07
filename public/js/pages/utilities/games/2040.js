(function ($) {
	let board = [];
	let score = 0;
	const bestScoreStorageKey = globalThis.TechRegistryStorageKeys?.game2048Best || "techregistry-2048-best";
	const storage = globalThis.TechRegistryStorage;
	let best = loadBestScore();
	let touchStartX = 0;
	let touchStartY = 0;

	function loadBestScore() {
		const storedBest = Number(storage?.getString(bestScoreStorageKey, "0"));
		return Number.isFinite(storedBest) && storedBest > 0 ? storedBest : 0;
	}

	function persistBestScore() {
		storage?.setString(bestScoreStorageKey, best);
	}

	function clearBestScore() {
		best = 0;

		storage?.remove(bestScoreStorageKey);

		$("#best").text(best);
	}

	function initGame() {
		board = Array.from({ length: 4 }, function () {
			return Array(4).fill(0);
		});
		score = 0;
		best = loadBestScore();
		addRandom();
		addRandom();
		render();
	}

	function addRandom() {
		const empty = [];

		for (let r = 0; r < 4; r += 1) {
			for (let c = 0; c < 4; c += 1) {
				if (board[r][c] === 0) {
					empty.push({ r: r, c: c });
				}
			}
		}

		if (!empty.length) {
			return;
		}

		const nextCell = empty[Math.floor(Math.random() * empty.length)];
		board[nextCell.r][nextCell.c] = Math.random() > 0.9 ? 4 : 2;
	}

	function render() {
		const $board = $("#board");
		$board.empty();

		board.forEach(function (row) {
			row.forEach(function (cell) {
				const $cell = $('<div class="cell"></div>');

				if (cell !== 0) {
					$cell.append(
						$("<div></div>", {
							class: "tile tile-" + cell,
							text: cell,
						})
					);
				}

				$board.append($cell);
			});
		});

		if (score > best) {
			best = score;
			persistBestScore();
		}

		$("#score").text(score);
		$("#best").text(best);
	}

	function slide(row) {
		let compactRow = row.filter(function (value) {
			return value !== 0;
		});

		for (let i = 0; i < compactRow.length - 1; i += 1) {
			if (compactRow[i] === compactRow[i + 1]) {
				compactRow[i] *= 2;
				score += compactRow[i];
				compactRow[i + 1] = 0;
			}
		}

		compactRow = compactRow.filter(function (value) {
			return value !== 0;
		});

		while (compactRow.length < 4) {
			compactRow.push(0);
		}

		return compactRow;
	}

	function rotate() {
		const nextBoard = Array.from({ length: 4 }, function () {
			return Array(4).fill(0);
		});

		for (let r = 0; r < 4; r += 1) {
			for (let c = 0; c < 4; c += 1) {
				nextBoard[c][3 - r] = board[r][c];
			}
		}

		board = nextBoard;
	}

	function moveLeft() {
		const previousBoard = JSON.stringify(board);
		board = board.map(function (row) {
			return slide(row);
		});

		if (JSON.stringify(board) !== previousBoard) {
			addRandom();
			return true;
		}

		return false;
	}

	function moveRight() {
		rotate();
		rotate();
		const moved = moveLeft();
		rotate();
		rotate();
		return moved;
	}

	function moveUp() {
		rotate();
		rotate();
		rotate();
		const moved = moveLeft();
		rotate();
		return moved;
	}

	function moveDown() {
		rotate();
		const moved = moveLeft();
		rotate();
		rotate();
		rotate();
		return moved;
	}

	function handleMove(direction) {
		let moved = false;

		switch (direction) {
			case "left":
				moved = moveLeft();
				break;
			case "right":
				moved = moveRight();
				break;
			case "up":
				moved = moveUp();
				break;
			case "down":
				moved = moveDown();
				break;
			default:
				return;
		}

		if (moved) {
			render();
		}
	}

	$(function () {
		$(document).on("click", "#game2048Restart", function () {
			initGame();
		});

		$(document).on("click", "#game2048ClearBest", function () {
			clearBestScore();
		});

		$(document).on("keydown", function (event) {
			const keyMap = {
				ArrowLeft: "left",
				ArrowRight: "right",
				ArrowUp: "up",
				ArrowDown: "down",
			};

			const direction = keyMap[event.key];

			if (!direction) {
				return;
			}

			event.preventDefault();
			handleMove(direction);
		});

		$(document).on("touchstart", "#board", function (event) {
			const touch = event.originalEvent.touches[0];
			touchStartX = touch.clientX;
			touchStartY = touch.clientY;
		});

		$(document).on("touchend", "#board", function (event) {
			const touch = event.originalEvent.changedTouches[0];
			const deltaX = touch.clientX - touchStartX;
			const deltaY = touch.clientY - touchStartY;

			if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) {
				return;
			}

			if (Math.abs(deltaX) > Math.abs(deltaY)) {
				handleMove(deltaX > 0 ? "right" : "left");
				return;
			}

			handleMove(deltaY > 0 ? "down" : "up");
		});

		window.initGame = initGame;
		initGame();
	});
})(jQuery);
