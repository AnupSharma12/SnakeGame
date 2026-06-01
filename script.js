const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('scoreDisplay');
const difficultyEl = document.getElementById('difficulty');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const gameOverEl = document.getElementById('gameOver');
const pauseMenuEl = document.getElementById('pauseMenu');
const finalScoreEl = document.getElementById('finalScore');
const restartOverlayBtn = document.getElementById('restartOverlayBtn');
const resumeOverlayBtn = document.getElementById('resumeOverlayBtn');

const moveSound = new Audio('sound/move.mp3');
const eatSound = new Audio('sound/food.mp3');
const gameOverSound = new Audio('sound/gameover.mp3');

[moveSound, eatSound, gameOverSound].forEach(sound => {
	sound.preload = 'auto';
});

// Muted, low-saturation palette
const COLORS = {
	background: '#f8fafb',
	border: '#d1d5db',
	snake: '#4b5563',
	apple: '#7c6b6b',
	text: '#2b2e33'
};

const CELL_SIZE = 20;
const minTickMs = 60;
const speedStep = 6;

let snake = [];
let apple = { x: 0, y: 0 };
let score = 0;
let dir = { x: 1, y: 0 };
let animationFrameId = null;
let lastFrameTime = 0;
let accumulator = 0;
let tickMs = 200;
let baseTickMs = 200;
let isGameOver = false;
let isPaused = false;

function playSound(sound) {
	if (!sound) return;
	const clip = sound.cloneNode();
	clip.currentTime = 0;
	clip.play().catch(() => {});
}

function playMoveSound() {
	playSound(moveSound);
}

function playEatSound() {
	playSound(eatSound);
}

function playGameOverSound() {
	playSound(gameOverSound);
}

function resizeCanvas() {
	const dpr = window.devicePixelRatio || 1;
	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	canvas.width = Math.floor(width * dpr);
	canvas.height = Math.floor(height * dpr);
	ctx.resetTransform?.();
	ctx.scale(dpr, dpr);
}

function drawBackground() {
	ctx.fillStyle = COLORS.background;
	ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

	const width = canvas.clientWidth;
	const height = canvas.clientHeight;
	const vignette = ctx.createRadialGradient(width * 0.5, height * 0.38, Math.min(width, height) * 0.12, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
	vignette.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
	vignette.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
	vignette.addColorStop(1, 'rgba(15, 23, 42, 0.08)');
	ctx.fillStyle = vignette;
	ctx.fillRect(0, 0, width, height);

	const sheen = ctx.createLinearGradient(0, 0, width, height);
	sheen.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
	sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
	sheen.addColorStop(1, 'rgba(15, 23, 42, 0.05)');
	ctx.fillStyle = sheen;
	ctx.fillRect(0, 0, width, height);

	ctx.strokeStyle = COLORS.border;
	ctx.lineWidth = 1;
	ctx.strokeRect(0.5, 0.5, canvas.clientWidth - 1, canvas.clientHeight - 1);
}

function drawRectAtGrid(x, y, color) {
	ctx.fillStyle = color;
	ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1);
}

function drawCircleAtGrid(x, y, color) {
	const cx = x * CELL_SIZE + CELL_SIZE / 2;
	const cy = y * CELL_SIZE + CELL_SIZE / 2;
	const r = CELL_SIZE / 2 - 2;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
}

function getBoardSize() {
	return {
		cols: Math.floor(canvas.clientWidth / CELL_SIZE),
		rows: Math.floor(canvas.clientHeight / CELL_SIZE)
	};
}

function randomGridPosition(cols, rows) {
	return {
		x: Math.floor(Math.random() * cols),
		y: Math.floor(Math.random() * rows)
	};
}

function initSnake() {
	const { cols, rows } = getBoardSize();
	const cx = Math.floor(cols / 2);
	const cy = Math.floor(rows / 2);
	snake = [
		{ x: cx - 1, y: cy },
		{ x: cx, y: cy },
		{ x: cx + 1, y: cy }
	];
}

function placeApple() {
	const { cols, rows } = getBoardSize();
	let nextApple = randomGridPosition(cols, rows);

	while (snake.some(segment => segment.x === nextApple.x && segment.y === nextApple.y)) {
		nextApple = randomGridPosition(cols, rows);
	}

	apple = nextApple;
}

function drawSnake() {
	snake.forEach(segment => drawRectAtGrid(segment.x, segment.y, COLORS.snake));
}

function drawApple() {
	drawCircleAtGrid(apple.x, apple.y, COLORS.apple);
}

function updateScoreDisplay() {
	if (scoreEl) scoreEl.textContent = 'Score: ' + score;
}

function draw() {
	drawBackground();
	drawSnake();
	drawApple();
	updateScoreDisplay();
}

function isInsideBounds(position, cols, rows) {
	return position.x >= 0 && position.x < cols && position.y >= 0 && position.y < rows;
}

function updateTickMs() {
	tickMs = Math.max(minTickMs, baseTickMs - score * speedStep);
}

function updatePauseButton() {
	if (pauseBtn) pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
}

