const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Muted, low-saturation palette
const COLORS = {
	background: '#f8fafb',
	border: '#d1d5db',
	snake: '#4b5563',
	apple: '#7c6b6b'
};

// Grid / cell settings (used for positioning)
const CELL_SIZE = 20;

// Simple snake state: array of segments {x,y}
let snake = [];
let apple = { x: 0, y: 0 };
// Movement state
let dir = { x: 1, y: 0 }; // start moving right
let gameInterval = null;
let tickMs = 200; // movement interval

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
	const r = (CELL_SIZE / 2) - 2;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
}

function randomGridPosition(cols, rows) {
	return {
		x: Math.floor(Math.random() * cols),
		y: Math.floor(Math.random() * rows)
	};
}

function getBoardSize() {
	return {
		cols: Math.floor(canvas.clientWidth / CELL_SIZE),
		rows: Math.floor(canvas.clientHeight / CELL_SIZE)
	};
}

function initSnake() {
	const { cols, rows } = getBoardSize();
	const cx = Math.floor(cols / 2);
	const cy = Math.floor(rows / 2);
	snake = [
		{ x: cx - 1, y: cy },
		{ x: cx,     y: cy },
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
	snake.forEach(seg => drawRectAtGrid(seg.x, seg.y, COLORS.snake));
}

function drawApple() {
	drawCircleAtGrid(apple.x, apple.y, COLORS.apple);
}

function draw() {
	drawBackground();
	drawSnake();
	drawApple();
}

function isInsideBounds(position, cols, rows) {
	return position.x >= 0 && position.x < cols && position.y >= 0 && position.y < rows;
}

function init() {
	resizeCanvas();
	initSnake();
	placeApple();
	draw();
	startLoop();
}

window.addEventListener('resize', () => {
	resizeCanvas();
	initSnake();
	placeApple();
	stopLoop();
	draw();
	startLoop();
});

init();

function step() {
	const cols = Math.floor(canvas.clientWidth / CELL_SIZE);
	const rows = Math.floor(canvas.clientHeight / CELL_SIZE);
	const head = snake[snake.length - 1];
	const newHead = { x: head.x + dir.x, y: head.y + dir.y };
	const ateApple = newHead.x === apple.x && newHead.y === apple.y;

	// Stop before the snake leaves the board.
	if (!isInsideBounds(newHead, cols, rows)) {
		stopLoop();
		return;
	}

	// Move: add new head, and keep the tail only when eating an apple.
	snake.push(newHead);
	if (!ateApple) {
		snake.shift();
	} else {
		placeApple();
	}
	draw();
}

function startLoop() {
	stopLoop();
	gameInterval = setInterval(step, tickMs);
}

function stopLoop() {
	if (gameInterval) {
		clearInterval(gameInterval);
		gameInterval = null;
	}
}

// Keyboard controls: arrow keys and WASD
function setDirection(newDir) {
	// Prevent reversing directly onto itself
	if (newDir.x === -dir.x && newDir.y === -dir.y) return;
	dir = newDir;
}

window.addEventListener('keydown', (e) => {
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
