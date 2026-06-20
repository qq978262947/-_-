const ENGINE_SCRIPT = "pikafish.js";

let pendingId = null;
let outputBuffer = "";
let stdoutLine = "";
let stderrLine = "";
let settled = false;

function send(payload) {
  self.postMessage(payload);
}

function finish(payload) {
  if (settled) {
    return;
  }
  settled = true;
  send(payload);
}

function appendOutput(text) {
  const line = String(text || "");
  outputBuffer += `${line}\n`;
  if (line.startsWith("bestmove ")) {
    finish({
      id: pendingId,
      ok: true,
      raw: outputBuffer,
      bestmove: line.split(/\s+/)[1] || "",
      source: "wasm"
    });
  }
}

function appendChar(target, code) {
  const char = String.fromCharCode(code);
  if (char === "\n") {
    appendOutput(target.value.replace(/\r$/, ""));
    target.value = "";
    return;
  }
  target.value += char;
}

function makeCommands(message) {
  const threads = Math.max(1, Math.min(8, Number(message.threads) || 1));
  return [
    "uci",
    `setoption name Threads value ${threads}`,
    message.multiPv ? `setoption name MultiPV value ${message.multiPv}` : "",
    "isready",
    "ucinewgame",
    `position fen ${message.fen}`,
    message.depth ? `go depth ${message.depth}` : `go movetime ${Math.max(100, Number(message.moveTime) || 800)}`,
    "quit"
  ].filter(Boolean);
}

function boot(message) {
  pendingId = message.id;
  const commands = makeCommands(message);
  try {
    self.Module = {
      arguments: [commands.join("\\n")],
      mainScriptUrlOrBlob: ENGINE_SCRIPT,
      noInitialRun: false,
      locateFile(path) {
        return path;
      },
      preRun(module) {
        const fs = module?.FS || self.Module?.FS;
        if (fs?.createLazyFile) {
          try {
            fs.createLazyFile("/", "pikafish.nnue", "pikafish.nnue", true, false);
          } catch {}
        }
      },
      stdout: (code) => appendChar({ get value() { return stdoutLine; }, set value(value) { stdoutLine = value; } }, code),
      stderr: (code) => appendChar({ get value() { return stderrLine; }, set value(value) { stderrLine = value; } }, code),
      print: appendOutput,
      printErr: appendOutput,
      onAbort(reason) {
        finish({ id: pendingId, ok: false, error: `Pikafish WASM 运行中断：${reason || "未知原因"}`, raw: outputBuffer });
      },
      onRuntimeInitialized() {
        send({ type: "ready", ok: true });
      }
    };
    importScripts(`${ENGINE_SCRIPT}?v=${Date.now()}`);
  } catch (error) {
    finish({
      id: pendingId,
      ok: false,
      error: `Pikafish WASM 未加载：${error?.message || String(error)}`,
      raw: outputBuffer
    });
  }
  self.setTimeout(() => {
    finish({ id: pendingId, ok: false, error: "Pikafish WASM 分析超时", raw: outputBuffer });
  }, Math.max(3000, Number(message.timeoutMs) || 30000));
}

self.onmessage = (event) => {
  const message = event.data || {};
  if (message.type !== "analyze") {
    return;
  }
  boot({ ...message, id: message.id || 1 });
};
