const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const SHAPES = [
  [[1, 1, 1, 1]],
  [
    [1, 0, 0],
    [1, 1, 1],
  ],
  [
    [0, 0, 1],
    [1, 1, 1],
  ],
  [
    [1, 1],
    [1, 1],
  ],
  [
    [0, 1, 1],
    [1, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 1, 1],
  ],
  [
    [1, 1, 0],
    [0, 1, 1],
  ],
];

const COLORS = ["#6bdcff", "#7ea0ff", "#ffbf70", "#ffe77f", "#89ea97", "#d1a3ff", "#ffa1b8"];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const linesEl = document.getElementById("lines");
const msgEl = document.getElementById("message");
const comboEl = document.getElementById("combo");
const boardWrap = document.getElementById("boardWrap");
const restartBtn = document.getElementById("restart");
const audioToggle = document.getElementById("audioToggle");

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
    this.bgm = [261.63, 329.63, 392, 329.63, 293.66, 349.23, 440, 349.23];
  }

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.14;
    this.master.connect(this.ctx.destination);
  }

  async unlock() {
    if (!this.enabled) return;
    await this.init();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (!this.bgmTimer) {
      this.startBgm();
    }
  }

  setEnabled(flag) {
    this.enabled = flag;
    if (!flag) {
      this.stopBgm();
    } else {
      this.unlock();
    }
  }

  pulse(type, freq, duration = 0.08, gain = 0.08) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const vol = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(vol).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  noise(duration = 0.08, gain = 0.03) {
    if (!this.enabled || !this.ctx) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    const vol = this.ctx.createGain();
    source.buffer = buffer;
    vol.gain.value = gain;
    source.connect(vol).connect(this.master);
    source.start();
  }

  sfxMove() {
    this.pulse("square", 470, 0.05, 0.04);
  }

  sfxRotate() {
    this.pulse("triangle", 640, 0.07, 0.05);
  }

  sfxDrop() {
    this.pulse("sawtooth", 220, 0.1, 0.06);
    this.noise(0.05, 0.02);
  }

  sfxClear(lines) {
    const base = 620 + lines * 70;
    this.pulse("triangle", base, 0.16, 0.08);
    this.pulse("triangle", base + 200, 0.22, 0.07);
  }

  sfxGameOver() {
    this.pulse("sine", 240, 0.24, 0.08);
    setTimeout(() => this.pulse("sine", 170, 0.3, 0.06), 120);
  }

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    this.bgmTimer = setInterval(() => {
      if (!this.enabled || this.ctx.state !== "running") return;
      const note = this.bgm[this.bgmStep % this.bgm.length];
      this.pulse("sine", note, 0.24, 0.028);
      this.bgmStep++;
    }, 260);
  }

  stopBgm() {
    clearInterval(this.bgmTimer);
    this.bgmTimer = null;
  }
}

const audio = new AudioEngine();

function createGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

function pickPiece() {
  const idx = Math.floor(Math.random() * SHAPES.length);
  return { matrix: SHAPES[idx].map((r) => [...r]), color: COLORS[idx], x: Math.floor(COLS / 2) - 2, y: 0 };
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
      if (gy >= 0) grid[gy][gx] = piece.color;
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

function shakeBoard(power = 8) {
  boardWrap.style.transform = `translate(${(Math.random() - 0.5) * power}px, ${(Math.random() - 0.5) * power}px)`;
  setTimeout(() => {
    boardWrap.style.transform = "translate(0, 0)";
  }, 120);
}

function showCombo(lines) {
  if (lines <= 0) return;
  comboEl.textContent = lines >= 4 ? "MEGA CLEAR! ✨" : `${lines} LINE CLEAR!`;
  comboEl.classList.remove("show");
  void comboEl.offsetWidth;
  comboEl.classList.add("show");
}

function getGhostY(grid, piece) {
  let y = piece.y;
  while (!collides(grid, piece, 0, y - piece.y + 1)) {
    y++;
  }
  return y;
}

function drawCell(x, y, color, ghost = false) {
  ctx.fillStyle = ghost ? `${color}55` : color;
  ctx.fillRect(x * BLOCK, y * BLOCK, BLOCK, BLOCK);
  ctx.strokeStyle = ghost ? "#ffffff99" : "#ffffff";
  ctx.strokeRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
}

function draw(grid, piece) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#ffe0ef";
  ctx.lineWidth = 1;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath();
    ctx.moveTo(i * BLOCK, 0);
    ctx.lineTo(i * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BLOCK);
    ctx.lineTo(COLS * BLOCK, i * BLOCK);
    ctx.stroke();
  }

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (grid[y][x]) drawCell(x, y, grid[y][x]);
    }
  }

  const ghostY = getGhostY(grid, piece);
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (!piece.matrix[y][x]) continue;
      drawCell(piece.x + x, ghostY + y, piece.color, true);
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
let linesTotal = 0;
let gameOver = false;
let paused = false;
let dropCounter = 0;
let lastTime = 0;
let dropInterval = 500;

