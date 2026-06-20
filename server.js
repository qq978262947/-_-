const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 5178);
const ROOT = __dirname;
const ROOMS = new Map();
let MATCH_WAITING = null;
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const TIME_CONTROLS = {
  "10-5": { id: "10-5", stepMs: 10 * 1000, totalMs: 5 * 60 * 1000, label: "10秒一步 · 局时5分钟" },
  "30-10": { id: "30-10", stepMs: 30 * 1000, totalMs: 10 * 60 * 1000, label: "30秒一步 · 局时10分钟" },
  "120-40": { id: "120-40", stepMs: 2 * 60 * 1000, totalMs: 40 * 60 * 1000, label: "2分钟一步 · 局时40分钟" },
  "300-100": { id: "300-100", stepMs: 5 * 60 * 1000, totalMs: 100 * 60 * 1000, label: "5分钟一步 · 局时100分钟" },
  "900-300": { id: "900-300", stepMs: 15 * 60 * 1000, totalMs: 300 * 60 * 1000, label: "15分钟一步 · 局时300分钟" },
  "1800-600": { id: "1800-600", stepMs: 30 * 60 * 1000, totalMs: 600 * 60 * 1000, label: "30分钟一步 · 局时600分钟" },
  "3600-1200": { id: "3600-1200", stepMs: 60 * 60 * 1000, totalMs: 1200 * 60 * 1000, label: "60分钟一步 · 局时1200分钟" }
};
const PIKAFISH_THREADS = Math.max(1, Math.min(Number(process.env.PIKAFISH_THREADS) || os.cpus().length - 1 || 1, 8));
const PIKAFISH_HASH_MB = Math.max(16, Math.min(Number(process.env.PIKAFISH_HASH_MB) || 512, 4096));
const PIKAFISH_CANDIDATES = [
  process.env.PIKAFISH_PATH,
  path.join(ROOT, "engines", "pikafish", "pikafish"),
  path.join(ROOT, "engines", "pikafish", "pikafish-arm64"),
  "/Users/wangjun/Downloads/Pikafish-master/src/pikafish",
  path.join(ROOT, "engines", "pikafish", "pikafish.exe")
].filter(Boolean);
let pikafishProcess = null;
let pikafishReady = null;
let pikafishReadyResolve = null;
let pikafishReadyReject = null;
let pikafishReadyTimer = null;
let pikafishCurrent = null;
let pikafishBuffer = "";
let pikafishQueue = Promise.resolve();
let pikafishLastOutput = "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function createInitialBoard() {
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));
  let id = 0;
  const place = (row, col, color, type) => {
    board[row][col] = { id: `${color}-${type}-${id++}`, color, type };
  };
  const backRank = ["rook", "knight", "bishop", "advisor", "king", "advisor", "bishop", "knight", "rook"];

  backRank.forEach((type, col) => place(0, col, "black", type));
  place(2, 1, "black", "cannon");
  place(2, 7, "black", "cannon");
  [0, 2, 4, 6, 8].forEach((col) => place(3, col, "black", "pawn"));

  backRank.forEach((type, col) => place(9, col, "red", type));
  place(7, 1, "red", "cannon");
  place(7, 7, "red", "cannon");
  [0, 2, 4, 6, 8].forEach((col) => place(6, col, "red", "pawn"));

  return board;
}

function normalizeTimeControl(id) {
  return TIME_CONTROLS[id] || TIME_CONTROLS["30-10"];
}

function createInitialClocks(timeControl) {
  return {
    redMs: timeControl.totalMs,
    blackMs: timeControl.totalMs,
    stepMs: timeControl.stepMs,
    totalMs: timeControl.totalMs,
    turnStartedAt: Date.now()
  };
}

function createInitialState(version = 0, timeControl = TIME_CONTROLS["30-10"]) {
  const board = createInitialBoard();
  return {
    board,
    turn: "red",
    winner: null,
    draw: false,
    lastMove: null,
    history: [],
    moveKeys: [],
    positionKeys: [`red:${board.map((row) => row.map((piece) => (piece ? `${piece.color[0]}${piece.type[0]}` : ".")).join("")).join("/")}`],
    snapshots: [{ board, turn: "red", winner: null, draw: false, lastMove: null, captured: { red: [], black: [] } }],
    captured: { red: [], black: [] },
    timeControl,
    clocks: createInitialClocks(timeControl),
    version
  };
}

