const ROWS = 10;
const COLS = 9;
const PIECES = {
  red: { king: "帅", advisor: "仕", bishop: "相", knight: "马", rook: "车", cannon: "炮", pawn: "兵" },
  black: { king: "将", advisor: "士", bishop: "象", knight: "马", rook: "车", cannon: "炮", pawn: "卒" }
};

const canvas = wx.createCanvas();
const ctx = canvas.getContext("2d");

let sys = wx.getSystemInfoSync();
let dpr = sys.pixelRatio || 1;
let screenW = sys.windowWidth || 375;
let screenH = sys.windowHeight || 667;
let board = [];
let turn = "red";
let selected = null;
let legalTargets = [];
let lastMove = null;
let captured = { red: [], black: [] };
let message = "红方先行";
let page = "home";
let metrics = {};
let buttons = [];

function makePiece(color, type) {
  return { color, type, label: PIECES[color][type] };
}

function initialBoard() {
  const b = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  const back = ["rook", "knight", "bishop", "advisor", "king", "advisor", "bishop", "knight", "rook"];
  for (let c = 0; c < COLS; c += 1) {
    b[0][c] = makePiece("black", back[c]);
    b[9][c] = makePiece("red", back[c]);
  }
  b[2][1] = makePiece("black", "cannon");
  b[2][7] = makePiece("black", "cannon");
  b[7][1] = makePiece("red", "cannon");
  b[7][7] = makePiece("red", "cannon");
  for (const c of [0, 2, 4, 6, 8]) {
    b[3][c] = makePiece("black", "pawn");
    b[6][c] = makePiece("red", "pawn");
  }
  return b;
}

function resetGame() {
  board = initialBoard();
  turn = "red";
  selected = null;
  legalTargets = [];
  lastMove = null;
  captured = { red: [], black: [] };
  message = "红方先行";
}

