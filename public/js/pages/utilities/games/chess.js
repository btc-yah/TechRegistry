import { Chess } from 'https://unpkg.com/chess.js@1.4.0/dist/esm/chess.js';

const boardElement = document.getElementById('chessBoard');
const loadingState = document.getElementById('chessLoadingState');
const statusMessage = document.getElementById('chessStatusMessage');
const stateBadge = document.getElementById('chessStateBadge');
const turnLabel = document.getElementById('chessTurnLabel');
const orientationLabel = document.getElementById('chessOrientationLabel');
const moveCountLabel = document.getElementById('chessMoveCount');
const lastMoveLabel = document.getElementById('chessLastMove');
const movesList = document.getElementById('chessMoves');
const newGameButton = document.getElementById('chessNewGame');
const undoButton = document.getElementById('chessUndoMove');
const flipButton = document.getElementById('chessFlipBoard');
const openingButton = document.getElementById('chessLoadOpening');
const modeSelect = document.getElementById('chessModeSelect');
const sideSelect = document.getElementById('chessSideSelect');
const difficultySelect = document.getElementById('chessDifficultySelect');
const applySettingsButton = document.getElementById('chessApplySettings');
const modeSummary = document.getElementById('chessModeSummary');

const boardAssetsBase =
	'https://unpkg.com/@chrisoakman/chessboardjs@1.0.0/dist';
const pieceThemeBase = 'https://chessboardjs.com/img/chesspieces/wikipedia';

const openingLines = [
	{
		name: 'Ruy Lopez',
		moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'],
	},
	{
		name: 'Queen\'s Gambit',
		moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
	},
	{
		name: 'English Opening',
		moves: ['c4', 'e5', 'Nc3', 'Nf6', 'g3', 'd5'],
	},
];

let game = null;
let board = null;
let currentOrientation = 'white';
let gameMode = 'local';
let playerSide = 'white';
let aiStyle = 'balanced';
let aiMoveTimer = null;

const loadCss = (href) =>
	new Promise((resolve, reject) => {
		const existingLink = document.querySelector(`link[data-techregistry-href="${href}"]`);
		if (existingLink) {
			resolve();
			return;
		}

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = href;
		link.dataset.techregistryHref = href;
		link.onload = () => resolve();
		link.onerror = () => reject(new Error(`Unable to load stylesheet: ${href}`));
		document.head.appendChild(link);
	});

const loadScript = (src) =>
	new Promise((resolve, reject) => {
		const existingScript = document.querySelector(`script[data-techregistry-src="${src}"]`);
		if (existingScript) {
			if (existingScript.dataset.loaded === 'true') {
				resolve();
				return;
			}

			existingScript.addEventListener('load', () => resolve(), { once: true });
			existingScript.addEventListener(
				'error',
				() => reject(new Error(`Unable to load script: ${src}`)),
				{ once: true }
			);
			return;
		}

		const script = document.createElement('script');
		script.src = src;
		script.async = true;
		script.dataset.techregistrySrc = src;
		script.onload = () => {
			script.dataset.loaded = 'true';
			resolve();
		};
		script.onerror = () => reject(new Error(`Unable to load script: ${src}`));
		document.head.appendChild(script);
	});

const setLoadingVisible = (isVisible) => {
	loadingState?.classList.toggle('is-hidden', !isVisible);
};

const setStatus = (message) => {
	if (statusMessage) {
		statusMessage.textContent = message;
	}
};

const setStateBadge = (message) => {
	if (stateBadge) {
		stateBadge.textContent = message;
	}
};

const toSideLabel = (side) => (side === 'b' ? 'Black' : 'White');

const updateMoveHistory = () => {
	if (!movesList || !game) {
		return;
	}

	const history = game.history();
	movesList.innerHTML = '';

	if (!history.length) {
		const emptyState = document.createElement('li');
		emptyState.textContent = 'No moves yet.';
		movesList.appendChild(emptyState);
		return;
	}

	for (let index = 0; index < history.length; index += 2) {
		const item = document.createElement('li');
		const moveNumber = Math.floor(index / 2) + 1;
		const whiteMove = history[index];
		const blackMove = history[index + 1];
		item.textContent = `${moveNumber}. ${whiteMove}${blackMove ? ` ${blackMove}` : ''}`;
		movesList.appendChild(item);
	}
};