function makeRoomCode() {
  let code = "";
  do {
    code = crypto.randomBytes(3).toString("hex").toUpperCase();
  } while (ROOMS.has(code));
  return code;
}

function publicPlayers(room) {
  return {
    red: Boolean(room.players.red),
    black: Boolean(room.players.black)
  };
}

function colorForClient(room, clientId) {
  if (room.players.red === clientId) {
    return "red";
  }
  if (room.players.black === clientId) {
    return "black";
  }
  return null;
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of ROOMS) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      ROOMS.delete(code);
    }
  }
  if (MATCH_WAITING && (!ROOMS.has(MATCH_WAITING.roomCode) || now - MATCH_WAITING.createdAt > 30000)) {
    MATCH_WAITING = null;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("请求体过大"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON 格式无效"));
      }
    });
    req.on("error", reject);
  });
}

function sanitizeRoomCode(code) {
  return String(code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function sanitizeClocks(clocks, timeControl) {
  const fallback = createInitialClocks(timeControl);
  const readMs = (value, fallbackValue) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(number, timeControl.totalMs)) : fallbackValue;
  };
  return {
    redMs: readMs(clocks?.redMs, fallback.redMs),
    blackMs: readMs(clocks?.blackMs, fallback.blackMs),
    stepMs: timeControl.stepMs,
    totalMs: timeControl.totalMs,
    turnStartedAt: Number.isFinite(Number(clocks?.turnStartedAt)) ? Number(clocks.turnStartedAt) : Date.now()
  };
}

function sanitizeState(state, version, roomTimeControl = null) {
  const timeControl = roomTimeControl || normalizeTimeControl(state.timeControl?.id);
  return {
    board: Array.isArray(state.board) ? state.board : createInitialBoard(),
    turn: state.turn === "black" ? "black" : "red",
    winner: state.winner === "red" || state.winner === "black" ? state.winner : null,
    draw: Boolean(state.draw),
    lastMove: state.lastMove || null,
    history: Array.isArray(state.history) ? state.history.slice(0, 120) : [],
    moveKeys: Array.isArray(state.moveKeys) ? state.moveKeys.slice(0, 300) : [],
    positionKeys: Array.isArray(state.positionKeys) ? state.positionKeys.slice(0, 300) : [],
    snapshots: Array.isArray(state.snapshots) ? state.snapshots.slice(0, 300) : [],
    captured: {
      red: Array.isArray(state.captured?.red) ? state.captured.red.slice(0, 32) : [],
      black: Array.isArray(state.captured?.black) ? state.captured.black.slice(0, 32) : []
    },
    timeControl,
    clocks: sanitizeClocks(state.clocks, timeControl),
    endReason: state.endReason && typeof state.endReason === "object"
      ? {
          title: String(state.endReason.title || "").slice(0, 80),
          summary: String(state.endReason.summary || "").slice(0, 160),
          detail: String(state.endReason.detail || "").slice(0, 300)
        }
      : null,
    version
  };
}

function otherColor(color) {
  return color === "red" ? "black" : "red";
}

function activeClockRemaining(state, color, now = Date.now()) {
  if (!state?.clocks || state.winner || state.draw) {
    return 0;
  }
  const base = color === "red" ? state.clocks.redMs : state.clocks.blackMs;
  if (state.turn === color) {
    const elapsed = Math.max(0, now - state.clocks.turnStartedAt);
    return Math.max(0, Math.min(base - elapsed, state.clocks.stepMs - elapsed));
  }
  return Math.max(0, base);
}

function applyClockTimeout(room) {
  if (!room?.state?.clocks || room.state.winner || room.state.draw || !room.players.red || !room.players.black) {
    return false;
  }
  if (activeClockRemaining(room.state, room.state.turn) > 0) {
    return false;
  }
  const loser = room.state.turn;
  const winner = otherColor(loser);
  room.state.winner = winner;
  room.state.endReason = {
    title: `对局结束 · ${winner === "red" ? "红方" : "黑方"}超时胜`,
    summary: `${loser === "red" ? "红方" : "黑方"}局时或步时耗尽。`,
    detail: `当前局时规则为 ${room.timeControl.label}。${loser === "red" ? "红方" : "黑方"}未能在限制时间内完成走子，本局由${winner === "red" ? "红方" : "黑方"}获胜。`
  };
  if (loser === "red") {
    room.state.clocks.redMs = 0;
  } else {
    room.state.clocks.blackMs = 0;
  }
  room.state.version += 1;
  room.updatedAt = Date.now();
  return true;
}