function resize() {
  sys = wx.getSystemInfoSync();
  dpr = sys.pixelRatio || 1;
  screenW = sys.windowWidth || 375;
  screenH = sys.windowHeight || 667;
  canvas.width = Math.floor(screenW * dpr);
  canvas.height = Math.floor(screenH * dpr);
  canvas.style.width = `${screenW}px`;
  canvas.style.height = `${screenH}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const top = 86;
  const bottom = 86;
  const usableW = screenW - 24;
  const usableH = screenH - top - bottom;
  const boardW = Math.min(usableW, usableH * 0.9, 430);
  const boardH = boardW * 10 / 9;
  const x = (screenW - boardW) / 2;
  const y = top + Math.max(0, (usableH - boardH) / 2);
  const marginX = boardW * 0.085;
  const marginY = boardH * 0.075;
  metrics = {
    boardW,
    boardH,
    x,
    y,
    marginX,
    marginY,
    cellX: (boardW - marginX * 2) / 8,
    cellY: (boardH - marginY * 2) / 9,
    radius: Math.min((boardW - marginX * 2) / 8, (boardH - marginY * 2) / 9) * 0.37
  };
}

function pointOf(row, col) {
  return {
    x: metrics.x + metrics.marginX + col * metrics.cellX,
    y: metrics.y + metrics.marginY + row * metrics.cellY
  };
}

function drawRoundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clear() {
  const g = ctx.createLinearGradient(0, 0, screenW, screenH);
  g.addColorStop(0, "#f6ead6");
  g.addColorStop(0.52, "#d7ad6d");
  g.addColorStop(1, "#6b3e22");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, screenW, screenH);
}

function drawHome() {
  clear();
  buttons = [];
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  drawRoundRect(22, 58, screenW - 44, screenH - 116, 24);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#27180f";
  ctx.font = "700 34px sans-serif";
  ctx.fillText("象棋小游戏", screenW / 2, 124);
  ctx.font = "400 15px sans-serif";
  ctx.fillStyle = "rgba(39,24,15,0.72)";
  wrapText("微信小游戏版本采用 Canvas 原生渲染。当前版本支持本地双人练习、棋盘自适应、基础规则走子。", screenW / 2, 166, screenW - 80, 24);
  addButton("开始对弈", screenW / 2 - 116, 260, 232, 52, () => {
    resetGame();
    page = "game";
    render();
  });
  addButton("关于与许可", screenW / 2 - 116, 326, 232, 48, () => {
    page = "about";
    render();
  }, true);
  drawButtons();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  let line = "";
  for (const char of text) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = char;
      y += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

function addButton(label, x, y, w, h, action, secondary = false) {
  buttons.push({ label, x, y, w, h, action, secondary });
}

function drawButtons() {
  for (const btn of buttons) {
    const g = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y + btn.h);
    if (btn.secondary) {
      g.addColorStop(0, "rgba(255,255,255,0.82)");
      g.addColorStop(1, "rgba(255,255,255,0.5)");
      ctx.fillStyle = g;
      drawRoundRect(btn.x, btn.y, btn.w, btn.h, 24);
      ctx.fill();
      ctx.strokeStyle = "rgba(110,66,30,0.2)";
      ctx.stroke();
      ctx.fillStyle = "#5b2a17";
    } else {
      g.addColorStop(0, "#9a241d");
      g.addColorStop(1, "#c36b35");
      ctx.fillStyle = g;
      drawRoundRect(btn.x, btn.y, btn.w, btn.h, 26);
      ctx.fill();
      ctx.fillStyle = "#fff";
    }
    ctx.textAlign = "center";
    ctx.font = "600 18px sans-serif";
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 6);
  }
}

function drawHeader() {
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  drawRoundRect(12, 12, screenW - 24, 58, 14);
  ctx.fill();
  ctx.fillStyle = "#24170f";
  ctx.textAlign = "left";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("象棋小游戏", 26, 48);
  ctx.textAlign = "right";
  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = turn === "red" ? "#a92a22" : "#161616";
  ctx.fillText(`${turn === "red" ? "红方" : "黑方"}行棋`, screenW - 26, 47);
}

function drawBoard() {
  const { x, y, boardW, boardH, marginX, marginY, cellX, cellY } = metrics;
  ctx.save();
  ctx.fillStyle = "rgba(255, 242, 207, 0.78)";
  drawRoundRect(x - 8, y - 8, boardW + 16, boardH + 16, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(80,45,20,0.42)";
  ctx.lineWidth = 1;
  ctx.stroke();
  const wood = ctx.createLinearGradient(x, y, x + boardW, y + boardH);
  wood.addColorStop(0, "#f1ca82");
  wood.addColorStop(0.5, "#d8994d");
  wood.addColorStop(1, "#8a4f27");
  ctx.fillStyle = wood;
  drawRoundRect(x, y, boardW, boardH, 12);
  ctx.fill();

  ctx.strokeStyle = "rgba(74,35,16,0.82)";
  ctx.lineWidth = 1.15;
  for (let r = 0; r < ROWS; r += 1) {
    const p1 = pointOf(r, 0);
    const p2 = pointOf(r, 8);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  for (let c = 0; c < COLS; c += 1) {
    const top = pointOf(0, c);
    const riverTop = pointOf(4, c);
    const riverBottom = pointOf(5, c);
    const bottom = pointOf(9, c);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(riverTop.x, riverTop.y);
    ctx.moveTo(riverBottom.x, riverBottom.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }
  drawPalace(0);
  drawPalace(7);
  ctx.textAlign = "center";
  ctx.font = `${Math.max(16, cellY * 0.34)}px serif`;
  ctx.fillStyle = "rgba(74,35,16,0.58)";
  ctx.fillText("楚河", x + boardW * 0.32, y + boardH / 2 + cellY * 0.1);
  ctx.fillText("汉界", x + boardW * 0.68, y + boardH / 2 + cellY * 0.1);
  ctx.restore();
}

function drawPalace(startRow) {
  const a = pointOf(startRow, 3);
  const b = pointOf(startRow + 2, 5);
  const c = pointOf(startRow, 5);
  const d = pointOf(startRow + 2, 3);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.moveTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.stroke();
}

function drawHighlights() {
  if (lastMove) {
    for (const pos of [lastMove.from, lastMove.to]) {
      const p = pointOf(pos.row, pos.col);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, metrics.radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (selected) {
    const p = pointOf(selected.row, selected.col);
    ctx.fillStyle = "rgba(180,57,47,0.18)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, metrics.radius * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const target of legalTargets) {
    const p = pointOf(target.row, target.col);
    ctx.fillStyle = "rgba(31,111,104,0.28)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, metrics.radius * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPieces() {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const piece = board[row][col];
      if (piece) drawPiece(piece, row, col);
    }
  }
}

function drawPiece(piece, row, col) {
  const p = pointOf(row, col);
  const r = metrics.radius;
  ctx.save();
  ctx.shadowColor = "rgba(31,20,12,0.3)";
  ctx.shadowBlur = r * 0.22;
  ctx.shadowOffsetX = r * 0.16;
  ctx.shadowOffsetY = r * 0.22;
  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.45, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, "#fff8e9");
  g.addColorStop(0.64, "#ead1a3");
  g.addColorStop(1, "#b77c3b");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = piece.color === "red" ? "#a92a22" : "#1e1d1a";
  ctx.lineWidth = Math.max(2, r * 0.11);
  ctx.beginPath();
  ctx.arc(p.x, p.y - r * 0.04, r * 0.74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = piece.color === "red" ? "#9f241e" : "#171713";
  ctx.font = `600 ${Math.max(18, r * 1.02)}px serif`;
  ctx.fillText(piece.label, p.x, p.y - r * 0.05);
  ctx.restore();
}

function drawGame() {
  clear();
  buttons = [];
  drawHeader();
  drawBoard();
  drawHighlights();
  drawPieces();
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  drawRoundRect(12, screenH - 70, screenW - 24, 52, 14);
  ctx.fill();
  ctx.textAlign = "left";
  ctx.font = "600 15px sans-serif";
  ctx.fillStyle = "#332016";
  ctx.fillText(message, 26, screenH - 38);
  addButton("重开", screenW - 144, screenH - 62, 56, 36, () => {
    resetGame();
    render();
  }, true);
  addButton("首页", screenW - 78, screenH - 62, 56, 36, () => {
    page = "home";
    render();
  }, true);
  drawButtons();
}

function drawAbout() {
  clear();
  buttons = [];
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  drawRoundRect(22, 44, screenW - 44, screenH - 88, 24);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = "#27180f";
  ctx.font = "700 28px sans-serif";
  ctx.fillText("关于与许可", screenW / 2, 92);
  ctx.font = "400 14px sans-serif";
  ctx.fillStyle = "rgba(39,24,15,0.78)";
  const lines = [
    "本产品使用了 Pikafish 象棋引擎。",
    "Pikafish 是开源中国象棋 UCI 引擎，",
    "基于 GPL v3 授权发布。",
    "项目地址：github.com/official-pikafish/Pikafish",
    "本产品开源代码：github.com/qq978262947/-_-",
    "Pikafish 版权归原作者及贡献者所有。"
  ];
  let y = 136;
  for (const line of lines) {
    wrapText(line, screenW / 2, y, screenW - 74, 22);
    y += 34;
  }
  addButton("复制开源地址", screenW / 2 - 116, screenH - 150, 232, 46, () => {
    wx.setClipboardData({ data: "https://github.com/qq978262947/-_-" });
  });
  addButton("返回首页", screenW / 2 - 116, screenH - 92, 232, 46, () => {
    page = "home";
    render();
  }, true);
  drawButtons();
}

function render() {
  resize();
  if (page === "home") drawHome();
  if (page === "game") drawGame();
  if (page === "about") drawAbout();
}

function boardPosFromTouch(x, y) {
  const col = Math.round((x - metrics.x - metrics.marginX) / metrics.cellX);
  const row = Math.round((y - metrics.y - metrics.marginY) / metrics.cellY);
  if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
  const p = pointOf(row, col);
  const distance = Math.hypot(x - p.x, y - p.y);
  return distance <= metrics.radius * 1.45 ? { row, col } : null;
}

function samePos(a, b) {
  return a && b && a.row === b.row && a.col === b.col;
}

function pathCount(from, to) {
  let count = 0;
  if (from.row === to.row) {
    const step = from.col < to.col ? 1 : -1;
    for (let c = from.col + step; c !== to.col; c += step) if (board[from.row][c]) count += 1;
  } else if (from.col === to.col) {
    const step = from.row < to.row ? 1 : -1;
    for (let r = from.row + step; r !== to.row; r += step) if (board[r][from.col]) count += 1;
  }
  return count;
}

function inPalace(color, row, col) {
  if (col < 3 || col > 5) return false;
  return color === "red" ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
}

function crossedRiver(color, row) {
  return color === "red" ? row <= 4 : row >= 5;
}

function legalMove(from, to) {
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== turn) return false;
  const target = board[to.row][to.col];
  if (target && target.color === piece.color) return false;
  const dr = to.row - from.row;
  const dc = to.col - from.col;
  const adr = Math.abs(dr);
  const adc = Math.abs(dc);
  if (piece.type === "rook") return (dr === 0 || dc === 0) && pathCount(from, to) === 0;
  if (piece.type === "cannon") return (dr === 0 || dc === 0) && pathCount(from, to) === (target ? 1 : 0);
  if (piece.type === "knight") {
    if (!((adr === 2 && adc === 1) || (adr === 1 && adc === 2))) return false;
    const leg = adr === 2 ? { row: from.row + dr / 2, col: from.col } : { row: from.row, col: from.col + dc / 2 };
    return !board[leg.row][leg.col];
  }
  if (piece.type === "bishop") {
    if (adr !== 2 || adc !== 2) return false;
    if (piece.color === "red" && to.row < 5) return false;
    if (piece.color === "black" && to.row > 4) return false;
    return !board[from.row + dr / 2][from.col + dc / 2];
  }
  if (piece.type === "advisor") return adr === 1 && adc === 1 && inPalace(piece.color, to.row, to.col);
  if (piece.type === "king") {
    if (from.col === to.col && target?.type === "king") return pathCount(from, to) === 0;
    return adr + adc === 1 && inPalace(piece.color, to.row, to.col);
  }
  if (piece.type === "pawn") {
    const forward = piece.color === "red" ? -1 : 1;
    if (dr === forward && dc === 0) return true;
    return crossedRiver(piece.color, from.row) && dr === 0 && adc === 1;
  }
  return false;
}

function legalMovesFrom(row, col) {
  const moves = [];
  for (let r = 0; r < ROWS; r += 1) {
    for (let c = 0; c < COLS; c += 1) {
      const to = { row: r, col: c };
      if (legalMove({ row, col }, to)) moves.push(to);
    }
  }
  return moves;
}

function tapGame(x, y) {
  for (const btn of buttons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.action();
      return;
    }
  }
  const pos = boardPosFromTouch(x, y);
  if (!pos) return;
  const piece = board[pos.row][pos.col];
  if (selected && legalTargets.some((target) => samePos(target, pos))) {
    const moving = board[selected.row][selected.col];
    const target = board[pos.row][pos.col];
    if (target) captured[moving.color].push(target);
    board[pos.row][pos.col] = moving;
    board[selected.row][selected.col] = null;
    lastMove = { from: selected, to: pos };
    turn = turn === "red" ? "black" : "red";
    message = `${moving.color === "red" ? "红方" : "黑方"}${moving.label} 已落子`;
    selected = null;
    legalTargets = [];
    render();
    return;
  }
  if (piece && piece.color === turn) {
    selected = pos;
    legalTargets = legalMovesFrom(pos.row, pos.col);
    message = `已选择${piece.color === "red" ? "红方" : "黑方"}${piece.label}`;
  } else {
    selected = null;
    legalTargets = [];
    message = "请选择当前行棋方棋子";
  }
  render();
}

wx.onTouchStart((event) => {
  const touch = event.touches && event.touches[0];
  if (!touch) return;
  const x = touch.clientX;
  const y = touch.clientY;
  for (const btn of buttons) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
      btn.action();
      return;
    }
  }
  if (page === "game") tapGame(x, y);
});

wx.onShow(render);
wx.onWindowResize(render);
resetGame();
render();