function showPauseMenu() {
	if (pauseMenuEl) pauseMenuEl.style.display = 'flex';
}

function hidePauseMenu() {
	if (pauseMenuEl) pauseMenuEl.style.display = 'none';
}

function hideGameOverMenu() {
	if (gameOverEl) gameOverEl.style.display = 'none';
}

function pauseGame() {
	if (isGameOver || isPaused) return;
	isPaused = true;
	updatePauseButton();
	showPauseMenu();
	stopLoop();
}

function resumeGame() {
	if (isGameOver || !isPaused) return;
	isPaused = false;
	updatePauseButton();
	hidePauseMenu();
	startLoop();
}

function togglePause() {
	if (isPaused) {
		resumeGame();
	} else {
		pauseGame();
	}
}

function init() {
	resizeCanvas();
	initSnake();
	placeApple();
	score = 0;
	isGameOver = false;
	isPaused = false;
	baseTickMs = difficultyEl ? Number(difficultyEl.value) || 200 : 200;
	updateTickMs();
	updatePauseButton();
	hidePauseMenu();
	hideGameOverMenu();
	draw();
	startLoop();
}

function resetGame() {
	hideGameOverMenu();
	hidePauseMenu();
	isGameOver = false;
	isPaused = false;
	dir = { x: 1, y: 0 };
	initSnake();
	placeApple();
	score = 0;
	baseTickMs = difficultyEl ? Number(difficultyEl.value) || baseTickMs : baseTickMs;
	updateTickMs();
	updatePauseButton();
	updateScoreDisplay();
	draw();
	startLoop();
}

function step() {
	const { cols, rows } = getBoardSize();
	const head = snake[snake.length - 1];
	const newHead = { x: head.x + dir.x, y: head.y + dir.y };
	const ateApple = newHead.x === apple.x && newHead.y === apple.y;

	if (!isInsideBounds(newHead, cols, rows)) {
		showGameOver();
		return;
	}

	const bodyToCheck = ateApple ? snake : snake.slice(0, -1);
	if (bodyToCheck.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
		showGameOver();
		return;
	}

	snake.push(newHead);
	if (!ateApple) {
		snake.shift();
	} else {
		score += 1;
		playEatSound();
		placeApple();
		updateScoreDisplay();
		updateTickMs();
	}

	draw();
}

function startLoop() {
	stopLoop();
	lastFrameTime = 0;
	accumulator = 0;
	animationFrameId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
}

function gameLoop(timestamp) {
	if (isPaused || isGameOver) {
		animationFrameId = null;
		return;
	}

	if (lastFrameTime === 0) {
		lastFrameTime = timestamp;
	}

	const delta = Math.min(timestamp - lastFrameTime, 100);
	lastFrameTime = timestamp;
	accumulator += delta;

	while (accumulator >= tickMs) {
		step();
		accumulator -= tickMs;
		if (animationFrameId === null || isPaused || isGameOver) return;
	}

	if (animationFrameId !== null) {
		animationFrameId = requestAnimationFrame(gameLoop);
	}
}

function setDirection(newDir) {
	if (newDir.x === -dir.x && newDir.y === -dir.y) return;
	if (newDir.x !== dir.x || newDir.y !== dir.y) {
		playMoveSound();
		dir = newDir;
	}
}

function showGameOver() {
	stopLoop();
	isGameOver = true;
	isPaused = false;
	updatePauseButton();
	hidePauseMenu();
	playGameOverSound();
	if (finalScoreEl) finalScoreEl.textContent = String(score);
	if (gameOverEl) gameOverEl.style.display = 'flex';
}

window.addEventListener('resize', () => {
	resizeCanvas();
	initSnake();
	placeApple();
	if (!isGameOver) {
		draw();
	}
});

document.addEventListener('visibilitychange', () => {
	if (document.hidden) {
		pauseGame();
	}
});

window.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') {
		togglePause();
		e.preventDefault();
		return;
	}

	if (isPaused || isGameOver) {
		return;
	}

	const key = e.key;
	if (key === 'ArrowUp' || key === 'w' || key === 'W') {
		setDirection({ x: 0, y: -1 });
		e.preventDefault();
	} else if (key === 'ArrowDown' || key === 's' || key === 'S') {
		setDirection({ x: 0, y: 1 });
		e.preventDefault();
	} else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
		setDirection({ x: -1, y: 0 });
		e.preventDefault();
	} else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
		setDirection({ x: 1, y: 0 });
		e.preventDefault();
	}
});

if (pauseBtn) {
	pauseBtn.addEventListener('click', togglePause);
}

if (restartBtn) {
	restartBtn.addEventListener('click', resetGame);
}

if (restartOverlayBtn) {
	restartOverlayBtn.addEventListener('click', resetGame);
}

if (resumeOverlayBtn) {
	resumeOverlayBtn.addEventListener('click', resumeGame);
}

if (difficultyEl) {
	difficultyEl.addEventListener('change', () => {
		baseTickMs = Number(difficultyEl.value) || baseTickMs;
		updateTickMs();
	});
}

resizeCanvas();
init();