function resolvePikafishPath() {
  return PIKAFISH_CANDIDATES.find((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

function normalizeEnginePiece(piece) {
  if (!piece) {
    return null;
  }
  if (typeof piece === "string") {
    const compactMap = {
      K: { color: "red", type: "king" },
      A: { color: "red", type: "advisor" },
      B: { color: "red", type: "bishop" },
      N: { color: "red", type: "knight" },
      R: { color: "red", type: "rook" },
      C: { color: "red", type: "cannon" },
      P: { color: "red", type: "pawn" },
      k: { color: "black", type: "king" },
      a: { color: "black", type: "advisor" },
      b: { color: "black", type: "bishop" },
      n: { color: "black", type: "knight" },
      r: { color: "black", type: "rook" },
      c: { color: "black", type: "cannon" },
      p: { color: "black", type: "pawn" }
    };
    return compactMap[piece] || null;
  }
  const color = piece.color === "red" || piece.color === "black" ? piece.color : null;
  const validTypes = new Set(["king", "advisor", "bishop", "knight", "rook", "cannon", "pawn"]);
  if (!color || !validTypes.has(piece.type)) {
    return null;
  }
  return { color, type: piece.type };
}

function normalizeEngineBoard(board) {
  if (!Array.isArray(board) || board.length !== 10) {
    return null;
  }
  const normalized = board.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      return null;
    }
    return row.map(normalizeEnginePiece);
  });
  return normalized.some((row) => !row) ? null : normalized;
}

function boardToFen(board, turn) {
  const pieceMap = {
    red: { king: "K", advisor: "A", bishop: "B", knight: "N", rook: "R", cannon: "C", pawn: "P" },
    black: { king: "k", advisor: "a", bishop: "b", knight: "n", rook: "r", cannon: "c", pawn: "p" }
  };
  const ranks = board.map((row) => {
    let empty = 0;
    let text = "";
    row.forEach((piece) => {
      if (!piece) {
        empty += 1;
        return;
      }
      if (empty) {
        text += empty;
        empty = 0;
      }
      text += pieceMap[piece.color]?.[piece.type] || "1";
    });
    return text + (empty ? empty : "");
  });
  return `${ranks.join("/")} ${turn === "red" ? "w" : "b"} - - 0 1`;
}

function squareToUci(row, col) {
  return `${String.fromCharCode(97 + col)}${9 - row}`;
}

function uciToMove(bestmove) {
  const match = String(bestmove || "").match(/^([a-i])([0-9])([a-i])([0-9])/);
  if (!match) {
    return null;
  }
  return {
    from: {
      row: 9 - Number(match[2]),
      col: match[1].charCodeAt(0) - 97
    },
    to: {
      row: 9 - Number(match[4]),
      col: match[3].charCodeAt(0) - 97
    }
  };
}

