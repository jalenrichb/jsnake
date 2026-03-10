const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const messageDisplay = document.getElementById("message");

// Pull focus from Chrome's address bar to the page
window.focus();
document.body.focus();

// Grid configuration — sized to fill the screen
const tileSize = 20;
let tilesX, tilesY;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  tilesX = Math.floor(canvas.width / tileSize);
  tilesY = Math.floor(canvas.height / tileSize);
}

resizeCanvas();
window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

// --- Clock ---

let clockInterval = null;

function formatDateTime() {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${time}<div class="date">${date}</div>`;
}

function startClock() {
  messageDisplay.style.whiteSpace = "pre-line";
  messageDisplay.style.opacity = "1";
  messageDisplay.innerHTML = formatDateTime();
  clockInterval = setInterval(() => {
    if (!playerControlled && !gameOver) {
      messageDisplay.innerHTML = formatDateTime();
    }
  }, 1000);
}

function stopClock() {
  clearInterval(clockInterval);
}

startClock();

// Game state
let snake = [{ x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) }];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = spawnRandomFood();
let score = 0;
let gameRunning = true;
let playerControlled = false;
let gameOver = false;
let gameLoop = null;
const gameSpeed = 100;

// --- Input handling ---

document.addEventListener("keydown", (e) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }

  if (gameOver) {
    resetGame();
    return;
  }

  switch (e.key) {
    case "ArrowUp":
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
    default:
      return;
  }

  if (!playerControlled) {
    playerControlled = true;
    stopClock();
    messageDisplay.style.opacity = "0";
  }
});

// --- Auto-play AI ---

function autoMove() {
  const head = snake[0];
  const directions = [
    { x: 0, y: -1 },  // up
    { x: 0, y: 1 },   // down
    { x: -1, y: 0 },  // left
    { x: 1, y: 0 },   // right
  ];

  // Filter out reverse direction and directions that cause immediate collision
  const safeMoves = directions.filter((d) => {
    // Can't reverse
    if (d.x === -direction.x && d.y === -direction.y) return false;

    // Check if this direction leads into the snake's body
    let nx = head.x + d.x;
    let ny = head.y + d.y;
    // Wrap around
    if (nx < 0) nx = tilesX - 1;
    if (nx >= tilesX) nx = 0;
    if (ny < 0) ny = tilesY - 1;
    if (ny >= tilesY) ny = 0;

    return !snake.some((seg) => seg.x === nx && seg.y === ny);
  });

  if (safeMoves.length === 0) return; // No safe move, will die next tick

  // Score each safe move: prefer moves that reach the food AND have escape room
  let bestMove = safeMoves[0];
  let bestScore = -Infinity;

  for (const move of safeMoves) {
    let nx = head.x + move.x;
    let ny = head.y + move.y;
    if (nx < 0) nx = tilesX - 1;
    if (nx >= tilesX) nx = 0;
    if (ny < 0) ny = tilesY - 1;
    if (ny >= tilesY) ny = 0;

    const reachable = floodFill(nx, ny);
    const dist = manhattan(nx, ny, food.x, food.y);

    // If reachable area is too small, penalize heavily (avoid traps)
    // Otherwise, prefer shorter distance to food
    let moveScore;
    if (reachable < snake.length) {
      moveScore = -10000 + reachable; // Trapped — last resort
    } else {
      moveScore = -dist; // Safe — pick closest to food
    }

    if (moveScore > bestScore) {
      bestScore = moveScore;
      bestMove = move;
    }
  }

  nextDirection = { x: bestMove.x, y: bestMove.y };
}

function manhattan(x1, y1, x2, y2) {
  // Account for wrap-around: shortest distance in each axis
  const dx = Math.min(Math.abs(x1 - x2), tilesX - Math.abs(x1 - x2));
  const dy = Math.min(Math.abs(y1 - y2), tilesY - Math.abs(y1 - y2));
  return dx + dy;
}

function floodFill(startX, startY) {
  // Count how many open cells are reachable from (startX, startY)
  // using BFS, treating snake body as walls
  const visited = new Set();
  const snakeSet = new Set(snake.map((s) => `${s.x},${s.y}`));
  const queue = [`${startX},${startY}`];
  visited.add(queue[0]);

  // Cap the search — if we find enough open space, no need to keep going
  const cap = snake.length + 10;

  while (queue.length > 0 && visited.size < cap) {
    const [cx, cy] = queue.shift().split(",").map(Number);
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      let nx = cx + dx;
      let ny = cy + dy;
      if (nx < 0) nx = tilesX - 1;
      if (nx >= tilesX) nx = 0;
      if (ny < 0) ny = tilesY - 1;
      if (ny >= tilesY) ny = 0;

      const key = `${nx},${ny}`;
      if (!visited.has(key) && !snakeSet.has(key)) {
        visited.add(key);
        queue.push(key);
      }
    }
  }

  return visited.size;
}

// --- Core game loop (one tick) ---

function tick() {
  if (!playerControlled) autoMove();
  direction = nextDirection;

  const head = snake[0];
  let newHead = { x: head.x + direction.x, y: head.y + direction.y };

  // Wrap around edges instead of dying
  if (newHead.x < 0) newHead.x = tilesX - 1;
  if (newHead.x >= tilesX) newHead.x = 0;
  if (newHead.y < 0) newHead.y = tilesY - 1;
  if (newHead.y >= tilesY) newHead.y = 0;

  // Self collision is the only way to lose
  if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
    if (!playerControlled) {
      // AI died — silently restart without showing game over
      snake = [{ x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) }];
      direction = { x: 1, y: 0 };
      nextDirection = { x: 1, y: 0 };
      food = spawnRandomFood();
      score = 0;
      draw();
      return;
    }
    endGame();
    return;
  }

  snake.unshift(newHead);

  if (newHead.x === food.x && newHead.y === food.y) {
    score++;
    spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

// --- Rendering ---

function draw() {
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food
  ctx.fillStyle = "#fff";
  ctx.fillRect(
    food.x * tileSize + 1,
    food.y * tileSize + 1,
    tileSize - 2,
    tileSize - 2
  );

  // Draw snake — head is pure white, body fades to gray
  snake.forEach((seg, i) => {
    const brightness = Math.max(255 - i * 8, 40);
    ctx.fillStyle = i === 0 ? "#fff" : `rgb(${brightness}, ${brightness}, ${brightness})`;
    ctx.fillRect(
      seg.x * tileSize + 1,
      seg.y * tileSize + 1,
      tileSize - 2,
      tileSize - 2
    );
  });
}

// --- Food spawning ---

function spawnRandomFood() {
  let newFood;
  do {
    newFood = {
      x: Math.floor(Math.random() * tilesX),
      y: Math.floor(Math.random() * tilesY),
    };
  } while (snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y));
  return newFood;
}

function spawnFood() {
  food = spawnRandomFood();
}

// --- Game over / reset ---

function endGame() {
  gameRunning = false;
  gameOver = true;
  clearInterval(gameLoop);
  messageDisplay.style.opacity = "1";
  messageDisplay.textContent = `Score: ${score}`;
}

function resetGame() {
  snake = [{ x: Math.floor(tilesX / 2), y: Math.floor(tilesY / 2) }];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  food = spawnRandomFood();
  score = 0;
  gameOver = false;
  gameRunning = true;
  playerControlled = false;
  startClock();
  draw();
  gameLoop = setInterval(tick, gameSpeed);
}

// Auto-start: snake moves right, clock shows, player takes over on first key press
draw();
gameLoop = setInterval(tick, gameSpeed);