const updateFacts = () => {
	if (!game) {
		return;
	}

	const turn = toSideLabel(game.turn());
	const history = game.history({ verbose: true });
	const lastMove = history.at(-1);

	if (turnLabel) {
		turnLabel.textContent = turn;
	}

	if (orientationLabel) {
		orientationLabel.textContent =
			currentOrientation.charAt(0).toUpperCase() + currentOrientation.slice(1);
	}

	if (moveCountLabel) {
		moveCountLabel.textContent = `${history.length}`;
	}

	if (lastMoveLabel) {
		lastMoveLabel.textContent = lastMove ? lastMove.san : 'None';
	}
};

const updateStatus = () => {
	if (!game) {
		return;
	}

	if (game.isCheckmate()) {
		const winner = game.turn() === 'w' ? 'Black' : 'White';
		setStateBadge('Checkmate');
		setStatus(`Checkmate. ${winner} wins the game.`);
		return;
	}

	if (game.isDraw()) {
		let drawReason = 'Draw';
		if (game.isStalemate()) {
			drawReason = 'Stalemate';
		} else if (game.isThreefoldRepetition()) {
			drawReason = 'Threefold repetition';
		} else if (game.isInsufficientMaterial()) {
			drawReason = 'Insufficient material';
		}

		setStateBadge(drawReason);
		setStatus(`${drawReason}. Start a new game or load another opening.`);
		return;
	}

	if (game.isCheck()) {
		setStateBadge('Check');
		setStatus(`${toSideLabel(game.turn())} is in check.`);
		return;
	}

	setStateBadge(game.history().length < 8 ? 'Opening' : 'In Progress');
	setStatus(`${toSideLabel(game.turn())} to move. Drag a piece to continue.`);
};

const clearAiTimer = () => {
	if (aiMoveTimer) {
		window.clearTimeout(aiMoveTimer);
		aiMoveTimer = null;
	}
};

const updateModeSummary = () => {
	if (!modeSummary) {
		return;
	}

	if (gameMode === 'local') {
		modeSummary.textContent = 'Local two-player mode is active.';
		return;
	}

	const styleLabel = aiStyle === 'chaos' ? 'fast random' : 'balanced';
	modeSummary.textContent = `You are ${playerSide}. Computer AI is active with a ${styleLabel} style.`;
};

const getAiCandidateMoves = () => {
	if (!game) {
		return [];
	}

	const moves = game.moves({ verbose: true });
	if (aiStyle === 'chaos') {
		return moves;
	}

	const pieceScore = {
		p: 1,
		n: 3,
		b: 3,
		r: 5,
		q: 9,
		k: 100,
	};

	return [...moves].sort((left, right) => {
		const leftCapture = left.captured ? (pieceScore[left.captured] ?? 0) : 0;
		const rightCapture = right.captured ? (pieceScore[right.captured] ?? 0) : 0;
		const leftScore = leftCapture + (left.promotion ? 7 : 0) + (left.san.includes('+') ? 0.5 : 0);
		const rightScore = rightCapture + (right.promotion ? 7 : 0) + (right.san.includes('+') ? 0.5 : 0);
		return rightScore - leftScore;
	});
};

const playAiMoveIfNeeded = () => {
	if (!game || !board || gameMode !== 'ai' || game.isGameOver()) {
		return;
	}

	const aiTurn = playerSide === 'white' ? 'b' : 'w';
	if (game.turn() !== aiTurn) {
		return;
	}

	clearAiTimer();
	setStatus('Computer is thinking...');

	aiMoveTimer = window.setTimeout(() => {
		const candidates = getAiCandidateMoves();
		if (!candidates.length) {
			syncBoard();
			return;
		}

		const move =
			aiStyle === 'chaos'
				? candidates[Math.floor(Math.random() * candidates.length)]
				: candidates.find((candidate) => candidate.captured || candidate.san.includes('+')) ??
					candidates[0];

		game.move({
			from: move.from,
			to: move.to,
			promotion: move.promotion || 'q',
		});

		syncBoard();
		setStatus(`Computer played ${move.san}. ${toSideLabel(game.turn())} to move.`);
		aiMoveTimer = null;
	}, 450);
};

const syncBoard = () => {
	if (!game || !board) {
		return;
	}

	board.position(game.fen(), false);
	updateFacts();
	updateMoveHistory();
	updateStatus();
	updateModeSummary();
};