function parsePvText(pvText) {
  return String(pvText || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(uciToMove)
    .filter(Boolean);
}

function parsePvMoves(raw) {
  const lines = String(raw || "").trim().split(/\r?\n/).reverse();
  const pvLine = lines.find((line) => /\bpv\s+/.test(line));
  if (!pvLine) {
    return [];
  }
  const pvText = pvLine.split(/\bpv\s+/)[1] || "";
  return parsePvText(pvText);
}

function parseScore(line) {
  const mate = /\bscore mate (-?\d+)/.exec(line);
  if (mate) {
    const value = Number(mate[1]);
    return {
      type: "mate",
      value,
      cp: value > 0 ? 100000 - value : -100000 - value,
      text: value > 0 ? `${value}步成杀` : `${Math.abs(value)}步被杀`
    };
  }
  const cp = /\bscore cp (-?\d+)/.exec(line);
  if (cp) {
    const value = Number(cp[1]);
    return {
      type: "cp",
      value,
      cp: value,
      text: `${value > 0 ? "+" : ""}${(value / 100).toFixed(2)}兵`
    };
  }
  return { type: "unknown", value: 0, cp: 0, text: "未知" };
}

function parsePikafishVariations(raw) {
  const latestByPv = new Map();
  String(raw || "").split(/\r?\n/).forEach((line) => {
    if (!/\bpv\s+/.test(line)) {
      return;
    }
    const depth = Number(/\bdepth (\d+)/.exec(line)?.[1] || 0);
    const multipv = Number(/\bmultipv (\d+)/.exec(line)?.[1] || 1);
    const nodes = Number(/\bnodes (\d+)/.exec(line)?.[1] || 0);
    const time = Number(/\btime (\d+)/.exec(line)?.[1] || 0);
    const pvText = line.split(/\bpv\s+/)[1] || "";
    const moves = parsePvText(pvText);
    if (!moves.length) {
      return;
    }
    latestByPv.set(multipv, {
      rank: multipv,
      depth,
      nodes,
      time,
      score: parseScore(line),
      pv: moves
    });
  });
  return [...latestByPv.values()].sort((a, b) => a.rank - b.rank);
}

function parsePikafishStats(raw, threads = PIKAFISH_THREADS) {
  const depths = [...String(raw || "").matchAll(/info depth (\d+)/g)].map((match) => Number(match[1]));
  const variations = parsePikafishVariations(raw);
  return {
    depthReached: depths.length ? Math.max(...depths) : null,
    threads: /Using \d+ threads?/.exec(raw || "")?.[0] || `Using ${threads} thread${threads === 1 ? "" : "s"}`,
    nnue: /NNUE evaluation using pikafish\.nnue/.test(raw || ""),
    pv: variations[0]?.pv || parsePvMoves(raw),
    variations
  };
}

function resetPikafishProcess(error) {
  const message = error?.message || "Pikafish 进程已退出";
  if (pikafishCurrent) {
    pikafishCurrent.finish({
      available: false,
      error: message,
      fen: pikafishCurrent.fen,
      raw: pikafishCurrent.raw || pikafishLastOutput
    });
  }
  if (pikafishReadyReject) {
    pikafishReadyReject(error || new Error(message));
  }
  clearTimeout(pikafishReadyTimer);
  pikafishProcess = null;
  pikafishReady = null;
  pikafishReadyResolve = null;
  pikafishReadyReject = null;
  pikafishReadyTimer = null;
  pikafishCurrent = null;
  pikafishBuffer = "";
  pikafishLastOutput = "";
}

function handlePikafishLine(line) {
  if (pikafishCurrent) {
    pikafishCurrent.raw += `${line}\n`;
  }
  if (line === "uciok") {
    try {
      pikafishProcess.stdin.write(`setoption name Threads value ${PIKAFISH_THREADS}\n`);
      pikafishProcess.stdin.write(`setoption name Hash value ${PIKAFISH_HASH_MB}\n`);
      pikafishProcess.stdin.write("isready\n");
    } catch {}
    return;
  }
  if (line === "readyok" && pikafishReadyResolve) {
    clearTimeout(pikafishReadyTimer);
    pikafishReadyResolve();
    pikafishReadyResolve = null;
    pikafishReadyReject = null;
    pikafishReadyTimer = null;
    return;
  }
  if (line.startsWith("bestmove ") && pikafishCurrent) {
    const bestmove = line.split(/\s+/)[1];
    const stats = parsePikafishStats(pikafishCurrent.raw);
    pikafishCurrent.finish({
      available: true,
      bestmove,
      move: uciToMove(bestmove),
      fen: pikafishCurrent.fen,
      raw: pikafishCurrent.raw,
      timedOut: Boolean(pikafishCurrent.timedOut),
      ...stats
    });
  }
}

function getPikafishProcess(enginePath) {
  if (pikafishProcess?.path === enginePath && !pikafishProcess.killed) {
    return pikafishReady;
  }
  if (pikafishProcess) {
    try {
      pikafishProcess.stdin.write("quit\n");
      pikafishProcess.kill();
    } catch {}
    resetPikafishProcess();
  }
  pikafishProcess = spawn(enginePath, [], { cwd: path.dirname(enginePath), stdio: ["pipe", "pipe", "pipe"] });
  pikafishProcess.path = enginePath;
  pikafishBuffer = "";
  pikafishReady = new Promise((resolve, reject) => {
    pikafishReadyResolve = resolve;
    pikafishReadyReject = reject;
  });
  pikafishReadyTimer = setTimeout(() => {
    const error = new Error("Pikafish 初始化超时");
    if (pikafishReadyReject) {
      pikafishReadyReject(error);
    }
    try {
      pikafishProcess.kill();
    } catch {}
    resetPikafishProcess(error);
  }, 5000);
  pikafishProcess.stdout.on("data", (chunk) => {
    const text = chunk.toString();
    pikafishLastOutput = `${pikafishLastOutput}${text}`.slice(-4000);
    pikafishBuffer += text;
    const lines = pikafishBuffer.split(/\r?\n/);
    pikafishBuffer = lines.pop() || "";
    lines.forEach(handlePikafishLine);
  });
  pikafishProcess.stderr.on("data", (chunk) => {
    pikafishLastOutput = `${pikafishLastOutput}${chunk.toString()}`.slice(-4000);
    if (pikafishCurrent) {
      pikafishCurrent.raw += chunk.toString();
    }
  });
  pikafishProcess.on("error", resetPikafishProcess);
  pikafishProcess.on("exit", (code, signal) => {
    resetPikafishProcess(new Error(`Pikafish 进程已退出，code=${code ?? "null"}，signal=${signal ?? "null"}`));
  });
  pikafishProcess.stdin.write("uci\n");
  return pikafishReady;
}

function runPikafishOnce({ board, turn, moveTime, depth, multiPv, threads }) {
  const enginePath = resolvePikafishPath();
  if (!enginePath) {
    return Promise.resolve({
      available: false,
      error: "Pikafish 二进制未安装。请设置 PIKAFISH_PATH 或放到 engines/pikafish/pikafish。"
    });
  }
  const engineBoard = normalizeEngineBoard(board);
  if (!engineBoard) {
    return Promise.resolve({
      available: false,
      error: "棋盘数据无效，已启用本地兜底。"
    });
  }
  const fen = boardToFen(engineBoard, turn);
  const safeMoveTime = Math.max(120, Math.min(Number(moveTime) || 800, 300000));
  const depthNumber = Number(depth);
  const safeDepth = depth === null || depth === undefined || depth === "" || !Number.isFinite(depthNumber)
    ? null
    : Math.max(1, Math.min(depthNumber, 99));
  const safeMultiPv = Math.max(1, Math.min(Number(multiPv) || 1, 8));
  const safeThreads = Math.max(1, Math.min(Number(threads) || PIKAFISH_THREADS, 8));

  return new Promise((resolve) => {
    const child = spawn(enginePath, [], { cwd: path.dirname(enginePath), stdio: ["pipe", "pipe", "pipe"] });
    let settled = false;
    let buffer = "";
    let raw = "";
    let timedOut = false;
    let searchStarted = false;
    let childExited = false;
    let stopTimer = null;
    let hardTimer = null;
    let killTimer = null;
    const appendRaw = (text) => {
      raw = `${raw}${text}`.slice(-120000);
    };
    const finish = (payload) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(initTimer);
      clearTimeout(stopTimer);
      clearTimeout(hardTimer);
      clearTimeout(killTimer);
      try {
        child.stdin.write("quit\n");
      } catch {}
      try {
        child.stdin.end();
      } catch {}
      try {
        child.kill("SIGTERM");
      } catch {}
      killTimer = setTimeout(() => {
        if (!childExited) {
          try {
            child.kill("SIGKILL");
          } catch {}
        }
      }, 500);
      resolve(payload);
    };
    const beginSearch = () => {
      if (searchStarted) {
        return;
      }
      searchStarted = true;
      try {
        child.stdin.write("ucinewgame\n");
        child.stdin.write(`position fen ${fen}\n`);
        child.stdin.write(safeDepth ? `go depth ${safeDepth}\n` : `go movetime ${safeMoveTime}\n`);
      } catch (error) {
        finish({ available: false, error: error.message, fen, raw });
        return;
      }
      stopTimer = setTimeout(() => {
        timedOut = true;
        try {
          child.stdin.write("stop\n");
        } catch {}
        hardTimer = setTimeout(() => {
          finish({ available: false, error: "Pikafish 停止超时，已启用兜底。", fen, raw });
        }, 15000);
      }, safeMoveTime + 250);
    };
    const handleLine = (line) => {
      if (line === "uciok") {
        try {
          child.stdin.write(`setoption name Threads value ${safeThreads}\n`);
          child.stdin.write(`setoption name Hash value ${PIKAFISH_HASH_MB}\n`);
          child.stdin.write(`setoption name MultiPV value ${safeMultiPv}\n`);
          child.stdin.write("isready\n");
        } catch (error) {
          finish({ available: false, error: error.message, fen, raw });
        }
        return;
      }
      if (line === "readyok") {
        clearTimeout(initTimer);
        beginSearch();
        return;
      }
      if (line.startsWith("bestmove ")) {
        const bestmove = line.split(/\s+/)[1];
        const stats = parsePikafishStats(raw, safeThreads);
        finish({
          available: true,
          bestmove,
          move: uciToMove(bestmove),
          fen,
          raw,
          timedOut,
          ...stats
        });
      }
    };
    const initTimer = setTimeout(() => {
      finish({ available: false, error: "Pikafish 初始化超时", fen, raw });
    }, 30000);
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      appendRaw(text);
      buffer += text;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      lines.forEach(handleLine);
    });
    child.stderr.on("data", (chunk) => appendRaw(chunk.toString()));
    child.on("error", (error) => finish({ available: false, error: error.message, fen, raw }));
    child.on("exit", (code, signal) => {
      childExited = true;
      clearTimeout(killTimer);
      if (!settled) {
        finish({ available: false, error: `Pikafish 进程已退出，code=${code ?? "null"}，signal=${signal ?? "null"}`, fen, raw });
      }
    });
    try {
      child.stdin.write("uci\n");
    } catch (error) {
      finish({ available: false, error: error.message, fen, raw });
    }
  });
}