function updateScore(lines = 0) {
  const points = [0, 120, 320, 560, 900];
  score += points[lines] ?? lines * 220;
  linesTotal += lines;
  scoreEl.textContent = score;
  linesEl.textContent = linesTotal;
}

function lockAndNext() {
  merge(grid, current);
  const lines = clearLines(grid);
  if (lines > 0) {
    updateScore(lines);
    audio.sfxClear(lines);
    showCombo(lines);
    shakeBoard(6 + lines * 2);
  }
  dropInterval = Math.max(95, 520 - Math.floor(score / 650) * 20);
  current = pickPiece();
  if (collides(grid, current)) {
    gameOver = true;
    msgEl.textContent = "ゲームオーバー！リスタートで再挑戦✨";
    shakeBoard(14);
    audio.sfxGameOver();
  }
}

function softDrop() {
  if (!collides(grid, current, 0, 1)) {
    current.y++;
    return true;
  }
  lockAndNext();
  return false;
}

function hardDrop() {
  while (!collides(grid, current, 0, 1)) current.y++;
  audio.sfxDrop();
  lockAndNext();
}

function move(dx) {
  if (!collides(grid, current, dx, 0)) {
    current.x += dx;
    audio.sfxMove();
  }
}

function turn() {
  const rotated = rotate(current.matrix);
  if (!collides(grid, current, 0, 0, rotated)) {
    current.matrix = rotated;
    audio.sfxRotate();
    return;
  }
  if (!collides(grid, current, -1, 0, rotated)) {
    current.x--;
    current.matrix = rotated;
    audio.sfxRotate();
    return;
  }
  if (!collides(grid, current, 1, 0, rotated)) {
    current.x++;
    current.matrix = rotated;
    audio.sfxRotate();
  }
}

function restart() {
  grid = createGrid();
  current = pickPiece();
  score = 0;
  linesTotal = 0;
  gameOver = false;
  paused = false;
  dropCounter = 0;
  dropInterval = 500;
  msgEl.textContent = "";
  comboEl.textContent = "";
  updateScore(0);
  lastTime = performance.now();
}

function step(timestamp = 0) {
  if (gameOver) {
    draw(grid, current);
    return;
  }
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

function togglePause() {
  paused = !paused;
  msgEl.textContent = paused ? "一時停止中 ⏸" : "";
}

function triggerAction(action) {
  if (gameOver && action !== "restart") return;
  audio.unlock();

  switch (action) {
    case "left":
      move(-1);
      break;
    case "right":
      move(1);
      break;
    case "down":
      softDrop();
      audio.sfxMove();
      break;
    case "drop":
      hardDrop();
      break;
    case "rotate":
      turn();
      break;
    case "pause":
      togglePause();
      break;
    case "restart":
      restart();
      break;
  }
}

window.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"].includes(event.code)) {
    event.preventDefault();
  }
  const map = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowDown: "down",
    ArrowUp: "drop",
    Space: "rotate",
    KeyZ: "rotate",
    KeyP: "pause",
    KeyR: "restart",
  };
  const action = map[event.code];
  if (action) triggerAction(action);
});

for (const btn of document.querySelectorAll("[data-action]")) {
  const action = btn.dataset.action;
  const handler = (event) => {
    event.preventDefault();
    triggerAction(action);
  };
  btn.addEventListener("click", handler);
  btn.addEventListener("touchstart", handler, { passive: false });
}

restartBtn.addEventListener("click", () => triggerAction("restart"));

audioToggle.addEventListener("click", async () => {
  const enabled = audioToggle.getAttribute("aria-pressed") !== "true";
  audioToggle.setAttribute("aria-pressed", String(enabled));
  audio.setEnabled(enabled);
  audioToggle.textContent = enabled ? "🔈 サウンドON" : "🔇 サウンドOFF";
  await audio.unlock();
});

window.addEventListener(
  "pointerdown",
  () => {
    audio.unlock();
  },
  { once: true },
);

restart();
requestAnimationFrame(step);