const resetGame = () => {
	if (!game) {
		return;
	}

	clearAiTimer();
	game.reset();
	syncBoard();
	playAiMoveIfNeeded();
};

const undoMove = () => {
	if (!game) {
		return;
	}

	clearAiTimer();
	let removedMove = game.undo();
	if (!removedMove) {
		setStatus('There is no move to undo yet.');
		return;
	}

	if (gameMode === 'ai' && game.history().length > 0) {
		const secondRemovedMove = game.undo();
		if (secondRemovedMove) {
			removedMove = secondRemovedMove;
		}
	}

	syncBoard();
	setStatus(`Undid ${removedMove.san}. ${toSideLabel(game.turn())} to move.`);
};

const flipBoard = () => {
	if (!board) {
		return;
	}

	board.flip();
	currentOrientation = currentOrientation === 'white' ? 'black' : 'white';
	updateFacts();
	setStatus(`Board flipped. ${currentOrientation === 'white' ? 'White' : 'Black'} is now at the bottom.`);
};

const loadOpening = () => {
	if (!game) {
		return;
	}

	clearAiTimer();
	const opening = openingLines[Math.floor(Math.random() * openingLines.length)];
	game.reset();

	for (const move of opening.moves) {
		game.move(move);
	}

	syncBoard();
	setStateBadge(opening.name);
	setStatus(`${opening.name} loaded. ${toSideLabel(game.turn())} to move.`);
	playAiMoveIfNeeded();
};

const applySettings = () => {
	gameMode = modeSelect?.value || 'local';
	playerSide = sideSelect?.value || 'white';
	aiStyle = difficultySelect?.value || 'balanced';
	currentOrientation = playerSide;

	if (board) {
		board.orientation(currentOrientation);
	}

	syncBoard();
	setStatus(
		gameMode === 'ai'
			? `Computer game ready. You are playing as ${playerSide}.`
			: 'Local two-player mode is active.'
	);
	playAiMoveIfNeeded();
};

const initializeBoard = () => {
	const ChessboardConstructor = window.Chessboard;

	if (!ChessboardConstructor || !boardElement) {
		throw new Error('Chess libraries are not available.');
	}

	game = new Chess();
	board = ChessboardConstructor('chessBoard', {
		draggable: true,
		dropOffBoard: 'snapback',
		position: 'start',
		orientation: currentOrientation,
		pieceTheme: `${pieceThemeBase}/{piece}.png`,
		onDragStart: (source, piece) => {
			if (!game || game.isGameOver()) {
				return false;
			}

			if (gameMode === 'ai') {
				const playerTurn = playerSide === 'white' ? 'w' : 'b';
				if (game.turn() !== playerTurn) {
					return false;
				}
			}

			if ((game.turn() === 'w' && piece.startsWith('b')) || (game.turn() === 'b' && piece.startsWith('w'))) {
				return false;
			}

			return true;
		},
		onDrop: (source, target) => {
			if (!game) {
				return 'snapback';
			}

			const move = game.move({
				from: source,
				to: target,
				promotion: 'q',
			});

			if (!move) {
				return 'snapback';
			}

			syncBoard();
			playAiMoveIfNeeded();
			return undefined;
		},
		onSnapEnd: () => {
			if (board && game) {
				board.position(game.fen(), false);
			}
		},
	});

	syncBoard();
	setLoadingVisible(false);
	window.addEventListener('resize', () => {
		if (board) {
			board.resize();
		}
	});
};

const bindEvents = () => {
	newGameButton?.addEventListener('click', resetGame);
	undoButton?.addEventListener('click', undoMove);
	flipButton?.addEventListener('click', flipBoard);
	openingButton?.addEventListener('click', loadOpening);
	applySettingsButton?.addEventListener('click', applySettings);
};

const boot = async () => {
	setLoadingVisible(true);
	setStatus('Loading chess libraries...');
	bindEvents();

	try {
		await loadCss(`${boardAssetsBase}/chessboard-1.0.0.min.css`);
		await loadScript(`${boardAssetsBase}/chessboard-1.0.0.min.js`);
		initializeBoard();
	} catch (error) {
		setLoadingVisible(false);
		setStateBadge('Load Error');
		setStatus('The chess board could not load. Please refresh the page and try again.');
		if (boardElement) {
			boardElement.innerHTML =
				'<div class="alert alert-danger mb-0">Unable to load the chess UI resources right now.</div>';
		}
	}
};

boot();