function runPikafish(options) {
  return runPikafishOnce(options);
}

async function handleApi(req, res, pathname, query) {
  cleanupRooms();

  if ((req.method === "GET" || req.method === "HEAD") && pathname === "/healthz") {
    sendJson(res, 200, {
      ok: true,
      rooms: ROOMS.size
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/health") {
    const probe = await runPikafish({
      board: createInitialBoard(),
      turn: "red",
      moveTime: 300,
      depth: null,
      multiPv: 1
    });
    sendJson(res, 200, {
      ok: true,
      rooms: ROOMS.size,
      pikafish: Boolean(probe.available && probe.move),
      enginePath: resolvePikafishPath() || null,
      depthReached: probe.depthReached || null,
      nnue: Boolean(probe.nnue),
      bestmove: probe.bestmove || null,
      error: probe.available ? null : probe.error || "Pikafish 探活失败"
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/engine/pikafish") {
    const body = await readJson(req);
    if (!Array.isArray(body.board)) {
      sendError(res, 400, "缺少棋盘数据");
      return;
    }
    const result = await runPikafish({
      board: body.board,
      turn: body.turn === "black" ? "black" : "red",
      moveTime: body.moveTime,
      depth: body.depth,
      multiPv: body.multiPv,
      threads: body.threads
    });
    sendJson(res, 200, result);
    return;
  }

  if (req.method === "POST" && pathname === "/api/match") {
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    if (!clientId) {
      sendError(res, 400, "缺少客户端 ID");
      return;
    }
    const timeControl = normalizeTimeControl(body.timeControl);
    cleanupRooms();
    if (MATCH_WAITING && MATCH_WAITING.clientId !== clientId) {
      const room = ROOMS.get(MATCH_WAITING.roomCode);
      if (room && !room.players.black) {
        room.players.black = clientId;
        room.updatedAt = Date.now();
        room.state.clocks.turnStartedAt = Date.now();
        const payload = {
          matched: true,
          roomCode: room.roomCode,
          color: "black",
          players: publicPlayers(room),
          state: room.state
        };
        MATCH_WAITING = null;
        sendJson(res, 200, payload);
        return;
      }
      MATCH_WAITING = null;
    }
    if (MATCH_WAITING?.clientId === clientId) {
      const room = ROOMS.get(MATCH_WAITING.roomCode);
      if (room) {
        sendJson(res, 200, {
          matched: false,
          roomCode: room.roomCode,
          color: "red",
          players: publicPlayers(room),
          state: room.state
        });
        return;
      }
      MATCH_WAITING = null;
    }
    const roomCode = makeRoomCode();
    const room = {
      roomCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      players: { red: clientId, black: null },
      timeControl,
      state: createInitialState(0, timeControl)
    };
    ROOMS.set(roomCode, room);
    MATCH_WAITING = { clientId, roomCode, createdAt: Date.now() };
    sendJson(res, 200, {
      matched: false,
      roomCode,
      color: "red",
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/rooms") {
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    if (!clientId) {
      sendError(res, 400, "缺少客户端 ID");
      return;
    }
    const timeControl = normalizeTimeControl(body.timeControl);
    const roomCode = makeRoomCode();
    const room = {
      roomCode,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      players: { red: clientId, black: null },
      timeControl,
      state: createInitialState(0, timeControl)
    };
    ROOMS.set(roomCode, room);
    sendJson(res, 200, {
      roomCode,
      color: "red",
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  const roomMatch = pathname.match(/^\/api\/rooms\/([A-Z0-9]{1,6})(?:\/(join|move|reset))?$/);
  if (!roomMatch) {
    sendError(res, 404, "接口不存在");
    return;
  }

  const roomCode = sanitizeRoomCode(roomMatch[1]);
  const action = roomMatch[2] || "";
  const room = ROOMS.get(roomCode);
  if (!room) {
    sendError(res, 404, "房间不存在");
    return;
  }
  room.updatedAt = Date.now();

  if (req.method === "GET" && !action) {
    const clientId = String(query.get("clientId") || "");
    applyClockTimeout(room);
    sendJson(res, 200, {
      roomCode,
      color: colorForClient(room, clientId),
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  if (req.method === "POST" && action === "join") {
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    if (!clientId) {
      sendError(res, 400, "缺少客户端 ID");
      return;
    }
    let color = colorForClient(room, clientId);
    if (!color) {
      if (!room.players.black) {
        room.players.black = clientId;
        color = "black";
        room.state.clocks.turnStartedAt = Date.now();
      } else if (!room.players.red) {
        room.players.red = clientId;
        color = "red";
        room.state.clocks.turnStartedAt = Date.now();
      } else {
        sendError(res, 409, "房间已满");
        return;
      }
    }
    sendJson(res, 200, {
      roomCode,
      color,
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  if (req.method === "POST" && action === "move") {
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    const color = body.color === "black" ? "black" : "red";
    const baseVersion = Number(body.baseVersion);
    if (!clientId || colorForClient(room, clientId) !== color) {
      sendError(res, 403, "玩家身份不匹配");
      return;
    }
    if (!room.players.red || !room.players.black) {
      sendError(res, 409, "等待双方入座");
      return;
    }
    if (applyClockTimeout(room)) {
      sendJson(res, 200, {
        roomCode,
        color,
        players: publicPlayers(room),
        state: room.state
      });
      return;
    }
    if (room.state.winner || room.state.draw) {
      sendError(res, 409, "本局已经结束");
      return;
    }
    if (room.state.turn !== color) {
      sendError(res, 409, "还没有轮到你");
      return;
    }
    if (room.state.version !== baseVersion) {
      sendError(res, 409, "棋局已更新，请刷新同步");
      return;
    }
    room.state = sanitizeState(body.state || {}, baseVersion + 1, room.timeControl);
    sendJson(res, 200, {
      roomCode,
      color,
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  if (req.method === "POST" && action === "reset") {
    const body = await readJson(req);
    const clientId = String(body.clientId || "");
    if (!colorForClient(room, clientId)) {
      sendError(res, 403, "玩家身份不匹配");
      return;
    }
    room.state = createInitialState(room.state.version + 1, room.timeControl);
    sendJson(res, 200, {
      roomCode,
      color: colorForClient(room, clientId),
      players: publicPlayers(room),
      state: room.state
    });
    return;
  }

  sendError(res, 405, "请求方法不支持");
}

function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(ROOT, safePath));
  if (!filePath.startsWith(ROOT)) {
    sendError(res, 403, "禁止访问");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      sendError(res, 404, "文件不存在");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": data.length
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/healthz" || pathname.startsWith("/api/")) {
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      });
      res.end();
      return;
    }
    handleApi(req, res, pathname, url.searchParams).catch((error) => {
      sendError(res, 400, error.message || "请求失败");
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    sendError(res, 405, "请求方法不支持");
    return;
  }
  serveStatic(req, res, pathname);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`象棋练棋辅助工具已启动：http://localhost:${PORT}`);
});
