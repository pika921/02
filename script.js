const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SHAPES = [
  [[1, 1, 1, 1]], // I
  [
    [1, 0, 0],
    [1, 1, 1],
  ], // J
  [
    [0, 0, 1],
    [1, 1, 1],
  ], // L
  [
    [1, 1],
    [1, 1],
  ], // O
  [
    [0, 1, 1],
    [1, 1, 0],
  ], // S
  [
    [0, 1, 0],
    [1, 1, 1],
  ], // T
  [
    [1, 1, 0],
    [0, 1, 1],
  ], // Z
];

const COLORS = [
  "#37c5f5",
  "#5072ff",
  "#f6a33f",
  "#f5df37",
  "#65de78",
  "#b369ff",
  "#ff6c87",
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const msgEl = document.getElementById("message");
const restartBtn = document.getElementById("restart");

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function pickPiece() {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return {
    matrix: SHAPES[idx].map((r) => [...r]),
    color: COLORS[idx],
    x: Math.floor(COLS / 2) - 2,
    y: 0,
  };
}

function rotate(matrix) {
  const h = matrix.length;
  const w = matrix[0].length;
  const result = Array.from({ length: w }, () => Array(h).fill(0));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      result[x][h - 1 - y] = matrix[y][x];
    }
  }

  return result;
}

function collides(grid, piece, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue;
      const nx = piece.x + x + offsetX;
      const ny = piece.y + y + offsetY;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && grid[ny][nx]) return true;
    }
  }
  return false;
}

function merge(grid, piece) {
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      const gx = piece.x + x;
      const gy = piece.y + y;
      if (gy >= 0) {
        grid[gy][gx] = piece.color;
      }
    }
  }
}

function clearLines(grid) {
  let lines = 0;
  for (let y = ROWS - 1; y >= 0; y--) {
    if (grid[y].every((cell) => cell !== 0)) {
      grid.splice(y, 1);
      grid.unshift(Array(COLS).fill(0));
      lines++;
      y++;
    }
  }
  return lines;
}

function drawCell(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = "#0f1628";
  ctx.strokeRect(x * BLOCK + 0.5, y * BLOCK + 0.5, BLOCK - 1, BLOCK - 1);
}

function draw(grid, piece) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x]) drawCell(x, y, grid[y][x]);
    }
  }

  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      drawCell(piece.x + x, piece.y + y, piece.color);
    }
  }
}

let grid = createGrid();
let current = pickPiece();
let score = 0;
let gameOver = false;
let paused = false;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 500;

function updateScore(lines = 0) {
  const points = [0, 100, 300, 500, 800];
  score += points[lines] ?? lines * 200;
  scoreEl.textContent = score;
}

function step(timestamp = 0) {
  if (gameOver) return;

  const delta = timestamp - lastTime;
  lastTime = timestamp;

  if (!paused) {
    dropCounter += delta;
    if (dropCounter >= dropInterval) {
      softDrop();
      dropCounter = 0;
    }
  }

  draw(grid, current);
  requestAnimationFrame(step);
}

function lockAndNext() {
  merge(grid, current);
  const lines = clearLines(grid);
  updateScore(lines);
  dropInterval = Math.max(120, 500 - Math.floor(score / 600) * 20);

  current = pickPiece();
  if (collides(grid, current)) {
    gameOver = true;
    msgEl.textContent = "ゲームオーバー！ リスタートで再挑戦。";
  }
}

function softDrop() {
  if (!collides(grid, current, 0, 1)) {
    current.y++;
  } else {
    lockAndNext();
  }
}

function hardDrop() {
  while (!collides(grid, current, 0, 1)) {
    current.y++;
  }
  lockAndNext();
}

function move(dx) {
  if (!collides(grid, current, dx, 0)) {
    current.x += dx;
  }
}

function turn() {
  const rotated = rotate(current.matrix);
  if (!collides(grid, current, 0, 0, rotated)) {
    current.matrix = rotated;
    return;
  }
  if (!collides(grid, current, -1, 0, rotated)) {
    current.x--;
    current.matrix = rotated;
    return;
  }
  if (!collides(grid, current, 1, 0, rotated)) {
    current.x++;
    current.matrix = rotated;
  }
}

function restart() {
  grid = createGrid();
  current = pickPiece();
  score = 0;
  updateScore(0);
  gameOver = false;
  paused = false;
  dropCounter = 0;
  dropInterval = 500;
  msgEl.textContent = "";
  lastTime = performance.now();
}

window.addEventListener("keydown", (event) => {
  if (gameOver && event.code !== "KeyR") return;

  switch (event.code) {
    case "ArrowLeft":
      move(-1);
      break;
    case "ArrowRight":
      move(1);
      break;
    case "ArrowDown":
      softDrop();
      break;
    case "ArrowUp":
      hardDrop();
      break;
    case "Space":
      event.preventDefault();
    case "KeyZ":
      turn();
      break;
    case "KeyP":
      paused = !paused;
      msgEl.textContent = paused ? "一時停止中 (Pで再開)" : "";
      break;
    case "KeyR":
      restart();
      break;
  }
});

restartBtn.addEventListener("click", restart);

updateScore(0);
requestAnimationFrame(step);
