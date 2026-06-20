(() => {
  const ROWS = 10;
  const COLS = 9;
  const STORAGE_CLIENT_ID = "xianqi-mini-client-id";
  const STORAGE_GUIDE_DEPTH = "xianqi-mini-guide-depth";
  const STORAGE_SAVED_GAMES = "xianqi-mini-saved-games";
  const STORAGE_BOARD_THEME = "xianqi-mini-board-theme";
  const STORAGE_AI_LEVEL = "xianqi-mini-ai-level";
  const STORAGE_GUIDE_MULTI_THREAD = "xianqi-mini-guide-multi-thread";
  const DEFAULT_GUIDE_DEPTH = 17;
  const ONLINE_POLL_MS = 900;
  const ONLINE_MATCH_TIMEOUT_MS = 30000;
  const MOVE_ANIMATION_MS = 160;
  const GUIDE_ANIMATION_MS = MOVE_ANIMATION_MS * 2.5;
  const AI_THINK_DELAY_MS = 80;
  const AI_AFTER_MOVE_DELAY_MS = MOVE_ANIMATION_MS + 70;
  const AI_WATCHDOG_EXTRA_MS = 65000;
  const AI_WATCHDOG_MAX_MS = 90000;
  const MATE_SCORE = 1000000;
  const SEARCH_INF = 1000000000;
  const REPETITION_LIMIT = 3;
  const API_BASE = window.XIANQI_API_BASE || (window.location.protocol === "file:" ? "http://localhost:5178" : "");
  const PIKAFISH_WASM_WORKER_URL = "engines/pikafish-wasm/pikafish-wasm-worker.js";
  const DESKTOP_MODE = new URLSearchParams(window.location.search).get("desktop") === "1";

  const LABELS = {
    red: {
      king: "帅",
      advisor: "仕",
      bishop: "相",
      knight: "马",
      rook: "车",
      cannon: "炮",
      pawn: "兵"
    },
    black: {
      king: "将",
      advisor: "士",
      bishop: "象",
      knight: "马",
      rook: "车",
      cannon: "炮",
      pawn: "卒"
    }
  };

  const COLOR_NAMES = {
    red: "红方",
    black: "黑方"
  };

  const MODE_NAMES = {
    ai: "人机对战",
    online: "玩家对练",
    local: "双人练习"
  };

  const AI_LEVEL_NAMES = {
    newbie: "新手",
    easy: "入门",
    normal: "稳健",
    hard: "深思",
    bookMaster: "谱库大师",
    master: "最强AI"
  };

  const BOOK_FIRST_LEVELS = new Set(["newbie", "easy", "normal", "hard", "bookMaster"]);
  const BOOK_SELECTION_CONFIG = {
    newbie: { bestProbability: 0.25, positiveOnlyOthers: false },
    easy: { bestProbability: 0.5, positiveOnlyOthers: false },
    normal: { bestProbability: 0.7, positiveOnlyOthers: false },
    hard: { bestProbability: 0.7, positiveOnlyOthers: true },
    bookMaster: { bestProbability: 0.8, positiveOnlyOthers: true }
  };

  const FIRST_AI_MOVE_STRATEGY = {
    random: 0.75,
    book: 0.2,
    engine: 0.05
  };

  const GUIDE_MULTI_THREAD_DEPTH = 20;
  const GUIDE_MAX_THREADS = 8;

  const AI_SEARCH_CONFIG = {
    newbie: { minDepth: 1, maxDepth: 1, timeMs: 120, rootWidth: 4, nodeWidth: 2, serverMs: 120 },
    easy: { minDepth: 1, maxDepth: 2, timeMs: 220, rootWidth: 8, nodeWidth: 4, serverMs: 180 },
    normal: { minDepth: 4, maxDepth: 6, timeMs: 950, rootWidth: 16, nodeWidth: 6, serverMs: 650 },
    hard: { minDepth: 9, maxDepth: 12, timeMs: 2400, rootWidth: 20, nodeWidth: 7, serverMs: 1400 },
    bookMaster: { minDepth: 12, maxDepth: Infinity, timeMs: 15000, rootWidth: Infinity, nodeWidth: Infinity, serverMs: 15000 },
    master: { minDepth: 12, maxDepth: Infinity, timeMs: 15000, rootWidth: Infinity, nodeWidth: Infinity, serverMs: 15000 }
  };

  const CLIENT_FALLBACK_CONFIG = {
    newbie: { maxDepth: 1, timeMs: 120, nodeWidth: 3, rootWidth: 5 },
    easy: { maxDepth: 1, timeMs: 220, nodeWidth: 6, rootWidth: 10 },
    normal: { maxDepth: 2, timeMs: 850, nodeWidth: 10, rootWidth: 18 },
    hard: { maxDepth: 4, timeMs: 2000, nodeWidth: 14, rootWidth: 24 },
    bookMaster: { maxDepth: 7, timeMs: 5200, nodeWidth: 22, rootWidth: Infinity },
    master: { maxDepth: 7, timeMs: 5200, nodeWidth: 22, rootWidth: Infinity }
  };

  const TIME_CONTROLS = {
    "10-5": { id: "10-5", stepMs: 10 * 1000, totalMs: 5 * 60 * 1000, label: "10秒一步 · 局时5分钟" },
    "30-10": { id: "30-10", stepMs: 30 * 1000, totalMs: 10 * 60 * 1000, label: "30秒一步 · 局时10分钟" },
    "120-40": { id: "120-40", stepMs: 2 * 60 * 1000, totalMs: 40 * 60 * 1000, label: "2分钟一步 · 局时40分钟" },
    "300-100": { id: "300-100", stepMs: 5 * 60 * 1000, totalMs: 100 * 60 * 1000, label: "5分钟一步 · 局时100分钟" },
    "900-300": { id: "900-300", stepMs: 15 * 60 * 1000, totalMs: 300 * 60 * 1000, label: "15分钟一步 · 局时300分钟" },
    "1800-600": { id: "1800-600", stepMs: 30 * 60 * 1000, totalMs: 600 * 60 * 1000, label: "30分钟一步 · 局时600分钟" },
    "3600-1200": { id: "3600-1200", stepMs: 60 * 60 * 1000, totalMs: 1200 * 60 * 1000, label: "60分钟一步 · 局时1200分钟" }
  };

  const OPENING_BOOK_LINES = [
    {
      id: "meihua-screen-right",
      source: "梅花谱",
      family: "屏风马破当头炮",
      variation: "右马屏风马 · 挺卒活马 · 平炮兑车",
      plan: "先稳中宫，双马成屏风；对红方中炮和过河车，以平炮、活马、兑车削峰。",
      weight: 18,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 7, 2, 6, "右马成屏风"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 3, 6, 4, 6, "挺卒活马"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出"),
        bookMove("red", 9, 7, 3, 7, "直车过河"),
        bookMove("black", 2, 7, 2, 8, "平炮兑车")
      ]
    },
    {
      id: "meihua-screen-left",
      source: "梅花谱",
      family: "屏风马破当头炮",
      variation: "左马屏风马 · 左翼兑车",
      plan: "从另一翼构成屏风马，先让车马协调，再把红方直车引入可兑位置。",
      weight: 14,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 1, 2, 2, "左马成屏风"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 3, 2, 4, 2, "挺卒活马"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出"),
        bookMove("red", 9, 1, 8, 1, "左车巡河"),
        bookMove("black", 2, 1, 2, 0, "平炮邀兑")
      ]
    },
    {
      id: "juzhongmi-shun-cannon",
      source: "橘中秘",
      family: "顺炮局",
      variation: "中炮对顺炮 · 车马抢先",
      plan: "顺炮对攻，快速出马出车，争取中路和肋道主动权。",
      weight: 15,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 2, 7, 2, 4, "顺炮还中"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出"),
        bookMove("red", 9, 7, 5, 7, "巡河车"),
        bookMove("black", 0, 1, 2, 2, "补左马")
      ]
    },
    {
      id: "juzhongmi-opposite-cannon",
      source: "橘中秘",
      family: "列炮局",
      variation: "中炮对列炮 · 侧翼反击",
      plan: "列炮保持对攻张力，辅以左马和左车，伺机打中兵与侧翼反击。",
      weight: 12,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 2, 1, 2, 4, "列炮还中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出"),
        bookMove("red", 9, 1, 8, 1, "左车巡河"),
        bookMove("black", 3, 2, 4, 2, "挺卒争先")
      ]
    },
    {
      id: "jinqpeng-central-cannon",
      source: "金鹏十八变 / 适情雅趣",
      family: "顺炮全局",
      variation: "巡河车 · 先兑后攻",
      plan: "以古谱全局的顺炮框架组织出子，优先保证车炮联动与中兵压力。",
      weight: 11,
      moves: [
        bookMove("red", 7, 1, 7, 4, "左炮平中"),
        bookMove("black", 2, 1, 2, 4, "顺炮还中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出"),
        bookMove("red", 9, 1, 5, 1, "巡河车"),
        bookMove("black", 0, 7, 2, 6, "补右马")
      ]
    },
    {
      id: "zichudonglai-free-cannon",
      source: "自出洞来无敌手",
      family: "信手炮变化",
      variation: "左中炮 · 马炮联攻",
      plan: "保留古谱里先手炮局的锐气，但后手不贪兵，先用马炮抢要点。",
      weight: 9,
      moves: [
        bookMove("red", 7, 1, 7, 4, "左炮平中"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 2, 7, 2, 4, "右炮巡中"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出")
      ]
    },
    {
      id: "fan-meihua-central",
      source: "反梅花谱",
      family: "中炮攻屏风马",
      variation: "以炮制马 · 先手思路反借",
      plan: "吸收反梅花谱的攻势观念，后手以中炮牵制，避免被单纯屏风马定型。",
      weight: 9,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 2, 7, 2, 4, "中炮牵制"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 6, 4, 5, 4, "中兵推进"),
        bookMove("black", 0, 7, 2, 6, "右马护中")
      ]
    },
    {
      id: "modern-palcorner",
      source: "现代布局库",
      family: "仙人指路应法",
      variation: "对兵局 · 转中炮",
      plan: "对红方先挺兵，先对挺稳住马路，再根据形势转入中炮或屏风马。",
      weight: 10,
      moves: [
        bookMove("red", 6, 2, 5, 2, "七路兵进一"),
        bookMove("black", 3, 2, 4, 2, "对挺卒"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 7, 1, 7, 4, "左炮转中"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "modern-elephant",
      source: "现代布局库",
      family: "飞相局应法",
      variation: "飞相对中炮 · 抢中路",
      plan: "红方先飞相偏稳，后手直接中炮争先，再以马路和车路补足速度。",
      weight: 10,
      moves: [
        bookMove("red", 9, 6, 7, 4, "飞右相"),
        bookMove("black", 2, 7, 2, 4, "中炮争先"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "modern-horse",
      source: "现代布局库",
      family: "起马局应法",
      variation: "挺卒制马 · 屏风结构",
      plan: "红方先起马时，后手先挺卒限制马路，再视中路形势选择炮或屏风马。",
      weight: 8,
      moves: [
        bookMove("red", 9, 7, 7, 6, "右马先起"),
        bookMove("black", 3, 6, 4, 6, "挺卒制马"),
        bookMove("red", 7, 7, 7, 4, "右炮转中"),
        bookMove("black", 0, 7, 2, 6, "右马成屏风"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "modern-palace-cannon",
      source: "现代布局库",
      family: "过宫炮局",
      variation: "过宫炮对起马 · 车马抢点",
      plan: "过宫炮先占肋道，后手以马卒限制炮路，再补中路火力。",
      weight: 6,
      moves: [
        bookMove("red", 7, 7, 7, 3, "过宫炮"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 3, 6, 4, 6, "挺卒制马"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "modern-river-cannon-left",
      source: "现代布局库",
      family: "巡河炮局",
      variation: "左炮巡河 · 马卒反制",
      plan: "巡河炮较冷门，后手优先出马挺卒，避免让炮长期压制马路。",
      weight: 4,
      moves: [
        bookMove("red", 7, 1, 5, 1, "2路巡河炮"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 3, 2, 4, 2, "挺卒制马"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "modern-river-cannon-right",
      source: "现代布局库",
      family: "巡河炮局",
      variation: "右炮巡河 · 对称应法",
      plan: "对右巡河炮，以右马和右卒先限制炮路，再择机转中炮。",
      weight: 4,
      moves: [
        bookMove("red", 7, 7, 5, 7, "9路巡河炮"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 3, 6, 4, 6, "挺卒制马"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 2, 1, 2, 4, "左炮转中")
      ]
    },
    {
      id: "modern-rook-start",
      source: "现代布局库",
      family: "起车局",
      variation: "左车起动 · 炮马争先",
      plan: "首着起车较少见，后手以中炮和马路抢速度，避免被车先手压制。",
      weight: 3,
      moves: [
        bookMove("red", 9, 0, 8, 0, "左车起动"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 8, 0, 8, 4, "横车占肋"),
        bookMove("black", 3, 2, 4, 2, "挺卒活马")
      ]
    },
    {
      id: "modern-center-pawn",
      source: "现代布局库",
      family: "中兵局",
      variation: "中兵试探 · 中炮反击",
      plan: "先挺中兵时，后手直接中炮抢中线，再用双马补足两翼。",
      weight: 7,
      moves: [
        bookMove("red", 6, 4, 5, 4, "中兵推进"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动")
      ]
    },
    {
      id: "meihua-central-cannon-river-rook",
      source: "梅花谱 / 现代屏风马",
      family: "中炮过河车",
      variation: "中炮过河车对屏风马平炮兑车",
      plan: "红方直车过河压马，后手以平炮邀兑，辅以挺卒活马化解先手。",
      weight: 16,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 7, 2, 6, "右马屏风"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 1, 2, 2, "左马屏风"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出"),
        bookMove("red", 9, 7, 3, 7, "右车过河"),
        bookMove("black", 2, 7, 2, 8, "平炮兑车")
      ]
    },
    {
      id: "central-cannon-anti-palace-horse",
      source: "现代布局库",
      family: "中炮对反宫马",
      variation: "反宫马 · 炮马互保",
      plan: "后手以反宫马构成弹性防线，保留中炮反击与边路出车空间。",
      weight: 12,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 7, 2, 6, "右马补防")
      ]
    },
    {
      id: "central-cannon-single-horse",
      source: "现代布局库",
      family: "中炮对单提马",
      variation: "单提马 · 横车护肋",
      plan: "单提马以一翼快速出动，另一翼用炮车补防，避免中路被持续压制。",
      weight: 8,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 1, 2, 2, "左马单提"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 0, 0, 1, "左车亮出"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 2, 7, 2, 4, "右炮补中")
      ]
    },
    {
      id: "advisor-angle-cannon",
      source: "现代布局库",
      family: "士角炮",
      variation: "士角炮对挺卒 · 车马舒展",
      plan: "士角炮先占斜线，后手用挺卒和出马限制其后续转中速度。",
      weight: 7,
      moves: [
        bookMove("red", 7, 1, 7, 3, "士角炮"),
        bookMove("black", 3, 2, 4, 2, "挺卒制马"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "palcorner-right-pawn",
      source: "现代布局库",
      family: "仙人指路应法",
      variation: "三路兵对挺卒 · 转屏风",
      plan: "对三路兵先手，后手对挺同翼卒，随后双马成形转入屏风结构。",
      weight: 10,
      moves: [
        bookMove("red", 6, 6, 5, 6, "三路兵进一"),
        bookMove("black", 3, 6, 4, 6, "对挺卒"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 7, 7, 7, 4, "右炮转中"),
        bookMove("black", 0, 1, 2, 2, "左马补防")
      ]
    },
    {
      id: "elephant-left",
      source: "现代布局库",
      family: "飞相局应法",
      variation: "飞左相对过宫炮",
      plan: "红方飞左相偏稳，后手可用过宫炮和双马争取肋道主动。",
      weight: 8,
      moves: [
        bookMove("red", 9, 2, 7, 4, "飞左相"),
        bookMove("black", 2, 1, 2, 4, "左炮转中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 7, 2, 6, "右马出动")
      ]
    },
    {
      id: "horse-left-opening",
      source: "现代布局库",
      family: "起马局应法",
      variation: "左马起局 · 对卒活马",
      plan: "对左马先起，后手用同翼卒限制马路，再用中炮争取中线。",
      weight: 8,
      moves: [
        bookMove("red", 9, 1, 7, 2, "左马先起"),
        bookMove("black", 3, 2, 4, 2, "挺卒制马"),
        bookMove("red", 7, 1, 7, 4, "左炮转中"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 1, 2, 2, "左马出动")
      ]
    },
    {
      id: "palace-cannon-counter-center",
      source: "现代布局库",
      family: "过宫炮局",
      variation: "过宫炮对中炮抢先",
      plan: "面对过宫炮，后手直接中炮抢中线，迫使红方补马补车后再定型。",
      weight: 7,
      moves: [
        bookMove("red", 7, 7, 7, 3, "过宫炮"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "river-cannon-central-counter",
      source: "现代布局库",
      family: "巡河炮局",
      variation: "巡河炮对中炮 · 马炮反击",
      plan: "巡河炮压制马路时，后手以中炮和对翼马抢速度，不给红炮长期压制。",
      weight: 6,
      moves: [
        bookMove("red", 7, 1, 5, 1, "2路巡河炮"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "rook-start-right",
      source: "现代布局库",
      family: "起车局",
      variation: "右车起动 · 中炮反击",
      plan: "首着起右车较冷，后手以中炮抢先，随后出马限制横车线路。",
      weight: 3,
      moves: [
        bookMove("red", 9, 8, 8, 8, "右车起动"),
        bookMove("black", 2, 1, 2, 4, "左炮转中"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 8, 8, 8, 4, "横车占肋"),
        bookMove("black", 3, 6, 4, 6, "挺卒活马")
      ]
    },
    {
      id: "central-cannon-left-open",
      source: "橘中秘 / 中炮体系",
      family: "中炮局",
      variation: "左炮中炮 · 屏风马应法",
      plan: "先手左炮成中炮时，后手仍以屏风马为主，先稳马路再争车速。",
      weight: 13,
      moves: [
        bookMove("red", 7, 1, 7, 4, "左炮平中"),
        bookMove("black", 0, 7, 2, 6, "右马屏风"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马屏风"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出"),
        bookMove("red", 9, 1, 5, 1, "巡河车"),
        bookMove("black", 3, 2, 4, 2, "挺卒活马")
      ]
    },
    {
      id: "central-cannon-five-six-cannon",
      source: "梅花谱 / 五六炮",
      family: "中炮屏风马",
      variation: "五六炮进攻 · 屏风马稳守",
      plan: "红方中炮后补另一炮形成五六炮，后手双马屏风，先固中路再寻兑子。",
      weight: 12,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 7, 2, 6, "右马屏风"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 1, 2, 2, "左马屏风"),
        bookMove("red", 7, 1, 7, 5, "左炮过宫"),
        bookMove("black", 3, 6, 4, 6, "挺卒活马"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "central-cannon-seven-pawn",
      source: "梅花谱 / 中炮七兵",
      family: "中炮屏风马",
      variation: "中炮进七兵 · 屏风马挺卒",
      plan: "红方以七兵活马，后手对挺三卒，形成常见中炮七兵对屏风马结构。",
      weight: 12,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 7, 2, 6, "右马屏风"),
        bookMove("red", 6, 2, 5, 2, "七兵进一"),
        bookMove("black", 3, 2, 4, 2, "挺3路卒"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马屏风"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出")
      ]
    },
    {
      id: "central-cannon-three-pawn",
      source: "梅花谱 / 中炮三兵",
      family: "中炮屏风马",
      variation: "中炮进三兵 · 屏风马挺卒",
      plan: "红方三兵活右翼马，后手以同翼卒制马，进入对称屏风马变例。",
      weight: 12,
      moves: [
        bookMove("red", 7, 7, 7, 4, "右炮平中"),
        bookMove("black", 0, 1, 2, 2, "左马屏风"),
        bookMove("red", 6, 6, 5, 6, "三兵进一"),
        bookMove("black", 3, 6, 4, 6, "挺7路卒"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马屏风"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "palcorner-elephant-reply",
      source: "现代布局库",
      family: "仙人指路应法",
      variation: "仙人指路对飞象",
      plan: "后手以飞象稳住中防，随后出马补车，避免被红方转中炮抢攻。",
      weight: 9,
      moves: [
        bookMove("red", 6, 2, 5, 2, "七路兵进一"),
        bookMove("black", 0, 2, 2, 4, "飞左象"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 7, 1, 7, 4, "左炮转中"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "palcorner-cannon-reply",
      source: "现代布局库",
      family: "仙人指路应法",
      variation: "仙人指路对卒底炮",
      plan: "后手以卒底炮反制兵线，迫使红方先补马，再选择中路或边路发展。",
      weight: 8,
      moves: [
        bookMove("red", 6, 6, 5, 6, "三路兵进一"),
        bookMove("black", 2, 1, 2, 6, "卒底炮"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 7, 7, 7, 4, "右炮转中"),
        bookMove("black", 2, 7, 2, 4, "右炮转中")
      ]
    },
    {
      id: "elephant-right-palace-cannon",
      source: "现代布局库",
      family: "飞相局应法",
      variation: "飞右相对过宫炮",
      plan: "红方飞相稳健，后手过宫炮争肋道，再双马出动保证速度。",
      weight: 8,
      moves: [
        bookMove("red", 9, 6, 7, 4, "飞右相"),
        bookMove("black", 2, 1, 2, 5, "左炮过宫"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 0, 8, 0, 7, "右车亮出")
      ]
    },
    {
      id: "advisor-angle-right",
      source: "现代布局库",
      family: "士角炮",
      variation: "右士角炮 · 对挺活马",
      plan: "右士角炮蓄势转中，后手以对挺和出马保持均衡。",
      weight: 7,
      moves: [
        bookMove("red", 7, 7, 7, 5, "右士角炮"),
        bookMove("black", 3, 6, 4, 6, "挺卒制马"),
        bookMove("red", 9, 7, 7, 6, "右马出动"),
        bookMove("black", 0, 7, 2, 6, "右马出动"),
        bookMove("red", 9, 8, 9, 7, "右车亮出"),
        bookMove("black", 2, 1, 2, 4, "左炮转中")
      ]
    },
    {
      id: "palace-cannon-left",
      source: "现代布局库",
      family: "过宫炮局",
      variation: "左炮过宫 · 中炮反击",
      plan: "左炮过宫少见，后手以中炮抢先，再用左马制约其转中路线。",
      weight: 6,
      moves: [
        bookMove("red", 7, 1, 7, 5, "左炮过宫"),
        bookMove("black", 2, 7, 2, 4, "右炮转中"),
        bookMove("red", 9, 1, 7, 2, "左马出动"),
        bookMove("black", 0, 1, 2, 2, "左马出动"),
        bookMove("red", 9, 0, 9, 1, "左车亮出"),
        bookMove("black", 0, 0, 0, 1, "左车亮出")
      ]
    }
  ];

  const THEMES = {
    classic: {
      name: "红花梨",
      swatch: "linear-gradient(135deg, #b85c35 0%, #6f2d1e 45%, #d1945f 100%)",
      outer: "#6f2d1e",
      board: "#c87543",
      boardAlt: "#e0a16b",
      line: "#4f2419",
      river: "rgba(91, 50, 27, 0.14)",
      redPiece: "#fff0d5",
      blackPiece: "#f2d9ad",
      redText: "#a83027",
      blackText: "#34281f",
      accent: "#bf1d24",
      shadow: "rgba(77, 42, 19, 0.3)"
    },
    huanghuali: {
      name: "黄花梨",
      swatch: "linear-gradient(135deg, #f0bf67 0%, #9b5a24 48%, #f4d18d 100%)",
      outer: "#86511f",
      board: "#d79a4d",
      boardAlt: "#f0c77a",
      line: "#5c3517",
      river: "rgba(92, 53, 23, 0.13)",
      redPiece: "#fff2d8",
      blackPiece: "#f0d9ac",
      redText: "#a2362d",
      blackText: "#3a2b20",
      accent: "#9b5a24",
      shadow: "rgba(75, 42, 14, 0.34)"
    },
    suanzhi: {
      name: "酸枝",
      swatch: "linear-gradient(135deg, #9d4a3a 0%, #5d2925 52%, #c27a58 100%)",
      outer: "#5a2823",
      board: "#a75241",
      boardAlt: "#c87958",
      line: "#3c1b18",
      river: "rgba(60, 27, 24, 0.14)",
      redPiece: "#f7e6ce",
      blackPiece: "#dac39a",
      redText: "#a9342b",
      blackText: "#30231e",
      accent: "#b27a46",
      shadow: "rgba(18, 8, 7, 0.42)"
    },
    ebony: {
      name: "黑檀",
      swatch: "linear-gradient(135deg, #4b4438 0%, #1b1a17 52%, #7b6849 100%)",
      outer: "#1d1b17",
      board: "#4a4234",
      boardAlt: "#756141",
      line: "#d6b36a",
      river: "rgba(214, 179, 106, 0.13)",
      redPiece: "#f4dfc6",
      blackPiece: "#d7c5a9",
      redText: "#ac342d",
      blackText: "#2d2720",
      accent: "#d6b36a",
      shadow: "rgba(0, 0, 0, 0.5)"
    },
    wumu: {
      name: "乌木",
      swatch: "linear-gradient(135deg, #383632 0%, #141414 45%, #5b5144 100%)",
      outer: "#171615",
      board: "#36332d",
      boardAlt: "#5c5143",
      line: "#caa35e",
      river: "rgba(202, 163, 94, 0.12)",
      redPiece: "#f3ddc4",
      blackPiece: "#d1c2aa",
      redText: "#a9322a",
      blackText: "#2b261f",
      accent: "#caa35e",
      shadow: "rgba(0, 0, 0, 0.55)"
    },
    zitan: {
      name: "小叶紫檀",
      swatch: "linear-gradient(135deg, #8d3342 0%, #4a1822 50%, #bd6670 100%)",
      outer: "#4a1822",
      board: "#843747",
      boardAlt: "#b35f67",
      line: "#321018",
      river: "rgba(50, 16, 24, 0.14)",
      redPiece: "#f7e2cd",
      blackPiece: "#d7bea0",
      redText: "#aa312b",
      blackText: "#30231f",
      accent: "#d2a15d",
      shadow: "rgba(18, 3, 8, 0.48)"
    },
    obsidian: {
      name: "深曜石",
      material: "crystal",
      swatch: "linear-gradient(135deg, #030712 0%, #0f172a 42%, #6fd3ff 55%, #111827 100%)",
      outer: "#07101f",
      board: "#111a2b",
      boardAlt: "#1b2940",
      line: "#b8e8ff",
      river: "rgba(184, 232, 255, 0.1)",
      redPiece: "#f4e5d4",
      blackPiece: "#d7e2ec",
      redText: "#b93a37",
      blackText: "#203040",
      accent: "#9bdcff",
      shadow: "rgba(0, 0, 0, 0.62)"
    }
  };

  const PIECE_VALUES = {
    king: 10000,
    rook: 620,
    cannon: 350,
    knight: 300,
    bishop: 135,
    advisor: 135,
    pawn: 80
  };

  const els = {
    gameScreen: document.getElementById("gameScreen"),
    canvas: document.getElementById("boardCanvas"),
    canvasWrap: document.getElementById("canvasWrap"),
    gameStatus: document.getElementById("gameStatus"),
    modeBadge: document.getElementById("modeBadge"),
    turnBadge: document.getElementById("turnBadge"),
    modeButtons: [...document.querySelectorAll("[data-mode]")],
    aiButtons: [...document.querySelectorAll("[data-ai-level]")],
    playerColorButtons: [...document.querySelectorAll("[data-player-color]")],
    aiSection: document.getElementById("aiSection"),
    onlineSection: document.getElementById("onlineSection"),
    timeControlSelect: document.getElementById("timeControlSelect"),
    matchRoomBtn: document.getElementById("matchRoomBtn"),
    createRoomBtn: document.getElementById("createRoomBtn"),
    joinRoomBtn: document.getElementById("joinRoomBtn"),
    roomCodeInput: document.getElementById("roomCodeInput"),
    roomInfo: document.getElementById("roomInfo"),
    bookTitle: document.getElementById("bookTitle"),
    bookMeta: document.getElementById("bookMeta"),
    themeList: document.getElementById("themeList"),
    moveList: document.getElementById("moveList"),
    savedGameList: document.getElementById("savedGameList"),
    resetBtn: document.getElementById("resetBtn"),
    flipBtn: document.getElementById("flipBtn"),
    redCaptured: document.getElementById("redCaptured"),
    blackCaptured: document.getElementById("blackCaptured"),
    reviewStartBtn: document.getElementById("reviewStartBtn"),
    reviewPrevBtn: document.getElementById("reviewPrevBtn"),
    reviewNextBtn: document.getElementById("reviewNextBtn"),
    reviewLiveBtn: document.getElementById("reviewLiveBtn"),
    reviewStatus: document.getElementById("reviewStatus"),
    guideSection: document.getElementById("guideSection"),
    guideDepthInput: document.getElementById("guideDepthInput"),
    guideMultiThreadInput: document.getElementById("guideMultiThreadInput"),
    guideBtn: document.getElementById("guideBtn"),
    guideInfo: document.getElementById("guideInfo"),
    guideLines: document.getElementById("guideLines"),
    guideStartBtn: document.getElementById("guideStartBtn"),
    guidePrevBtn: document.getElementById("guidePrevBtn"),
    guidePlayBtn: document.getElementById("guidePlayBtn"),
    guideNextBtn: document.getElementById("guideNextBtn"),
    guideEndBtn: document.getElementById("guideEndBtn"),
    mateModal: document.getElementById("mateModal"),
    mateTitle: document.getElementById("mateTitle"),
    mateSummary: document.getElementById("mateSummary"),
    mateDetail: document.getElementById("mateDetail"),
    mateReviewBtn: document.getElementById("mateReviewBtn"),
    mateNewBtn: document.getElementById("mateNewBtn"),
    aboutBtn: document.getElementById("aboutBtn"),
    donateBtn: document.getElementById("donateBtn"),
    infoModal: document.getElementById("infoModal"),
    infoCloseBtn: document.getElementById("infoCloseBtn"),
    infoEyebrow: document.getElementById("infoEyebrow"),
    infoTitle: document.getElementById("infoTitle"),
    aboutPanel: document.getElementById("aboutPanel"),
    donatePanel: document.getElementById("donatePanel")
  };

  const ctx = els.canvas.getContext("2d", { alpha: false, desynchronized: true });
  let metrics = null;
  let pollTimer = null;
  let aiTimer = null;
  let aiWatchdogTimer = null;
  let reviewPlayTimer = null;
  let matchTimer = null;
  let matchStartedAt = 0;
  let guideRefreshTimer = null;
  let pikafishWasm = null;
  let animationFrame = null;
  let animationTimeout = null;
  let flipRenderFrame = null;
  let onlineBusy = false;
  const pieceSpriteCache = new Map();

  const game = {
    mode: "ai",
    aiLevel: "master",
    board: createInitialBoard(),
    turn: "red",
    winner: null,
    draw: false,
    selected: null,
    legalMoves: [],
    lastMove: null,
    history: [],
    moveKeys: [],
    positionKeys: [],
    snapshots: [],
    captured: { red: [], black: [] },
    theme: "huanghuali",
    flipped: false,
    playerColor: "red",
    online: null,
    clocks: null,
    timeControl: TIME_CONTROLS["30-10"],
    version: 0,
    notice: "红先，请落子。",
    thinking: false,
    aiRequestId: 0,
    animation: null,
    bookInfo: null,
    reviewIndex: null,
    guide: {
      active: false,
      loading: false,
      index: 0,
      snapshots: [],
      moves: [],
      info: null,
      variations: [],
      selectedVariation: 0,
      playing: false,
      intent: null,
      analysis: null,
      trail: [],
      trailIndex: 0,
      controller: null,
      token: 0
    },
    pendingMateModal: null,
    endReason: null,
    mateModalShownForVersion: null,
    savedArchiveVersion: null,
    archiveReviewing: false,
    archiveReturnSnapshot: null
  };

  function createInitialBoard() {
    const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
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

  function clonePiece(piece) {
    return piece ? { ...piece } : null;
  }

  function cloneBoard(board) {
    return board.map((row) => row.map(clonePiece));
  }

  function cloneCaptured(captured) {
    return {
      red: (captured?.red || []).map(clonePiece).filter(Boolean),
      black: (captured?.black || []).map(clonePiece).filter(Boolean)
    };
  }

  function buildReviewSnapshot() {
    return {
      board: cloneBoard(game.board),
      turn: game.turn,
      winner: game.winner,
      draw: game.draw,
      lastMove: game.lastMove ? structuredClone(game.lastMove) : null,
      captured: cloneCaptured(game.captured)
    };
  }

  function makeSnapshot() {
    return {
      board: cloneBoard(game.board),
      turn: game.turn,
      winner: game.winner,
      draw: game.draw,
      lastMove: game.lastMove ? structuredClone(game.lastMove) : null,
      history: game.history.map((item) => ({ ...item })),
      moveKeys: [...game.moveKeys],
      positionKeys: [...game.positionKeys],
      snapshots: game.snapshots.map((item) => structuredClone(item)),
      captured: cloneCaptured(game.captured),
      timeControl: game.timeControl,
      clocks: game.clocks ? { ...game.clocks } : null,
      endReason: game.endReason ? { ...game.endReason } : null,
      savedArchiveVersion: game.savedArchiveVersion,
      version: game.version
    };
  }

  function loadSnapshot(snapshot, options = {}) {
    const animationMove = options.animateLastMove && snapshot.lastMove?.piece ? structuredClone(snapshot.lastMove) : null;
    game.board = cloneBoard(snapshot.board || createInitialBoard());
    game.turn = snapshot.turn || "red";
    game.winner = snapshot.winner || null;
    game.draw = Boolean(snapshot.draw);
    game.lastMove = snapshot.lastMove ? structuredClone(snapshot.lastMove) : null;
    game.history = Array.isArray(snapshot.history) ? snapshot.history.map((item) => ({ ...item })) : [];
    game.moveKeys = Array.isArray(snapshot.moveKeys) ? [...snapshot.moveKeys] : deriveMoveKeysFromHistory(snapshot.history);
    game.positionKeys = Array.isArray(snapshot.positionKeys) ? [...snapshot.positionKeys] : [positionKey(game.board, game.turn)];
    game.snapshots = Array.isArray(snapshot.snapshots) ? snapshot.snapshots.map((item) => structuredClone(item)) : [buildReviewSnapshot()];
    game.captured = cloneCaptured(snapshot.captured);
    game.timeControl = inferTimeControlFromSnapshot(snapshot);
    game.clocks = sanitizeClientClocks(snapshot.clocks, game.timeControl);
    game.version = Number.isFinite(snapshot.version) ? snapshot.version : 0;
    game.selected = null;
    game.legalMoves = [];
    game.thinking = false;
    game.reviewIndex = null;
    game.bookInfo = null;
    game.endReason = snapshot.endReason ? { ...snapshot.endReason } : null;
    game.pendingMateModal = game.endReason
      ? buildEndAnnouncement({ ...game.endReason, version: game.version })
      : game.winner && game.lastMove ? buildMateAnnouncementFromLastMove() : null;
    game.savedArchiveVersion = snapshot.savedArchiveVersion ?? null;
    game.archiveReviewing = false;
    game.archiveReturnSnapshot = null;
    stopMoveAnimation();
    if (animationMove) {
      startMoveAnimation(animationMove, animationMove.piece, animationMove.captured);
    }
    scheduleMateModal();
  }

  function clearGuide() {
    if (guideRefreshTimer) {
      clearTimeout(guideRefreshTimer);
      guideRefreshTimer = null;
    }
    if (game.guide.controller) {
      game.guide.controller.abort();
    }
    game.guide = {
      active: false,
      loading: false,
      index: 0,
      snapshots: [],
      moves: [],
      info: null,
      variations: [],
      selectedVariation: 0,
      playing: false,
      intent: null,
      analysis: null,
      trail: [],
      trailIndex: 0,
      controller: null,
      token: game.guide.token + 1
    };
  }

  function stopMatching() {
    if (matchTimer) {
      clearTimeout(matchTimer);
      matchTimer = null;
    }
    matchStartedAt = 0;
  }

  function clearAiTimers() {
    if (aiTimer) {
      clearTimeout(aiTimer);
      aiTimer = null;
    }
    if (aiWatchdogTimer) {
      clearTimeout(aiWatchdogTimer);
      aiWatchdogTimer = null;
    }
  }

  function clearReviewPlayback() {
    if (reviewPlayTimer) {
      clearTimeout(reviewPlayTimer);
      reviewPlayTimer = null;
    }
  }

  function enterGame(mode) {
    els.gameScreen.classList.remove("hidden");
    setMode(mode);
    resizeCanvas();
  }

  function showHome() {
    if (isModeSwitchLocked()) {
      game.notice = "对局进行中，不能返回主界面切换模式。";
      updateUi();
      return;
    }
    clearAiTimers();
    clearReviewPlayback();
    stopPolling();
    stopMatching();
    stopMoveAnimation();
    clearGuide();
    game.thinking = false;
    updateUi();
  }

  function resetBoard(version = 0) {
    stopMoveAnimation();
    clearReviewPlayback();
    hideMateModal();
    clearGuide();
    game.board = createInitialBoard();
    game.turn = "red";
    game.winner = null;
    game.draw = false;
    game.selected = null;
    game.legalMoves = [];
    game.lastMove = null;
    game.history = [];
    game.moveKeys = [];
    game.positionKeys = [positionKey(game.board, game.turn)];
    game.snapshots = [buildReviewSnapshot()];
    game.captured = { red: [], black: [] };
    game.version = version;
    game.thinking = false;
    game.aiRequestId += 1;
    game.reviewIndex = null;
    game.bookInfo = null;
    game.pendingMateModal = null;
    game.endReason = null;
    game.mateModalShownForVersion = null;
    game.savedArchiveVersion = null;
    game.archiveReviewing = false;
    game.archiveReturnSnapshot = null;
    game.notice = "红先，请落子。";
    clearAiTimers();
    clearReviewPlayback();
    stopMatching();
    if (game.mode === "ai") {
      game.clocks = null;
    }
    if (game.mode === "local") {
      resetLocalClocks();
    }
    if (game.mode === "ai") {
      game.flipped = game.playerColor === "black";
    }
  }

  function setup() {
    restoreBoardTheme();
    restoreAiLevel();
    if (!game.snapshots.length) {
      game.positionKeys = [positionKey(game.board, game.turn)];
      game.snapshots = [buildReviewSnapshot()];
    }
    renderThemeButtons();
    bindEvents();
    restoreGuideDepth();
    restoreGuideMultiThread();
    resizeCanvas();
    updateUi();
    window.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("resize", resizeCanvas);
    window.visualViewport?.addEventListener("scroll", resizeCanvas);
    window.setInterval(() => {
      if (shouldShowClockStatus() || (game.mode === "online" && game.online?.roomCode)) {
        updateUi();
      }
    }, 1000);
  }

  function bindEvents() {
    els.canvas.addEventListener("click", handleCanvasClick);
    els.resetBtn.addEventListener("click", handleReset);
    els.flipBtn.addEventListener("click", () => {
      scheduleFlipView();
    });

    els.modeButtons.forEach((button) => {
      button.addEventListener("click", () => setMode(button.dataset.mode));
    });

    els.aiButtons.forEach((button) => {
      button.addEventListener("click", () => {
        game.aiLevel = button.dataset.aiLevel;
        saveAiLevel(game.aiLevel);
        game.notice = `AI 难度：${button.textContent.trim()}。`;
        updateUi();
      });
    });

    els.playerColorButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setAiPlayerColor(button.dataset.playerColor);
      });
    });

    els.matchRoomBtn.addEventListener("click", startOnlineMatch);
    els.createRoomBtn.addEventListener("click", createOnlineRoom);
    els.joinRoomBtn.addEventListener("click", joinOnlineRoom);
    els.roomCodeInput.addEventListener("input", () => {
      els.roomCodeInput.value = els.roomCodeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });
    els.timeControlSelect?.addEventListener("change", () => {
      if (game.mode !== "local") {
        return;
      }
      if (game.moveKeys.length) {
        game.notice = "当前对局已开始，新的局时规则会在下一局生效。";
      } else {
        resetLocalClocks();
        game.notice = `双人练习计时：${game.timeControl.label}。`;
      }
      updateUi();
    });
    els.roomCodeInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        joinOnlineRoom();
      }
    });
    els.mateReviewBtn.addEventListener("click", () => {
      hideMateModal();
      jumpReviewTo(0);
    });
    els.mateNewBtn.addEventListener("click", () => {
      hideMateModal();
      handleReset();
    });
    els.reviewStartBtn?.addEventListener("click", () => jumpReviewTo(0));
    els.reviewPrevBtn?.addEventListener("click", () => jumpReviewTo(currentReviewIndex() - 1));
    els.reviewNextBtn?.addEventListener("click", () => jumpReviewTo(currentReviewIndex() + 1));
    els.reviewLiveBtn?.addEventListener("click", returnToLiveReview);
    els.guideBtn.addEventListener("click", requestGuideLine);
    els.guideDepthInput.addEventListener("input", () => saveGuideDepthInput());
    els.guideDepthInput.addEventListener("change", () => {
      const depth = normalizeGuideDepth(els.guideDepthInput.value);
      els.guideDepthInput.value = String(depth);
      saveGuideDepth(depth);
    });
    els.guideMultiThreadInput?.addEventListener("change", () => {
      saveGuideMultiThread(Boolean(els.guideMultiThreadInput.checked));
      updateGuideUi();
    });
    els.guideStartBtn?.addEventListener("click", handleStepStart);
    els.guidePrevBtn?.addEventListener("click", handleStepPrev);
    els.guidePlayBtn?.addEventListener("click", handleStepPlay);
    els.guideNextBtn?.addEventListener("click", handleStepNext);
    els.guideEndBtn?.addEventListener("click", handleStepEnd);
    els.mateModal.addEventListener("click", (event) => {
      if (event.target === els.mateModal) {
        hideMateModal();
      }
    });
    els.aboutBtn?.addEventListener("click", () => showInfoModal("about"));
    els.donateBtn?.addEventListener("click", () => showInfoModal("donate"));
    els.infoCloseBtn?.addEventListener("click", hideInfoModal);
    els.infoModal?.addEventListener("click", (event) => {
      if (event.target === els.infoModal) {
        hideInfoModal();
      }
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.infoModal?.classList.contains("hidden")) {
        hideInfoModal();
        return;
      }
      if (event.key === "Escape" && !els.mateModal.classList.contains("hidden")) {
        hideMateModal();
      }
    });
  }

  function showInfoModal(type) {
    const isDonate = type === "donate";
    els.infoEyebrow.textContent = isDonate ? "Support" : "About";
    els.infoTitle.textContent = isDonate ? "捐赠开发者" : "关于我们";
    els.aboutPanel.classList.toggle("hidden", isDonate);
    els.donatePanel.classList.toggle("hidden", !isDonate);
    els.infoModal.classList.remove("hidden");
  }

  function hideInfoModal() {
    els.infoModal?.classList.add("hidden");
  }

  function normalizeGuideDepth(value) {
    return clamp(Math.round(Number(value) || DEFAULT_GUIDE_DEPTH), 1, 99);
  }

  function guideThreadCount(depth) {
    if (!els.guideMultiThreadInput?.checked || depth < GUIDE_MULTI_THREAD_DEPTH) {
      return 1;
    }
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      return 1;
    }
    const cores = Number(navigator.hardwareConcurrency) || 4;
    return clamp(Math.floor(cores / 2) || 2, 2, GUIDE_MAX_THREADS);
  }

  function guideAnalysisMode(depth, threads) {
    const multiThreadRequested = Boolean(els.guideMultiThreadInput?.checked && depth >= GUIDE_MULTI_THREAD_DEPTH);
    const unavailable = multiThreadRequested && threads <= 1 && (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined");
    return `固定深度 ${depth} · ${threads > 1 ? `${threads}线程` : "单线程"} Worker 后台分析${unavailable ? "（当前浏览器未开启跨源隔离）" : ""}`;
  }

  function restoreGuideDepth() {
    const depth = normalizeGuideDepth(localStorage.getItem(STORAGE_GUIDE_DEPTH));
    els.guideDepthInput.value = String(depth);
  }

  function saveGuideDepthInput() {
    const value = Number(els.guideDepthInput.value);
    if (Number.isFinite(value) && value >= 1 && value <= 99) {
      saveGuideDepth(value);
    }
  }

  function saveGuideDepth(depth) {
    localStorage.setItem(STORAGE_GUIDE_DEPTH, String(normalizeGuideDepth(depth)));
  }

  function restoreGuideMultiThread() {
    if (els.guideMultiThreadInput) {
      els.guideMultiThreadInput.checked = localStorage.getItem(STORAGE_GUIDE_MULTI_THREAD) === "1";
    }
  }

  function saveGuideMultiThread(enabled) {
    localStorage.setItem(STORAGE_GUIDE_MULTI_THREAD, enabled ? "1" : "0");
  }

  function restoreBoardTheme() {
    const savedTheme = localStorage.getItem(STORAGE_BOARD_THEME);
    if (savedTheme && THEMES[savedTheme]) {
      game.theme = savedTheme;
    }
  }

  function saveBoardTheme(themeKey) {
    if (THEMES[themeKey]) {
      localStorage.setItem(STORAGE_BOARD_THEME, themeKey);
    }
  }

  function restoreAiLevel() {
    const savedLevel = localStorage.getItem(STORAGE_AI_LEVEL);
    if (savedLevel && AI_LEVEL_NAMES[savedLevel]) {
      game.aiLevel = savedLevel;
    }
  }

  function saveAiLevel(level) {
    if (AI_LEVEL_NAMES[level]) {
      localStorage.setItem(STORAGE_AI_LEVEL, level);
    }
  }

  function renderThemeButtons() {
    els.themeList.innerHTML = "";
    Object.entries(THEMES).forEach(([key, theme]) => {
      const button = document.createElement("button");
      button.className = "theme-button";
      button.type = "button";
      button.dataset.theme = key;
      button.innerHTML = `<span class="swatch" style="background:${theme.swatch}"></span><span>${theme.name}</span>`;
      button.addEventListener("click", () => {
        game.theme = key;
        saveBoardTheme(key);
        pieceSpriteCache.clear();
        game.notice = `棋盘风格：${theme.name}。`;
        render();
      });
      els.themeList.appendChild(button);
    });
  }

  function scheduleFlipView() {
    game.flipped = !game.flipped;
    game.notice = game.flipped ? "已切换为反向视角。" : "已切换为正向视角。";
    if (flipRenderFrame) {
      cancelAnimationFrame(flipRenderFrame);
    }
    flipRenderFrame = requestAnimationFrame(() => {
      flipRenderFrame = null;
      render();
    });
  }

  function setMode(mode) {
    if (!MODE_NAMES[mode]) {
      return;
    }
    if (mode !== game.mode && isModeSwitchLocked()) {
      game.notice = "对局进行中，不能切换模式。";
      updateUi();
      return;
    }
    clearAiTimers();
    clearReviewPlayback();
    stopMoveAnimation();
    hideMateModal();
    clearGuide();
    stopMatching();
    game.thinking = false;
    if (mode !== "online") {
      stopPolling();
      game.online = null;
    }
    game.mode = mode;
    resetBoard(0);
    if (mode === "online") {
      game.notice = "创建或加入玩家对练房间后开局，可在对局中使用 AI 辅导。";
    }
    if (mode === "local") {
      game.notice = "双人练习，红方先行。";
    }
    if (mode === "ai") {
      game.notice = game.playerColor === "red" ? "人机对战，红方先行。" : "人机对战，你执黑，AI 先行。";
      maybeScheduleAiTurn();
    }
    render();
  }

  function isModeSwitchLocked() {
    if (els.gameScreen.classList.contains("hidden")) {
      return false;
    }
    if (game.winner || game.draw) {
      return false;
    }
    return Boolean(game.moveKeys.length || game.thinking || game.animation || game.online?.roomCode);
  }

  function setAiPlayerColor(color) {
    if (color !== "red" && color !== "black") {
      return;
    }
    clearAiTimers();
    clearReviewPlayback();
    game.playerColor = color;
    game.flipped = color === "black";
    if (game.mode === "ai") {
      resetBoard(0);
      game.notice = color === "red" ? "你执红，红方先行。" : "你执黑，AI 执红先行。";
      render();
      maybeScheduleAiTurn();
      return;
    }
    updateUi();
  }

  async function handleReset() {
    stopMoveAnimation();
    clearGuide();
    if (game.mode === "online" && game.online?.roomCode) {
      await resetOnlineRoom();
      return;
    }
    resetBoard(0);
    render();
  }

  function resizeCanvas() {
    if (els.gameScreen.classList.contains("hidden")) {
      return;
    }
    const wrapStyle = window.getComputedStyle(els.canvasWrap);
    const panelStyle = window.getComputedStyle(els.canvasWrap.parentElement);
    const toPx = (value) => Number.parseFloat(value) || 0;
    const chromeX = toPx(wrapStyle.paddingLeft) + toPx(wrapStyle.paddingRight) + toPx(wrapStyle.borderLeftWidth) + toPx(wrapStyle.borderRightWidth);
    const chromeY = toPx(wrapStyle.paddingTop) + toPx(wrapStyle.paddingBottom) + toPx(wrapStyle.borderTopWidth) + toPx(wrapStyle.borderBottomWidth);
    const panelChromeX = toPx(panelStyle.paddingLeft) + toPx(panelStyle.paddingRight);
    const minCanvasWidth = 120;
    const panelWidth = els.canvasWrap.parentElement.clientWidth || window.innerWidth;
    const maxOuterWidth = Math.max(minCanvasWidth + chromeX, Math.min(780, panelWidth - panelChromeX));
    const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 720;
    const wrapTop = els.canvasWrap.getBoundingClientRect().top;
    const availableOuterHeight = Math.max(minCanvasWidth * 10 / 9 + chromeY, viewportHeight - Math.max(0, wrapTop) - 8);
    const maxOuterWidthByHeight = Math.max(minCanvasWidth + chromeX, (availableOuterHeight - chromeY) * 9 / 10 + chromeX);
    const outerWidth = Math.max(minCanvasWidth + chromeX, Math.min(maxOuterWidth, maxOuterWidthByHeight));
    const cssWidth = Math.max(minCanvasWidth, outerWidth - chromeX);
    const cssHeight = cssWidth * 10 / 9;
    els.canvasWrap.style.setProperty("--board-outer-size", `${outerWidth}px`);
    els.canvasWrap.style.setProperty("--board-canvas-width", `${cssWidth}px`);
    els.canvasWrap.style.setProperty("--board-canvas-height", `${cssHeight}px`);
    const dpr = window.devicePixelRatio || 1;
    els.canvas.width = Math.round(cssWidth * dpr);
    els.canvas.height = Math.round(cssHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pieceSpriteCache.clear();
    const marginX = cssWidth * 0.085;
    const marginY = cssHeight * 0.075;
    metrics = {
      width: cssWidth,
      height: cssHeight,
      marginX,
      marginY,
      cellX: (cssWidth - marginX * 2) / 8,
      cellY: (cssHeight - marginY * 2) / 9,
      pieceRadius: Math.min((cssWidth - marginX * 2) / 8, (cssHeight - marginY * 2) / 9) * 0.38
    };
    render();
  }

  function render() {
    if (els.gameScreen.classList.contains("hidden")) {
      updateUi();
      return;
    }
    drawBoard();
    updateUi();
  }

  function drawBoard() {
    if (!metrics) {
      return;
    }
    const theme = THEMES[game.theme];
    const { width, height, marginX, marginY, cellX, cellY, pieceRadius } = metrics;
    const view = currentViewState();
    const viewBoard = view.board;

    const inset = Math.max(10, width * 0.018);
    ctx.clearRect(0, 0, width, height);
    drawBoardBase(theme, inset);

    drawBoardTexture(theme, inset);
    drawFrostedBoardOverlay(inset);
    drawBoardLines(theme);
    drawBoardHighlights(theme, viewBoard, view.lastMove, view.turn, view.winner);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const piece = viewBoard[row][col];
        if (isAnimatedPieceAt(row, col, piece)) {
          continue;
        }
        if (piece) {
          const point = boardToScreen(row, col);
          const selected = !isReviewing() && game.selected?.row === row && game.selected?.col === col;
          drawPiece(theme, piece, point.x, point.y, pieceRadius, selected);
        }
      }
    }
    drawMoveAnimation(theme);
    drawReviewNextMoveHint(theme);
    drawGuideIntent(theme);
  }

  function drawBoardBase(theme, inset) {
    const { width, height } = metrics;
    const frameGradient = ctx.createLinearGradient(0, 0, width, height);
    if (theme.material === "crystal") {
      frameGradient.addColorStop(0, "#172033");
      frameGradient.addColorStop(0.48, theme.outer);
      frameGradient.addColorStop(1, "#02040a");
    } else {
      frameGradient.addColorStop(0, shade(theme.outer, 24));
      frameGradient.addColorStop(0.42, theme.outer);
      frameGradient.addColorStop(1, shade(theme.outer, -34));
    }
    roundedRect(ctx, 0, 0, width, height, 8);
    ctx.fillStyle = frameGradient;
    ctx.fill();

    const frameGlow = ctx.createLinearGradient(0, 0, 0, height);
    frameGlow.addColorStop(0, "rgba(255,255,255,0.2)");
    frameGlow.addColorStop(0.3, "rgba(255,255,255,0)");
    frameGlow.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = frameGlow;
    roundedRect(ctx, 6, 6, width - 12, height - 12, 7);
    ctx.fill();

    const boardGradient = ctx.createLinearGradient(inset, inset, width - inset, height - inset);
    if (theme.material === "crystal") {
      boardGradient.addColorStop(0, "rgba(24, 39, 62, 0.74)");
      boardGradient.addColorStop(0.45, "rgba(12, 20, 36, 0.64)");
      boardGradient.addColorStop(1, "rgba(8, 12, 24, 0.8)");
    } else {
      boardGradient.addColorStop(0, shade(theme.boardAlt, 10));
      boardGradient.addColorStop(0.5, theme.board);
      boardGradient.addColorStop(1, shade(theme.board, -12));
    }
    roundedRect(ctx, inset, inset, width - inset * 2, height - inset * 2, 8);
    ctx.fillStyle = boardGradient;
    ctx.fill();

    ctx.save();
    ctx.lineWidth = Math.max(2, width * 0.004);
    ctx.strokeStyle = theme.material === "crystal" ? "rgba(210,244,255,0.3)" : "rgba(255,255,255,0.22)";
    roundedRect(ctx, inset + 3, inset + 3, width - inset * 2 - 6, height - inset * 2 - 6, 6);
    ctx.stroke();
    ctx.strokeStyle = theme.material === "crystal" ? "rgba(0,0,0,0.42)" : "rgba(45,22,8,0.28)";
    roundedRect(ctx, inset - 3, inset - 3, width - inset * 2 + 6, height - inset * 2 + 6, 8);
    ctx.stroke();
    ctx.restore();
  }

  function drawReviewNextMoveHint(theme) {
    if (!isReviewing() || game.animation || !metrics) {
      return;
    }
    const move = nextReviewMove();
    if (!move?.piece) {
      return;
    }
    const viewBoard = currentViewState().board;
    const moving = viewBoard[move.from.row]?.[move.from.col] || move.piece;
    const from = boardToScreen(move.from.row, move.from.col);
    const to = boardToScreen(move.to.row, move.to.col);
    const radius = metrics.pieceRadius;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const endX = to.x - Math.cos(angle) * radius * 0.72;
    const endY = to.y - Math.sin(angle) * radius * 0.72;
    const color = moving.color === "black" ? "rgba(17, 24, 39, 0.86)" : theme.accent;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(3, radius * 0.11);
    ctx.setLineDash([radius * 0.24, radius * 0.16]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - Math.cos(angle - 0.55) * radius * 0.45, to.y - Math.sin(angle - 0.55) * radius * 0.45);
    ctx.lineTo(to.x - Math.cos(angle + 0.55) * radius * 0.45, to.y - Math.sin(angle + 0.55) * radius * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.font = `800 ${Math.max(12, radius * 0.42)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.74)";
    ctx.lineWidth = 3;
    const label = `下一手 ${COLOR_NAMES[moving.color]}${LABELS[moving.color][moving.type]}`;
    const labelX = (from.x + to.x) / 2;
    const labelY = (from.y + to.y) / 2 - radius * 0.35;
    ctx.strokeText(label, labelX, labelY);
    ctx.fillText(label, labelX, labelY);
    ctx.restore();
  }

  function drawGuideIntent(theme) {
    if (!isGuiding() || !game.guide.intent || !metrics || isReviewing()) {
      return;
    }
    const { move, moving } = game.guide.intent;
    const currentPiece = currentViewState().board[move.from.row]?.[move.from.col];
    if (!currentPiece || !moving || currentPiece.color !== moving.color || currentPiece.type !== moving.type) {
      return;
    }
    const from = boardToScreen(move.from.row, move.from.col);
    const to = boardToScreen(move.to.row, move.to.col);
    const radius = metrics.pieceRadius;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const endX = to.x - Math.cos(angle) * radius * 0.72;
    const endY = to.y - Math.sin(angle) * radius * 0.72;
    ctx.save();
    ctx.strokeStyle = moving?.color === "black" ? "rgba(17, 24, 39, 0.86)" : theme.accent;
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = Math.max(3, radius * 0.12);
    ctx.setLineDash([radius * 0.28, radius * 0.18]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - Math.cos(angle - 0.55) * radius * 0.48, to.y - Math.sin(angle - 0.55) * radius * 0.48);
    ctx.lineTo(to.x - Math.cos(angle + 0.55) * radius * 0.48, to.y - Math.sin(angle + 0.55) * radius * 0.48);
    ctx.closePath();
    ctx.fill();
    if (moving) {
      ctx.font = `800 ${Math.max(12, radius * 0.42)}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.72)";
      ctx.lineWidth = 3;
      const label = `${COLOR_NAMES[moving.color]}${LABELS[moving.color][moving.type]}意图`;
      ctx.strokeText(label, (from.x + to.x) / 2, (from.y + to.y) / 2 - radius * 0.35);
      ctx.fillText(label, (from.x + to.x) / 2, (from.y + to.y) / 2 - radius * 0.35);
    }
    ctx.restore();
  }

  function isAnimatedPieceAt(row, col, piece) {
    return Boolean(
      piece &&
        game.animation &&
        piece.id === game.animation.piece.id &&
        (
          (row === game.animation.from.row && col === game.animation.from.col) ||
          (row === game.animation.to.row && col === game.animation.to.col)
        )
    );
  }

  function drawMoveAnimation(theme) {
    const animation = game.animation;
    if (!animation || !metrics) {
      return;
    }
    const progress = clamp((performance.now() - animation.start) / animation.duration, 0, 1);
    const eased = easeOutQuart(progress);
    const from = boardToScreen(animation.from.row, animation.from.col);
    const to = boardToScreen(animation.to.row, animation.to.col);
    const x = from.x + (to.x - from.x) * eased;
    const y = from.y + (to.y - from.y) * eased;
    const radius = metrics.pieceRadius;

    ctx.save();
    ctx.globalAlpha = 0.14 * (1 - progress);
    drawPiece(theme, animation.piece, from.x, from.y, radius * 0.98);
    ctx.restore();

    if (animation.captured && progress > 0.5) {
      const pulse = (progress - 0.5) / 0.5;
      ctx.save();
      ctx.strokeStyle = theme.accent;
      ctx.globalAlpha = 0.22 * (1 - pulse);
      ctx.lineWidth = Math.max(2, radius * 0.05);
      ctx.beginPath();
      ctx.arc(to.x, to.y, radius * (0.72 + pulse * 0.32), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    drawPiece(theme, animation.piece, x, y, radius * (1 + Math.sin(progress * Math.PI) * 0.012));
  }

  function finishMoveAnimation() {
    if (!game.animation) {
      return;
    }
    const onDone = game.animation.onDone;
    game.animation = null;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }
    delete document.body.dataset.animating;
    if (typeof onDone === "function") {
      try {
        onDone();
      } catch (error) {
        console.error("move animation callback failed", error);
      }
    }
  }

  function startMoveAnimation(move, piece, captured, duration = MOVE_ANIMATION_MS, onDone = null) {
    stopMoveAnimation();
    if (!metrics || prefersReducedMotion()) {
      game.animation = null;
      delete document.body.dataset.animating;
      if (typeof onDone === "function") {
        try {
          onDone();
        } catch (error) {
          console.error("move animation callback failed", error);
        }
      }
      render();
      return;
    }
    game.animation = {
      from: { ...move.from },
      to: { ...move.to },
      piece: clonePiece(piece),
      captured: clonePiece(captured),
      start: performance.now(),
      duration,
      onDone
    };
    document.body.dataset.animating = "piece";
    render();
    animationFrame = requestAnimationFrame(tickMoveAnimation);
    animationTimeout = window.setTimeout(() => {
      finishMoveAnimation();
      render();
    }, duration + 320);
  }

  function tickMoveAnimation() {
    if (!game.animation) {
      animationFrame = null;
      return;
    }
    const done = performance.now() - game.animation.start >= game.animation.duration;
    if (done) {
      finishMoveAnimation();
      render();
      return;
    }
    render();
    animationFrame = requestAnimationFrame(tickMoveAnimation);
  }

  function stopMoveAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }
    game.animation = null;
    delete document.body.dataset.animating;
  }

  function prefersReducedMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  function easeOutQuart(value) {
    return 1 - Math.pow(1 - value, 4);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function waitForNextPaint() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => window.setTimeout(resolve, 0));
    });
  }

  function normalizeTimeControl(id) {
    return TIME_CONTROLS[id] || TIME_CONTROLS["30-10"];
  }

  function inferTimeControlFromSnapshot(snapshot) {
    if (snapshot?.timeControl?.id) {
      return normalizeTimeControl(snapshot.timeControl.id);
    }
    const stepMs = Number(snapshot?.clocks?.stepMs);
    const totalMs = Number(snapshot?.clocks?.totalMs);
    return Object.values(TIME_CONTROLS).find((item) => item.stepMs === stepMs && item.totalMs === totalMs) || TIME_CONTROLS["30-10"];
  }

  function sanitizeClientClocks(clocks, timeControl) {
    if (!clocks) {
      return {
        redMs: timeControl.totalMs,
        blackMs: timeControl.totalMs,
        stepMs: timeControl.stepMs,
        totalMs: timeControl.totalMs,
        turnStartedAt: Date.now()
      };
    }
    return {
      redMs: Math.max(0, Math.min(Number(clocks.redMs) || 0, timeControl.totalMs)),
      blackMs: Math.max(0, Math.min(Number(clocks.blackMs) || 0, timeControl.totalMs)),
      stepMs: timeControl.stepMs,
      totalMs: timeControl.totalMs,
      turnStartedAt: Number.isFinite(Number(clocks.turnStartedAt)) ? Number(clocks.turnStartedAt) : Date.now()
    };
  }

  function resetLocalClocks() {
    game.timeControl = normalizeTimeControl(selectedTimeControlId());
    game.clocks = sanitizeClientClocks(null, game.timeControl);
  }

  function shouldRunClock() {
    if (!game.clocks || game.winner || game.draw) {
      return false;
    }
    if (game.mode === "local") {
      return true;
    }
    return game.mode === "online" && onlineReady();
  }

  function shouldShowClockStatus() {
    return Boolean(game.clocks && (game.mode === "online" || game.mode === "local"));
  }

  function activeClockRemaining(color, now = Date.now()) {
    if (!game.clocks) {
      return 0;
    }
    const base = color === "red" ? game.clocks.redMs : game.clocks.blackMs;
    if (shouldRunClock() && game.turn === color) {
      const elapsed = Math.max(0, now - game.clocks.turnStartedAt);
      return Math.max(0, Math.min(base - elapsed, game.clocks.stepMs - elapsed));
    }
    return Math.max(0, base);
  }

  function clockStatusText() {
    if (!shouldShowClockStatus()) {
      return "";
    }
    const timedOut = Boolean(game.winner && (game.clocks.redMs <= 0 || game.clocks.blackMs <= 0));
    const activeStepMs = shouldRunClock()
      ? activeClockRemaining(game.turn)
      : timedOut
        ? 0
      : game.clocks.stepMs;
    return `本步 ${formatClock(activeStepMs)} · 红 ${formatClock(activeClockRemaining("red"))} · 黑 ${formatClock(activeClockRemaining("black"))}`;
  }

  function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return hours
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function drawBoardTexture(theme, inset) {
    if (theme.material === "crystal") {
      drawCrystalBoardTexture(theme, inset);
      return;
    }
    if (game.theme === "huanghuali") {
      return;
    }
    const { width, height } = metrics;
    ctx.save();
    const boardWidth = width - inset * 2;
    const boardHeight = height - inset * 2;
    const plankCount = 6;
    for (let i = 0; i < plankCount; i += 1) {
      const x = inset + (boardWidth / plankCount) * i;
      const plank = ctx.createLinearGradient(x, inset, x + boardWidth / plankCount, inset);
      plank.addColorStop(0, shade(theme.board, i % 2 ? -10 : 7));
      plank.addColorStop(0.5, shade(theme.boardAlt, i % 2 ? -5 : 12));
      plank.addColorStop(1, shade(theme.board, i % 2 ? 8 : -8));
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = plank;
      ctx.fillRect(x, inset, boardWidth / plankCount + 1, boardHeight);
      if (i > 0) {
        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = shade(theme.line, 24);
        ctx.lineWidth = Math.max(1, metrics.width * 0.0014);
        drawLine(x, inset + 8, x, height - inset - 8);
      }
    }

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.45, boardWidth * 0.08, width * 0.5, height * 0.5, boardWidth * 0.62);
    vignette.addColorStop(0, "rgba(255,255,255,0.16)");
    vignette.addColorStop(0.62, "rgba(255,255,255,0.03)");
    vignette.addColorStop(1, "rgba(40,20,8,0.22)");
    ctx.globalAlpha = 1;
    ctx.fillStyle = vignette;
    roundedRect(ctx, inset, inset, boardWidth, boardHeight, 6);
    ctx.fill();

    const grainCount = 34;
    for (let i = 0; i < grainCount; i += 1) {
      const y = inset + (height - inset * 2) * (i / (grainCount - 1));
      const gradient = ctx.createLinearGradient(inset, y, width - inset, y + 18);
      gradient.addColorStop(0, shade(theme.boardAlt, i % 2 ? -12 : 10));
      gradient.addColorStop(0.5, shade(theme.board, i % 2 ? 8 : -10));
      gradient.addColorStop(1, shade(theme.boardAlt, i % 2 ? -18 : 5));
      ctx.globalAlpha = i % 2 ? 0.24 : 0.16;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(1, metrics.width * (i % 3 === 0 ? 0.0032 : 0.0018));
      ctx.beginPath();
      ctx.moveTo(inset + 8, y);
      ctx.bezierCurveTo(width * 0.28, y + 10 + Math.sin(i) * 4, width * 0.64, y - 8 + Math.cos(i) * 4, width - inset - 8, y + 5);
      ctx.stroke();
    }

    for (let i = 0; i < 10; i += 1) {
      const y = inset + 18 + ((i * 73) % Math.max(1, boardHeight - 36));
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = shade(theme.line, i % 2 ? 38 : 20);
      ctx.lineWidth = Math.max(0.8, metrics.width * 0.0012);
      ctx.beginPath();
      ctx.ellipse(width * (0.28 + (i % 4) * 0.14), y, metrics.cellX * (0.8 + (i % 3) * 0.26), metrics.cellY * 0.18, Math.sin(i) * 0.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCrystalBoardTexture(theme, inset) {
    const { width, height } = metrics;
    const boardWidth = width - inset * 2;
    const boardHeight = height - inset * 2;
    ctx.save();
    const surface = ctx.createLinearGradient(inset, inset, width - inset, height - inset);
    surface.addColorStop(0, "rgba(16, 28, 48, 0.72)");
    surface.addColorStop(0.42, "rgba(24, 39, 62, 0.54)");
    surface.addColorStop(0.72, "rgba(10, 18, 34, 0.64)");
    surface.addColorStop(1, "rgba(5, 10, 22, 0.76)");
    ctx.fillStyle = surface;
    roundedRect(ctx, inset, inset, boardWidth, boardHeight, 6);
    ctx.fill();

    const refract = ctx.createLinearGradient(inset, inset, width - inset, height - inset);
    refract.addColorStop(0, "rgba(210, 244, 255, 0.34)");
    refract.addColorStop(0.2, "rgba(174, 230, 255, 0.08)");
    refract.addColorStop(0.5, "rgba(255, 255, 255, 0.14)");
    refract.addColorStop(0.76, "rgba(111, 211, 255, 0.2)");
    refract.addColorStop(1, "rgba(255, 255, 255, 0.04)");
    ctx.fillStyle = refract;
    roundedRect(ctx, inset + 2, inset + 2, boardWidth - 4, boardHeight - 4, 6);
    ctx.fill();

    ctx.strokeStyle = "rgba(210, 244, 255, 0.52)";
    ctx.lineWidth = Math.max(1.4, metrics.width * 0.0024);
    roundedRect(ctx, inset + 8, inset + 8, boardWidth - 16, boardHeight - 16, 5);
    ctx.stroke();

    ctx.strokeStyle = "rgba(111, 211, 255, 0.34)";
    ctx.lineWidth = Math.max(3, metrics.width * 0.004);
    roundedRect(ctx, inset + 2, inset + 2, boardWidth - 4, boardHeight - 4, 7);
    ctx.stroke();

    ctx.globalAlpha = 0.24;
    ctx.strokeStyle = "rgba(160, 226, 255, 0.38)";
    ctx.lineWidth = Math.max(1, metrics.width * 0.0013);
    for (let i = 0; i < 8; i += 1) {
      const x = inset + boardWidth * ((i + 1) / 9);
      ctx.beginPath();
      ctx.moveTo(x, inset + 10);
      ctx.lineTo(x + Math.sin(i) * metrics.cellX * 0.28, height - inset - 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFrostedBoardOverlay(inset) {
    const { width, height } = metrics;
    ctx.save();
    if (THEMES[game.theme].material === "crystal") {
      const mist = ctx.createRadialGradient(width * 0.42, height * 0.36, width * 0.08, width * 0.5, height * 0.5, width * 0.56);
      mist.addColorStop(0, "rgba(184, 232, 255, 0.2)");
      mist.addColorStop(0.55, "rgba(255, 255, 255, 0.07)");
      mist.addColorStop(1, "rgba(0, 0, 0, 0.08)");
      ctx.fillStyle = mist;
      roundedRect(ctx, inset + 3, inset + 3, width - inset * 2 - 6, height - inset * 2 - 6, 6);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.fillStyle = game.theme === "huanghuali" ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.035)";
    roundedRect(ctx, inset + 3, inset + 3, width - inset * 2 - 6, height - inset * 2 - 6, 6);
    ctx.fill();

    if (game.theme === "huanghuali") {
      ctx.restore();
      return;
    }

    ctx.globalAlpha = 0.055;
    ctx.fillStyle = shade(THEMES[game.theme].boardAlt, 12);
    const step = Math.max(12, metrics.cellX * 0.28);
    for (let y = inset + step * 0.7; y < height - inset; y += step) {
      for (let x = inset + step * 0.45; x < width - inset; x += step * 1.35) {
        const jitter = Math.sin(x * 0.13 + y * 0.17) * step * 0.18;
        ctx.beginPath();
        ctx.arc(x + jitter, y - jitter * 0.5, Math.max(0.45, metrics.width * 0.00075), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawBoardLines(theme) {
    const { marginX, marginY, cellX, cellY } = metrics;
    const x0 = marginX;
    const x8 = marginX + cellX * 8;
    const y0 = marginY;
    const y9 = marginY + cellY * 9;

    ctx.save();
    ctx.strokeStyle = theme.line;
    ctx.globalAlpha = theme.material === "crystal" ? 0.78 : 0.82;
    ctx.lineWidth = theme.material === "crystal" ? Math.max(0.9, metrics.width * 0.00145) : Math.max(1.05, metrics.width * 0.00185);
    ctx.lineCap = "round";

    roundedRect(ctx, x0 - 5, y0 - 5, x8 - x0 + 10, y9 - y0 + 10, 4);
    ctx.stroke();

    for (let row = 0; row < ROWS; row += 1) {
      const y = marginY + row * cellY;
      drawLine(x0, y, x8, y);
    }

    for (let col = 0; col < COLS; col += 1) {
      const x = marginX + col * cellX;
      if (col === 0 || col === COLS - 1) {
        drawLine(x, y0, x, y9);
      } else {
        drawLine(x, y0, x, marginY + cellY * 4);
        drawLine(x, marginY + cellY * 5, x, y9);
      }
    }

    drawPalaceLines();
    drawRiver(theme);
    drawMarkers();
    ctx.restore();
  }

  function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function drawPalaceLines() {
    const palaceLines = [
      [0, 3, 2, 5],
      [0, 5, 2, 3],
      [7, 3, 9, 5],
      [7, 5, 9, 3]
    ];
    palaceLines.forEach(([r1, c1, r2, c2]) => {
      const a = displayGridPoint(r1, c1);
      const b = displayGridPoint(r2, c2);
      drawLine(a.x, a.y, b.x, b.y);
    });
  }

  function drawRiver(theme) {
    const { marginX, marginY, cellX, cellY } = metrics;
    ctx.save();
    ctx.fillStyle = theme.material === "crystal" ? "rgba(155, 220, 255, 0.58)" : theme.line;
    ctx.globalAlpha = theme.material === "crystal" ? 0.62 : 0.75;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${theme.material === "crystal" ? 600 : 700} ${Math.max(18, cellY * 0.28)}px "KaiTi", "Songti SC", serif`;
    if (theme.material === "crystal") {
      ctx.shadowColor = "rgba(111, 211, 255, 0.18)";
      ctx.shadowBlur = Math.max(4, cellY * 0.08);
    }
    ctx.fillText(game.flipped ? "汉界" : "楚河", marginX + cellX * 2.1, marginY + cellY * 4.5);
    ctx.fillText(game.flipped ? "楚河" : "汉界", marginX + cellX * 5.9, marginY + cellY * 4.5);
    ctx.restore();
  }

  function drawMarkers() {
    const points = [
      [2, 1],
      [2, 7],
      [7, 1],
      [7, 7],
      [3, 0],
      [3, 2],
      [3, 4],
      [3, 6],
      [3, 8],
      [6, 0],
      [6, 2],
      [6, 4],
      [6, 6],
      [6, 8]
    ];
    points.forEach(([row, col]) => drawMarker(row, col));
  }

  function drawMarker(row, col) {
    const { cellX, cellY } = metrics;
    const { x, y } = displayGridPoint(row, col);
    const gap = Math.min(cellX, cellY) * 0.1;
    const len = Math.min(cellX, cellY) * 0.15;
    const sides = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1]
    ];
    sides.forEach(([sx, sy]) => {
      if ((col === 0 && sx < 0) || (col === COLS - 1 && sx > 0)) {
        return;
      }
      ctx.beginPath();
      ctx.moveTo(x + sx * gap, y + sy * (gap + len));
      ctx.lineTo(x + sx * gap, y + sy * gap);
      ctx.lineTo(x + sx * (gap + len), y + sy * gap);
      ctx.stroke();
    });
  }

  function drawBoardHighlights(theme, board = game.board, lastMove = game.lastMove, turn = game.turn, winner = game.winner) {
    const radius = metrics.pieceRadius;
    if (lastMove) {
      const moveColor = lastMove.piece?.color || board[lastMove.to.row]?.[lastMove.to.col]?.color || "red";
      const toRingColor = moveColor === "black" ? "rgba(17, 24, 39, 0.9)" : theme.accent;
      const fromRingColor = moveColor === "black" ? "rgba(17, 24, 39, 0.16)" : "rgba(179, 58, 47, 0.14)";
      [
        { square: lastMove.from, color: fromRingColor, alpha: 0.55, width: 0.055 },
        { square: lastMove.to, color: toRingColor, alpha: 0.75, width: 0.08 }
      ].forEach(({ square, color, alpha, width }) => {
        const point = boardToScreen(square.row, square.col);
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = Math.max(1.2, radius * width);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 1.06, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    if (!isReviewing()) {
      game.legalMoves.forEach((move) => {
      const point = boardToScreen(move.to.row, move.to.col);
      const target = board[move.to.row][move.to.col];
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = target ? "rgba(179, 58, 47, 0.18)" : "rgba(31, 104, 117, 0.36)";
      ctx.strokeStyle = target ? "rgba(179, 58, 47, 0.9)" : "rgba(31, 104, 117, 0.8)";
      ctx.lineWidth = Math.max(2, radius * 0.05);
      ctx.beginPath();
      ctx.arc(point.x, point.y, target ? radius * 0.9 : radius * 0.22, 0, Math.PI * 2);
      target ? ctx.stroke() : ctx.fill();
      ctx.restore();
      });
    }

    if (!winner && isKingInCheck(board, turn)) {
      const king = findKing(board, turn);
      if (king) {
        const point = boardToScreen(king.row, king.col);
        ctx.save();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = Math.max(3, radius * 0.1);
        ctx.setLineDash([radius * 0.32, radius * 0.18]);
        ctx.beginPath();
        ctx.arc(point.x, point.y, radius * 1.35, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawPiece(theme, piece, x, y, radius, selected = false) {
    const sprite = getPieceSprite(theme, piece, radius, selected);
    ctx.drawImage(sprite.canvas, x - sprite.cssSize / 2, y - sprite.cssSize / 2, sprite.cssSize, sprite.cssSize);
  }

  function getPieceSprite(theme, piece, radius, selected = false) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssSize = Math.ceil(radius * 2.9);
    const key = [
      game.theme,
      piece.color,
      piece.type,
      selected ? "selected" : "normal",
      Math.round(radius * 100),
      dpr
    ].join(":");
    const cached = pieceSpriteCache.get(key);
    if (cached) {
      return cached;
    }

    const pixelSize = Math.ceil(cssSize * dpr);
    const canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(pixelSize, pixelSize)
      : document.createElement("canvas");
    canvas.width = pixelSize;
    canvas.height = pixelSize;
    const spriteCtx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    spriteCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPieceArtwork(spriteCtx, theme, piece, cssSize / 2, cssSize / 2, radius, selected);

    const sprite = { canvas, cssSize };
    pieceSpriteCache.set(key, sprite);
    if (pieceSpriteCache.size > 96) {
      pieceSpriteCache.delete(pieceSpriteCache.keys().next().value);
    }
    return sprite;
  }

  function drawPieceArtwork(targetCtx, theme, piece, x, y, radius, selected = false) {
    const pieceBase = piece.color === "red" ? theme.redPiece : theme.blackPiece;
    const textColor = piece.color === "red" ? theme.redText : theme.blackText;
    targetCtx.save();

    const ground = targetCtx.createRadialGradient(x, y + radius * 0.5, radius * 0.18, x, y + radius * 0.5, radius * 1.25);
    ground.addColorStop(0, "rgba(25, 14, 8, 0.28)");
    ground.addColorStop(0.62, "rgba(25, 14, 8, 0.12)");
    ground.addColorStop(1, "rgba(25, 14, 8, 0)");
    targetCtx.fillStyle = ground;
    targetCtx.beginPath();
    targetCtx.ellipse(x, y + radius * 0.36, radius * 0.94, radius * 0.22, 0, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.shadowColor = theme.shadow;
    targetCtx.shadowBlur = radius * 0.42;
    targetCtx.shadowOffsetY = radius * 0.18;

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius, 0, Math.PI * 2);
    const rim = targetCtx.createRadialGradient(x - radius * 0.34, y - radius * 0.42, radius * 0.12, x, y, radius);
    rim.addColorStop(0, shade(pieceBase, 38));
    rim.addColorStop(0.34, shade(pieceBase, 10));
    rim.addColorStop(0.72, shade(pieceBase, -14));
    rim.addColorStop(1, shade(pieceBase, -48));
    targetCtx.fillStyle = rim;
    targetCtx.fill();

    targetCtx.shadowColor = "transparent";
    targetCtx.lineWidth = Math.max(2.4, radius * 0.105);
    targetCtx.strokeStyle = shade(pieceBase, -50);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.9, 0, Math.PI * 2);
    const bevel = targetCtx.createLinearGradient(x - radius * 0.75, y - radius * 0.85, x + radius * 0.78, y + radius * 0.78);
    bevel.addColorStop(0, "rgba(255,255,255,0.46)");
    bevel.addColorStop(0.45, "rgba(255,255,255,0.08)");
    bevel.addColorStop(1, "rgba(28,15,8,0.26)");
    targetCtx.strokeStyle = bevel;
    targetCtx.lineWidth = Math.max(1.6, radius * 0.05);
    targetCtx.stroke();

    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    const face = targetCtx.createRadialGradient(x - radius * 0.24, y - radius * 0.34, radius * 0.06, x, y, radius * 0.9);
    face.addColorStop(0, "#fffdf5");
    face.addColorStop(0.34, shade(pieceBase, 20));
    face.addColorStop(0.75, shade(pieceBase, 0));
    face.addColorStop(1, shade(pieceBase, -18));
    targetCtx.fillStyle = face;
    targetCtx.fill();

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.82, 0, Math.PI * 2);
    targetCtx.clip();
    const polish = targetCtx.createLinearGradient(x - radius * 0.74, y - radius * 0.86, x + radius * 0.7, y + radius * 0.58);
    polish.addColorStop(0, "rgba(255,255,255,0.52)");
    polish.addColorStop(0.28, "rgba(255,255,255,0.16)");
    polish.addColorStop(0.62, "rgba(255,255,255,0.04)");
    polish.addColorStop(1, "rgba(62,35,15,0.12)");
    targetCtx.fillStyle = polish;
    targetCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    targetCtx.restore();

    targetCtx.lineWidth = Math.max(1.1, radius * 0.032);
    targetCtx.strokeStyle = "rgba(255,255,255,0.58)";
    targetCtx.beginPath();
    targetCtx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
    targetCtx.stroke();

    targetCtx.save();
    targetCtx.globalAlpha = 0.82;
    targetCtx.strokeStyle = "rgba(255,255,255,0.78)";
    targetCtx.lineWidth = Math.max(1, radius * 0.03);
    targetCtx.beginPath();
    targetCtx.arc(x - radius * 0.1, y - radius * 0.14, radius * 0.58, Math.PI * 1.04, Math.PI * 1.72);
    targetCtx.stroke();
    targetCtx.restore();

    const carvedRingY = y - radius * 0.05;
    if (selected) {
      const selectedTone = piece.color === "red" ? shade(textColor, 34) : "rgba(58, 57, 52, 0.94)";
      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.arc(x, y, radius * 0.94, 0, Math.PI * 2);
      targetCtx.clip();
      const selectedWash = targetCtx.createRadialGradient(x - radius * 0.16, carvedRingY - radius * 0.18, radius * 0.16, x, y, radius * 0.96);
      selectedWash.addColorStop(0, "rgba(255,255,255,0.22)");
      selectedWash.addColorStop(0.26, selectedTone);
      selectedWash.addColorStop(0.72, piece.color === "red" ? shade(textColor, 12) : "rgba(36, 35, 32, 0.94)");
      selectedWash.addColorStop(1, piece.color === "red" ? shade(textColor, -14) : "rgba(18, 18, 16, 0.9)");
      targetCtx.globalAlpha = piece.color === "red" ? 0.36 : 0.32;
      targetCtx.fillStyle = selectedWash;
      targetCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      targetCtx.globalAlpha = 0.26;
      targetCtx.fillStyle = "rgba(255,255,255,0.46)";
      targetCtx.beginPath();
      targetCtx.ellipse(x - radius * 0.22, y - radius * 0.3, radius * 0.46, radius * 0.28, -0.35, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();

      targetCtx.save();
      targetCtx.beginPath();
      targetCtx.arc(x, carvedRingY, radius * 0.76, 0, Math.PI * 2);
      targetCtx.clip();
      const selectedCore = targetCtx.createRadialGradient(x - radius * 0.14, carvedRingY - radius * 0.16, radius * 0.08, x, carvedRingY, radius * 0.78);
      selectedCore.addColorStop(0, piece.color === "red" ? shade(textColor, 54) : "rgba(86, 84, 76, 0.96)");
      selectedCore.addColorStop(0.55, selectedTone);
      selectedCore.addColorStop(1, piece.color === "red" ? shade(textColor, -8) : "rgba(26, 26, 24, 0.94)");
      targetCtx.globalAlpha = 0.86;
      targetCtx.fillStyle = selectedCore;
      targetCtx.beginPath();
      targetCtx.arc(x, carvedRingY, radius * 0.76, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.restore();
    }

    targetCtx.save();
    targetCtx.beginPath();
    targetCtx.arc(x, carvedRingY, radius * 0.8, 0, Math.PI * 2);
    targetCtx.lineWidth = Math.max(1, radius * 0.026);
    targetCtx.strokeStyle = textColor;
    targetCtx.shadowColor = "rgba(42, 26, 14, 0.3)";
    targetCtx.shadowBlur = radius * 0.18;
    targetCtx.shadowOffsetX = radius * 0.12;
    targetCtx.shadowOffsetY = radius * 0.18;
    targetCtx.globalAlpha = 0.72;
    targetCtx.stroke();
    targetCtx.restore();

    targetCtx.textAlign = "center";
    targetCtx.textBaseline = "middle";
    targetCtx.font = `600 ${radius * 0.91}px "STKaiti", "KaiTi", "Songti SC", serif`;
    drawEngravedPieceText(theme, piece, x, carvedRingY + radius * 0.02, radius, targetCtx, selected ? "#fffaf0" : null);
    targetCtx.restore();
  }

  function drawEngravedPieceText(theme, piece, x, y, radius, targetCtx = ctx, colorOverride = null) {
    const text = LABELS[piece.color][piece.type];
    const color = colorOverride || (piece.color === "red" ? theme.redText : theme.blackText);
    const groove = shade(color, -28);
    targetCtx.save();
    targetCtx.lineJoin = "round";
    targetCtx.lineCap = "round";
    targetCtx.shadowColor = "rgba(50, 34, 20, 0.2)";
    targetCtx.shadowBlur = radius * 0.02;
    targetCtx.shadowOffsetX = radius * 0.014;
    targetCtx.shadowOffsetY = radius * 0.022;
    targetCtx.strokeStyle = groove;
    targetCtx.lineWidth = Math.max(0.55, radius * 0.022);
    targetCtx.strokeText(text, x, y);

    targetCtx.shadowColor = "transparent";
    targetCtx.globalAlpha = 0.22;
    targetCtx.fillStyle = "rgba(255,255,255,0.56)";
    targetCtx.fillText(text, x - radius * 0.01, y - radius * 0.016);

    targetCtx.globalAlpha = 1;
    targetCtx.fillStyle = color;
    targetCtx.fillText(text, x, y);

    targetCtx.globalAlpha = 0.1;
    targetCtx.strokeStyle = "rgba(255,255,255,0.48)";
    targetCtx.lineWidth = Math.max(0.45, radius * 0.008);
    targetCtx.strokeText(text, x - radius * 0.005, y - radius * 0.009);
    targetCtx.restore();
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function displayGridPoint(displayRow, displayCol) {
    const { marginX, marginY, cellX, cellY } = metrics;
    return {
      x: marginX + displayCol * cellX,
      y: marginY + displayRow * cellY
    };
  }

  function boardToScreen(row, col) {
    const displayRow = game.flipped ? ROWS - 1 - row : row;
    const displayCol = game.flipped ? COLS - 1 - col : col;
    return displayGridPoint(displayRow, displayCol);
  }

  function screenToBoard(x, y) {
    const { marginX, marginY, cellX, cellY, pieceRadius } = metrics;
    const displayCol = Math.round((x - marginX) / cellX);
    const displayRow = Math.round((y - marginY) / cellY);
    if (displayRow < 0 || displayRow >= ROWS || displayCol < 0 || displayCol >= COLS) {
      return null;
    }
    const point = displayGridPoint(displayRow, displayCol);
    const distance = Math.hypot(point.x - x, point.y - y);
    if (distance > pieceRadius * 1.35) {
      return null;
    }
    return {
      row: game.flipped ? ROWS - 1 - displayRow : displayRow,
      col: game.flipped ? COLS - 1 - displayCol : displayCol
    };
  }

  function isReviewing() {
    return game.reviewIndex !== null;
  }

  function isGuiding() {
    return game.guide.active && (game.guide.analysis || game.guide.snapshots[game.guide.index]);
  }

  function currentReviewIndex() {
    return game.reviewIndex === null ? game.snapshots.length - 1 : game.reviewIndex;
  }

  function nextReviewMove() {
    const index = currentReviewIndex();
    return game.snapshots[index + 1]?.lastMove || null;
  }

  function currentViewState() {
    if (isReviewing() && game.snapshots[game.reviewIndex]) {
      return game.snapshots[game.reviewIndex];
    }
    if (isGuiding() && game.guide.analysis) {
      return game.guide.analysis;
    }
    return {
      board: game.board,
      turn: game.turn,
      winner: game.winner,
      draw: game.draw,
      lastMove: game.lastMove,
      captured: game.captured
    };
  }

  function setReviewIndex(index, options = {}) {
    if (!game.snapshots.length) {
      return;
    }
    if (!options.keepPlayback) {
      clearReviewPlayback();
    }
    stopMoveAnimation();
    game.selected = null;
    game.legalMoves = [];
    game.reviewIndex = clamp(index, 0, game.snapshots.length - 1);
    const nextMove = nextReviewMove();
    const nextText = nextMove ? `下一手：${formatMoveOnBoard(currentViewState().board, nextMove)}。` : "已到最后局面。";
    game.notice = game.reviewIndex === game.snapshots.length - 1 ? "正在查看最新局面。" : `复盘第 ${game.reviewIndex} 手，${nextText}`;
    render();
  }

  function jumpReviewTo(index, options = {}) {
    if (!game.snapshots.length) {
      return;
    }
    clearGuide();
    if (!options.keepPlayback) {
      clearReviewPlayback();
    }
    setReviewIndex(clamp(index, 0, game.snapshots.length - 1), options);
  }

  function jumpReviewStep(delta, options = {}) {
    if (!game.snapshots.length) {
      return;
    }
    clearGuide();
    const fromIndex = currentReviewIndex();
    const toIndex = clamp(fromIndex + delta, 0, game.snapshots.length - 1);
    if (toIndex === fromIndex) {
      game.notice = toIndex === 0 ? "已经在开局。" : "已经在最后局面。";
      render();
      return;
    }
    const move = delta > 0 ? game.snapshots[toIndex]?.lastMove : game.snapshots[fromIndex]?.lastMove;
    setReviewIndex(toIndex, options);
    if (move?.piece) {
      const animationMove = delta > 0
        ? move
        : { ...move, from: { ...move.to }, to: { ...move.from } };
      startMoveAnimation(animationMove, move.piece, move.captured, MOVE_ANIMATION_MS);
    }
  }

  function playReviewLine() {
    if (!game.snapshots.length || currentReviewIndex() >= game.snapshots.length - 1) {
      game.notice = "复盘已到最后局面。";
      render();
      return;
    }
    clearGuide();
    clearReviewPlayback();
    game.notice = "正在播放对局回放。";
    const step = () => {
      if (!isReviewing() || currentReviewIndex() >= game.snapshots.length - 1) {
        clearReviewPlayback();
        render();
        return;
      }
      jumpReviewStep(1, { keepPlayback: true });
      reviewPlayTimer = setTimeout(step, MOVE_ANIMATION_MS + 280);
    };
    reviewPlayTimer = setTimeout(step, 80);
    render();
  }

  function returnToLiveReview() {
    clearGuide();
    clearReviewPlayback();
    stopMoveAnimation();
    game.selected = null;
    game.legalMoves = [];
    if (game.archiveReviewing && game.archiveReturnSnapshot) {
      const snapshot = structuredClone(game.archiveReturnSnapshot);
      loadSnapshot(snapshot);
      game.notice = "已回到原对局。";
      render();
      return;
    }
    game.reviewIndex = null;
    game.notice = "已回到实战局面。";
    render();
  }

  function handleStepStart() {
    if (isReviewing()) {
      jumpReviewTo(0);
      return;
    }
    resetGuideTrailStart();
  }

  function handleStepPrev() {
    if (isReviewing()) {
      jumpReviewStep(-1);
      return;
    }
    stepBackGuideMove();
  }

  function handleStepPlay() {
    if (isReviewing()) {
      playReviewLine();
      return;
    }
    playGuideLine();
  }

  function handleStepNext() {
    if (isReviewing()) {
      jumpReviewStep(1);
      return;
    }
    playRecommendedGuideMove();
  }

  function handleStepEnd() {
    if (isReviewing()) {
      returnToLiveReview();
      return;
    }
    endGuide();
  }

  function setGuideIndex(index) {
    if (!game.guide.snapshots.length) {
      return;
    }
    const previous = game.guide.index;
    game.guide.active = true;
    game.guide.index = clamp(index, 0, game.guide.snapshots.length - 1);
    game.guide.analysis = makeGuideAnalysisState(game.guide.snapshots[game.guide.index]);
    const moveText = game.guide.moves[game.guide.index - 1]?.text || "起点";
    game.notice = `Pikafish 指导：${moveText}`;
    if (game.guide.index > previous) {
      animateGuideStep(game.guide.index);
    } else if (game.guide.index < previous) {
      animateGuideReverseStep(previous);
    } else {
      render();
    }
  }

  function stepBackGuideMove() {
    if (!isGuiding() || game.guide.loading || game.animation) {
      return;
    }
    ensureGuideTrail();
    if (game.guide.trailIndex <= 0) {
      game.notice = "已经在推演起点。";
      updateUi();
      return;
    }
    const currentState = makeGuideAnalysisState(game.guide.analysis);
    const previousIndex = game.guide.index;
    const targetTrailIndex = game.guide.trailIndex - 1;
    const targetIndex = Math.max(0, previousIndex - 1);
    const targetState = makeGuideAnalysisState(game.guide.trail[targetTrailIndex]);
    const currentLastMove = currentState.lastMove;
    game.guide.playing = false;
    game.guide.index = targetIndex;
    game.guide.trailIndex = targetTrailIndex;
    game.guide.intent = null;
    game.selected = null;
    game.legalMoves = [];
    game.notice = "已退回上一步。";
    if (currentLastMove?.piece && currentLastMove.from && currentLastMove.to) {
      startMoveAnimation({
        from: { ...currentLastMove.to },
        to: { ...currentLastMove.from }
      }, currentLastMove.piece, null, GUIDE_ANIMATION_MS, () => {
        game.guide.analysis = targetState;
        game.guide.intent = null;
      });
      return;
    }
    stopMoveAnimation();
    game.guide.analysis = targetState;
    render();
  }

  function resetGuideTrailStart() {
    if (!isGuiding() || game.guide.loading || game.animation) {
      return;
    }
    ensureGuideTrail();
    game.guide.playing = false;
    game.guide.trailIndex = 0;
    game.guide.index = 0;
    game.guide.analysis = makeGuideAnalysisState(game.guide.trail[0]);
    game.guide.intent = null;
    game.selected = null;
    game.legalMoves = [];
    stopMoveAnimation();
    game.notice = "已回到推演起点。";
    render();
  }

  function selectGuideVariation(index) {
    const variation = game.guide.variations[index];
    if (!variation) {
      return;
    }
    stopMoveAnimation();
    game.guide.playing = false;
    game.guide.selectedVariation = index;
    game.guide.active = true;
    game.guide.index = Math.min(1, variation.snapshots.length - 1);
    game.guide.snapshots = variation.snapshots;
    game.guide.moves = variation.moves;
    game.guide.analysis = makeGuideAnalysisState(variation.snapshots[game.guide.index]);
    game.guide.trail = variation.snapshots.slice(0, game.guide.index + 1).map((item) => makeGuideAnalysisState(item));
    game.guide.trailIndex = game.guide.trail.length - 1;
    game.guide.intent = null;
    game.notice = `${variation.best ? "最优路线" : `候选路线 ${index + 1}`}：${describeOpponentGuideIntent(variation)}。`;
    if (game.guide.index > 0) {
      animateGuideStep(game.guide.index);
    } else {
      showGuideIntent(variation.moves[0]);
      render();
    }
  }

  function animateGuideStep(stepIndex) {
    const step = game.guide.moves[stepIndex - 1];
    if (!step) {
      return;
    }
    if (isOpponentGuideStep(step) || !canAnimateGuideStep(step)) {
      showGuideIntent(step);
      return;
    }
    game.guide.intent = makeGuideIntent(nextOpponentGuideStep(stepIndex));
    startMoveAnimation(step.move, step.moving, step.captured, GUIDE_ANIMATION_MS);
  }

  function animateGuideReverseStep(previousIndex) {
    const step = game.guide.moves[previousIndex - 1];
    if (!step) {
      return;
    }
    const reverseStep = {
      ...step,
      move: {
        from: { ...step.move.to },
        to: { ...step.move.from }
      },
      text: `${step.text}（回看意图）`
    };
    if (isOpponentGuideStep(step) || !canAnimateGuideStep(reverseStep)) {
      showGuideIntent(reverseStep);
      return;
    }
    game.guide.intent = null;
    startMoveAnimation(reverseStep.move, step.moving, null, GUIDE_ANIMATION_MS);
  }

  function isOpponentGuideStep(step) {
    if (!step?.moving) {
      return false;
    }
    return step.moving.color === currentGuideOpponentColor();
  }

  function currentGuideOpponentColor() {
    const turn = game.guide.analysis?.turn || game.turn;
    return game.mode === "ai" ? otherColor(game.playerColor) : turn;
  }

  function nextOpponentGuideStep(fromStepIndex = 0) {
    return game.guide.moves.slice(Math.max(0, fromStepIndex)).find((step) => isOpponentGuideStep(step)) || null;
  }

  function makeGuideIntent(step) {
    if (!step?.move || !step.moving) {
      return null;
    }
    return {
      move: {
        from: { ...step.move.from },
        to: { ...step.move.to }
      },
      moving: clonePiece(step.moving),
      text: step.text
    };
  }

  function describeOpponentGuideIntent(variation) {
    const first = variation?.moves?.[0] || null;
    const opponent = variation?.moves?.find((step) => step.moving?.color === currentGuideOpponentColor()) || null;
    if (!first) {
      return "暂未找到可演化着法";
    }
    if (opponent && opponent === first) {
      return `对方下一步预计 ${opponent.text}`;
    }
    if (opponent) {
      return `若先走 ${first.text}，对方预计 ${opponent.text}`;
    }
    return `推荐下一手 ${first.text}`;
  }

  function canAnimateGuideStep(step) {
    const piece = game.board[step.move.from.row]?.[step.move.from.col];
    return Boolean(
      piece &&
        step.moving &&
        piece.color === step.moving.color &&
        piece.type === step.moving.type &&
        (!step.moving.id || !piece.id || piece.id === step.moving.id)
    );
  }

  function showGuideIntent(step) {
    stopMoveAnimation();
    game.guide.intent = makeGuideIntent(step);
    render();
  }

  async function playGuideLine() {
    if (!isGuiding() || game.guide.playing) {
      return;
    }
    game.guide.playing = true;
    game.notice = "正在动画播放当前推演路线。";
    updateUi();
    while (game.guide.playing && isGuiding() && game.guide.moves[game.guide.index]) {
      if (!playRecommendedGuideMove()) {
        break;
      }
      await wait(GUIDE_ANIMATION_MS + 120);
    }
    game.guide.playing = false;
    updateUi();
  }

  function playRecommendedGuideMove() {
    if (!isGuiding() || game.guide.loading || game.animation) {
      return false;
    }
    const step = game.guide.moves[game.guide.index] || game.guide.moves[0];
    if (!step?.move) {
      game.notice = "当前没有可执行的推荐下一步，请重新推演。";
      updateUi();
      return false;
    }
    const view = currentViewState();
    const legal = getAllLegalMoves(view.board, view.turn).find((move) => moveKey(move) === moveKey(step.move));
    if (!legal) {
      game.notice = "当前沙盘已偏离原路线，正在重新计算推荐下一步。";
      requestGuideLine({ realtime: true });
      return false;
    }
    commitGuideMove(legal);
    return true;
  }

  function endGuide() {
    clearGuide();
    game.notice = "已结束 Pikafish 指导，回到实战局面。";
    render();
  }

  function makeGuideAnalysisState(source = null) {
    const base = source || game.guide.analysis || {
      board: game.board,
      turn: game.turn,
      winner: game.winner,
      draw: game.draw,
      lastMove: game.lastMove,
      captured: game.captured
    };
    return {
      board: cloneBoard(base.board),
      turn: base.turn,
      winner: base.winner || null,
      draw: Boolean(base.draw),
      lastMove: base.lastMove ? structuredClone(base.lastMove) : null,
      captured: cloneCaptured(base.captured || { red: [], black: [] })
    };
  }

  function ensureGuideTrail() {
    if (!game.guide.trail?.length) {
      const state = makeGuideAnalysisState();
      game.guide.trail = [state];
      game.guide.trailIndex = 0;
    }
  }

  function pushGuideTrail(state) {
    const next = makeGuideAnalysisState(state);
    const prefix = (game.guide.trail || []).slice(0, Math.max(0, game.guide.trailIndex) + 1);
    prefix.push(next);
    game.guide.trail = prefix;
    game.guide.trailIndex = prefix.length - 1;
  }

  function scheduleGuideRefresh(delay = GUIDE_ANIMATION_MS + 120) {
    if (guideRefreshTimer) {
      clearTimeout(guideRefreshTimer);
    }
    guideRefreshTimer = setTimeout(() => {
      guideRefreshTimer = null;
      if (game.guide.analysis && !game.winner && !game.draw) {
        requestGuideLine({ realtime: true });
      }
    }, delay);
  }

  function matchingGuideStepIndex(board, move) {
    if (!game.guide.moves.length) {
      return -1;
    }
    const moveId = moveKey(move);
    const start = Math.max(0, Math.min(game.guide.index, game.guide.moves.length - 1));
    for (let index = start; index < game.guide.moves.length; index += 1) {
      const step = game.guide.moves[index];
      const piece = board[step.move.from.row]?.[step.move.from.col];
      if (!piece || !step.moving || piece.color !== step.moving.color || piece.type !== step.moving.type) {
        continue;
      }
      return moveKey(step.move) === moveId ? index : -1;
    }
    for (let index = 0; index < start; index += 1) {
      const step = game.guide.moves[index];
      const piece = board[step.move.from.row]?.[step.move.from.col];
      if (!piece || !step.moving || piece.color !== step.moving.color || piece.type !== step.moving.type) {
        continue;
      }
      return moveKey(step.move) === moveId ? index : -1;
    }
    return -1;
  }

  function commitGuideMove(move) {
    if (!game.guide.analysis) {
      game.guide.analysis = makeGuideAnalysisState();
    }
    const keepPlaying = game.guide.playing;
    const analysis = makeGuideAnalysisState(game.guide.analysis);
    const moving = analysis.board[move.from.row]?.[move.from.col];
    const captured = analysis.board[move.to.row]?.[move.to.col];
    if (!moving) {
      return;
    }
    const matchedStepIndex = matchingGuideStepIndex(analysis.board, move);
    const followsOriginalLine = matchedStepIndex >= 0;
    const moveText = formatMoveOnBoard(analysis.board, move);
    const movingBeforeMove = clonePiece(moving);
    const capturedBeforeMove = clonePiece(captured);
    applyMoveOnBoard(analysis.board, move);
    if (captured) {
      analysis.captured[moving.color].push(clonePiece(captured));
    }
    analysis.lastMove = {
      from: { ...move.from },
      to: { ...move.to },
      piece: movingBeforeMove,
      captured: capturedBeforeMove
    };
    analysis.turn = otherColor(moving.color);
    analysis.winner = null;
    analysis.draw = false;
    game.guide.analysis = analysis;
    pushGuideTrail(analysis);
    game.guide.active = true;
    game.guide.playing = keepPlaying;
    if (followsOriginalLine) {
      if (guideRefreshTimer) {
        clearTimeout(guideRefreshTimer);
        guideRefreshTimer = null;
      }
      game.guide.index = matchedStepIndex + 1;
      game.guide.intent = makeGuideIntent(game.guide.moves[game.guide.index]);
      game.notice = game.guide.intent
        ? `沙盘沿用原推演：${COLOR_NAMES[moving.color]} ${moveText}。下一步意图：${game.guide.intent.text}。`
        : `沙盘沿用原推演：${COLOR_NAMES[moving.color]} ${moveText}。当前路线已到末端。`;
    } else {
      game.guide.intent = null;
      game.guide.snapshots = [makeGuideAnalysisState(analysis)];
      game.guide.moves = [];
      game.guide.variations = [];
      game.guide.selectedVariation = 0;
      game.guide.index = 0;
      game.notice = `沙盘已试走新变化：${COLOR_NAMES[moving.color]} ${moveText}。Pikafish 正在刷新${COLOR_NAMES[analysis.turn]}下一手。`;
    }
    game.selected = null;
    game.legalMoves = [];
    startMoveAnimation(move, movingBeforeMove, capturedBeforeMove, GUIDE_ANIMATION_MS);
    if (followsOriginalLine) {
      render();
    } else {
      scheduleGuideRefresh();
    }
  }

  async function requestGuideLine(options = {}) {
    if (game.guide.loading || game.thinking || game.animation) {
      return;
    }
    const guideDepth = normalizeGuideDepth(els.guideDepthInput.value);
    const guideThreads = guideThreadCount(guideDepth);
    const guideMode = guideAnalysisMode(guideDepth, guideThreads);
    els.guideDepthInput.value = String(guideDepth);
    saveGuideDepth(guideDepth);
    if (game.guide.controller) {
      game.guide.controller.abort();
    }
    const controller = new AbortController();
    const token = game.guide.token + 1;
    const analysis = makeGuideAnalysisState(options.realtime ? game.guide.analysis : null);
    const existingTrail = options.realtime && game.guide.trail?.length
      ? game.guide.trail.map((item) => makeGuideAnalysisState(item))
      : [makeGuideAnalysisState(analysis)];
    const existingTrailIndex = options.realtime && game.guide.trail?.length
      ? clamp(game.guide.trailIndex, 0, existingTrail.length - 1)
      : 0;
    game.reviewIndex = null;
    game.guide.loading = true;
    game.guide.active = true;
    game.guide.analysis = analysis;
    game.guide.trail = existingTrail;
    game.guide.trailIndex = existingTrailIndex;
    game.guide.info = null;
    game.guide.intent = null;
    game.guide.controller = controller;
    game.guide.token = token;
    game.notice = `Pikafish 正在以${guideMode}分析${COLOR_NAMES[analysis.turn]}下一手。`;
    render();
    try {
      const data = await requestPikafishAnalysis({
        signal: controller.signal,
        board: analysis.board,
        turn: analysis.turn,
        moveTime: 300000,
        depth: guideDepth,
        multiPv: 6,
        threads: guideThreads
      });
      if (token !== game.guide.token) {
        return;
      }
      if (!data.available || !data.move) {
        throw new Error(data.error || "Pikafish 未返回指导着法");
      }
      const variations = buildGuideVariations(data, analysis);
      if (!variations.length) {
        throw new Error("Pikafish 返回的变化线无法在当前棋盘演化");
      }
      await fillMissingOpponentReplies(variations, analysis, guideDepth, guideThreads, controller.signal);
      if (token !== game.guide.token) {
        return;
      }
      const best = variations[0];
      game.guide = {
        active: true,
        loading: false,
        index: 0,
        snapshots: best.snapshots,
        moves: best.moves,
        info: data,
        variations,
        selectedVariation: 0,
        playing: false,
        intent: null,
        analysis,
        trail: existingTrail,
        trailIndex: existingTrailIndex,
        controller: null,
        token
      };
      showGuideIntent(best.moves[0]);
      game.notice = `Pikafish 已刷新 ${variations.length} 条路线：${describeOpponentGuideIntent(best)}。`;
      render();
    } catch (error) {
      if (token !== game.guide.token) {
        return;
      }
      const isAbort = error.name === "AbortError";
      const health = isAbort ? "Pikafish 指导请求已中断。" : await probePikafishHealth();
      game.guide.loading = false;
      game.guide.controller = null;
      game.notice = `Pikafish 指导失败：${isAbort ? "请求超时或已取消" : error.message}。${health}`;
      render();
    }
  }

  function makeGuideStateAfterMove(baseState, move) {
    const state = makeGuideAnalysisState(baseState);
    const legal = getAllLegalMoves(state.board, state.turn).find((candidate) => moveKey(candidate) === moveKey(move));
    if (!legal) {
      return null;
    }
    const moving = state.board[legal.from.row][legal.from.col];
    const captured = state.board[legal.to.row][legal.to.col];
    applyMoveOnBoard(state.board, legal);
    if (captured) {
      state.captured[moving.color].push(clonePiece(captured));
    }
    state.lastMove = {
      from: { ...legal.from },
      to: { ...legal.to },
      piece: clonePiece(moving),
      captured: clonePiece(captured)
    };
    state.turn = otherColor(state.turn);
    state.winner = null;
    state.draw = false;
    return state;
  }

  async function fillMissingOpponentReplies(variations, baseState, guideDepth, guideThreads, signal) {
    const targets = variations
      .filter((variation) => variation.moves.length === 1)
      .slice(0, 1);
    for (const variation of targets) {
      const firstMove = variation.moves[0]?.move;
      const replyBase = firstMove ? makeGuideStateAfterMove(baseState, firstMove) : null;
      if (!replyBase) {
        continue;
      }
      const reply = await requestPikafishAnalysis({
        signal,
        board: replyBase.board,
        turn: replyBase.turn,
        moveTime: 300000,
        depth: guideDepth,
        multiPv: 1,
        threads: guideThreads
      });
      if (!reply.available || !reply.move) {
        continue;
      }
      const built = buildGuideLine([firstMove, reply.move], baseState);
      if (built.moves.length < 2) {
        continue;
      }
      const detail = describeGuideVariation({
        rank: variation.rank,
        depth: reply.depthReached || variation.depth,
        score: reply.variations?.[0]?.score || reply.score || variation.score,
        pv: [firstMove, reply.move]
      }, built, variation.rank - 1);
      variation.depth = reply.depthReached || variation.depth;
      variation.snapshots = built.snapshots;
      variation.moves = built.moves;
      variation.summary = detail.summary;
      variation.detail = detail.detail;
      variation.outcome = detail.outcome;
      variation.scoreText = formatGuideScore(reply.variations?.[0]?.score || variation.score);
    }
  }

  function buildGuideLine(line, baseState = null) {
    const base = makeGuideAnalysisState(baseState);
    const board = cloneBoard(base.board);
    const captured = cloneCaptured(base.captured);
    let turn = base.turn;
    let lastMove = base.lastMove ? structuredClone(base.lastMove) : null;
    const snapshots = [{
      board: cloneBoard(board),
      turn,
      winner: base.winner,
      draw: base.draw,
      lastMove,
      captured: cloneCaptured(captured)
    }];
    const moves = [];
    for (const rawMove of line) {
      const legal = getAllLegalMoves(board, turn).find((move) => moveKey(move) === moveKey(rawMove));
      if (!legal) {
        break;
      }
      const moving = board[legal.from.row][legal.from.col];
      const target = board[legal.to.row][legal.to.col];
      const movingBeforeMove = clonePiece(moving);
      const capturedBeforeMove = clonePiece(target);
      const text = `${COLOR_NAMES[turn]} ${formatMoveOnBoard(board, legal)}`;
      applyMoveOnBoard(board, legal);
      if (target) {
        captured[moving.color].push(clonePiece(target));
      }
      lastMove = {
        from: { ...legal.from },
        to: { ...legal.to },
        piece: clonePiece(moving),
        captured: clonePiece(target)
      };
      turn = otherColor(turn);
      moves.push({
        move: {
          from: { ...legal.from },
          to: { ...legal.to }
        },
        moving: movingBeforeMove,
        captured: capturedBeforeMove,
        text
      });
      snapshots.push({
        board: cloneBoard(board),
        turn,
        winner: null,
        draw: false,
        lastMove,
        captured: cloneCaptured(captured)
      });
    }
    return { snapshots, moves };
  }

  function buildGuideVariations(data, baseState = null) {
    const source = Array.isArray(data.variations) && data.variations.length
      ? data.variations
      : [{ rank: 1, depth: data.depthReached, score: null, pv: Array.isArray(data.pv) && data.pv.length ? data.pv : [data.move] }];
    return source
      .map((variation, index) => {
        const built = buildGuideLine(variation.pv || [], baseState);
        if (!built.moves.length) {
          return null;
        }
        const detail = describeGuideVariation(variation, built, index);
        return {
          rank: variation.rank || index + 1,
          best: index === 0,
          score: variation.score || null,
          depth: variation.depth || data.depthReached || null,
          nodes: variation.nodes || 0,
          time: variation.time || 0,
          snapshots: built.snapshots,
          moves: built.moves,
          summary: detail.summary,
          detail: detail.detail,
          outcome: detail.outcome,
          scoreText: formatGuideScore(variation.score)
        };
      })
      .filter(Boolean);
  }

  function formatGuideScore(score) {
    if (!score) {
      return "评分未知";
    }
    if (score.type === "mate") {
      return score.text || "杀棋";
    }
    return score.text || `${score.value > 0 ? "+" : ""}${(Number(score.value || 0) / 100).toFixed(2)}兵`;
  }

  function describeGuideVariation(variation, built, index) {
    const evolution = built.moves
      .slice(0, 8)
      .map((move, moveIndex) => `${moveIndex + 1}. ${move.text}`)
      .join("；");
    const remaining = built.moves.length > 8 ? `；后续还有 ${built.moves.length - 8} 手` : "";
    const outcome = describeGuideOutcome(variation.score);
    const prefix = index === 0 ? "最优演化" : `候选${index + 1}演化`;
    return {
      summary: `${prefix}：${evolution || "暂无可演化着法"}${remaining}。最终：${outcome}`,
      detail: `${prefix}共 ${built.moves.length} 手。${evolution || "暂无可演化着法"}${remaining}。最终判断：${outcome}`,
      outcome
    };
  }

  function describeGuideOutcome(score) {
    if (!score) {
      return `${COLOR_NAMES[game.turn]}与${COLOR_NAMES[otherColor(game.turn)]}形势未知`;
    }
    if (score.type === "mate") {
      const winningColor = score.value > 0 ? game.turn : otherColor(game.turn);
      const losingColor = otherColor(winningColor);
      return `${COLOR_NAMES[winningColor]}存在杀势，${COLOR_NAMES[losingColor]}防守压力极大（${score.text}）`;
    }
    const cp = Number(score.cp ?? score.value ?? 0);
    const betterColor = cp >= 0 ? game.turn : otherColor(game.turn);
    const worseColor = otherColor(betterColor);
    const abs = Math.abs(cp);
    const level = abs >= 300 ? "明显优势" : abs >= 120 ? "较优" : abs >= 40 ? "小优" : "大致均势";
    return abs < 40
      ? `${COLOR_NAMES[game.turn]}与${COLOR_NAMES[otherColor(game.turn)]}${level}（${formatGuideScore(score)}）`
      : `${COLOR_NAMES[betterColor]}${level}，${COLOR_NAMES[worseColor]}需防守调整（${formatGuideScore(score)}）`;
  }

  function handleCanvasClick(event) {
    if (!metrics) {
      return;
    }
    if (isReviewing()) {
      game.notice = "当前在复盘，请先回到实战。";
      updateUi();
      return;
    }
    if (game.winner || game.draw) {
      game.notice = game.draw ? "本局已和棋，请新开一局。" : `${COLOR_NAMES[game.winner]}已经获胜，请新开一局。`;
      updateUi();
      return;
    }
    if (!canCurrentUserMove()) {
      game.notice = blockedMoveNotice();
      updateUi();
      return;
    }

    const rect = els.canvas.getBoundingClientRect();
    const square = screenToBoard(event.clientX - rect.left, event.clientY - rect.top);
    if (!square) {
      game.selected = null;
      game.legalMoves = [];
      render();
      return;
    }

    const view = currentViewState();
    const board = view.board;
    const piece = board[square.row][square.col];
    if (game.selected) {
      const move = game.legalMoves.find((candidate) => candidate.to.row === square.row && candidate.to.col === square.col);
      if (move) {
        if (isGuiding()) {
          commitGuideMove(move);
          return;
        }
        commitMove(move, "human");
        return;
      }
    }

    if (piece && piece.color === view.turn) {
      selectPiece(square.row, square.col);
      render();
      return;
    }

    game.notice = `${COLOR_NAMES[view.turn]}行棋。`;
    game.selected = null;
    game.legalMoves = [];
    render();
  }

  function selectPiece(row, col) {
    const view = currentViewState();
    const piece = view.board[row][col];
    game.selected = { row, col };
    game.legalMoves = getLegalMovesForPiece(view.board, row, col);
    const label = LABELS[piece.color][piece.type];
    game.notice = game.legalMoves.length ? `已选中${COLOR_NAMES[piece.color]}${label}。` : `${COLOR_NAMES[piece.color]}${label}暂无可走位置。`;
  }

  function canCurrentUserMove() {
    if (game.animation) {
      return false;
    }
    if (isGuiding()) {
      return !game.guide.loading;
    }
    if (game.thinking) {
      return false;
    }
    if (game.mode === "local") {
      return true;
    }
    if (game.mode === "ai") {
      return game.turn === game.playerColor;
    }
    if (game.mode === "online") {
      return Boolean(game.online?.roomCode && onlineReady() && game.online.color === game.turn);
    }
    return false;
  }

  function blockedMoveNotice() {
    if (game.animation) {
      return "棋子正在移动。";
    }
    if (game.thinking) {
      return "AI 正在思考。";
    }
    if (game.mode === "ai") {
      return "轮到 AI 行棋。";
    }
    if (game.mode === "online") {
      if (!game.online?.roomCode) {
        return "请先创建或加入玩家对练房间。";
      }
      if (!onlineReady()) {
        return "等待另一位玩家加入。";
      }
      return `轮到${COLOR_NAMES[game.turn]}。`;
    }
    return `${COLOR_NAMES[game.turn]}行棋。`;
  }

  function consumeTurnClock(color) {
    if (!shouldRunClock()) {
      return true;
    }
    const now = Date.now();
    const elapsed = Math.max(0, now - game.clocks.turnStartedAt);
    const base = color === "red" ? game.clocks.redMs : game.clocks.blackMs;
    if (elapsed >= game.clocks.stepMs || elapsed >= base) {
      game.winner = otherColor(color);
      if (color === "red") {
        game.clocks.redMs = 0;
      } else {
        game.clocks.blackMs = 0;
      }
      game.notice = `${COLOR_NAMES[color]}超时，${COLOR_NAMES[game.winner]}获胜。`;
      game.endReason = {
        title: `对局结束 · ${COLOR_NAMES[game.winner]}超时胜`,
        summary: `${COLOR_NAMES[color]}局时或步时耗尽。`,
        detail: `当前局时规则为 ${game.timeControl.label}。${COLOR_NAMES[color]}未能在限制时间内完成走子，本局由${COLOR_NAMES[game.winner]}获胜。`
      };
      game.pendingMateModal = buildEndAnnouncement({ ...game.endReason, version: game.version + 1 });
      return false;
    }
    if (color === "red") {
      game.clocks.redMs = Math.max(0, base - elapsed);
    } else {
      game.clocks.blackMs = Math.max(0, base - elapsed);
    }
    game.clocks.turnStartedAt = now;
    return true;
  }

  function advanceTurnClockAfterMove() {
    if (shouldRunClock()) {
      game.clocks.turnStartedAt = Date.now();
    }
  }

  function commitMove(move, source) {
    const before = makeSnapshot();
    const baseVersion = game.version;
    const movingPiece = game.board[move.from.row]?.[move.from.col];
    if ((game.mode === "online" || game.mode === "local") && source === "human" && movingPiece && !consumeTurnClock(movingPiece.color)) {
      maybeSaveCompletedGame();
      render();
      scheduleMateModal();
      return;
    }
    const moveResult = applyMoveToGame(move);
    advanceTurnClockAfterMove();
    game.version = baseVersion + 1;
    maybeSaveCompletedGame();
    game.selected = null;
    game.legalMoves = [];
    if (game.guide.active && source === "human") {
      clearGuide();
    }
    if (source === "human") {
      game.bookInfo = null;
    }
    const afterMoveSettled = () => {
      if (!(game.mode === "online" && source === "human")) {
        maybeScheduleAiTurn();
      }
    };

    if (moveResult) {
      startMoveAnimation(move, moveResult.moving, moveResult.captured, MOVE_ANIMATION_MS, afterMoveSettled);
    } else {
      render();
      afterMoveSettled();
    }
    scheduleMateModal();

    if (game.mode === "online" && source === "human") {
      publishOnlineMove(baseVersion, makeSnapshot(), before);
      return;
    }
  }

  function applyMoveToGame(move) {
    const moving = game.board[move.from.row][move.from.col];
    const captured = game.board[move.to.row][move.to.col];
    if (!moving) {
      return null;
    }
    const movingBeforeMove = clonePiece(moving);
    const capturedBeforeMove = clonePiece(captured);
    game.board[move.to.row][move.to.col] = moving;
    game.board[move.from.row][move.from.col] = null;
    if (captured) {
      game.captured[moving.color].push(captured);
    }
    game.lastMove = {
      from: { ...move.from },
      to: { ...move.to },
      piece: { ...moving },
      captured: captured ? { ...captured } : null
    };
    game.moveKeys.push(moveKey(move));

    const opponent = otherColor(moving.color);
    const historyItem = {
      no: game.history.length + 1,
      color: moving.color,
      piece: LABELS[moving.color][moving.type],
      from: formatCoord(move.from),
      to: formatCoord(move.to),
      captured: captured ? LABELS[captured.color][captured.type] : "",
      check: false,
      mate: false,
      stale: false
    };

    if (captured?.type === "king" || !findKing(game.board, opponent)) {
      game.winner = moving.color;
      historyItem.mate = true;
      game.notice = `${COLOR_NAMES[moving.color]}获胜。`;
      game.endReason = null;
      game.pendingMateModal = buildMateAnnouncement(historyItem, movingBeforeMove, capturedBeforeMove, "斩将定局");
    } else {
      game.turn = opponent;
      const opponentMoves = getAllLegalMoves(game.board, opponent);
      const checked = isKingInCheck(game.board, opponent);
      historyItem.check = checked;
      if (!opponentMoves.length) {
        if (checked) {
          game.winner = moving.color;
          historyItem.stale = true;
          game.notice = `${COLOR_NAMES[moving.color]}将死获胜。`;
          game.endReason = null;
          game.pendingMateModal = buildMateAnnouncement(historyItem, movingBeforeMove, capturedBeforeMove, "将死绝杀");
        } else {
          game.winner = moving.color;
          historyItem.mate = true;
          game.notice = `${COLOR_NAMES[opponent]}困毙无子可动，${COLOR_NAMES[moving.color]}获胜。`;
          game.endReason = {
            title: `对局结束 · ${COLOR_NAMES[moving.color]}困毙胜`,
            summary: `${COLOR_NAMES[opponent]}没有任何合法着法，按困毙判负。`,
            detail: `${COLOR_NAMES[opponent]}虽未处于将军状态，但所有棋子均无法形成合法应手，本局由${COLOR_NAMES[moving.color]}获胜。`
          };
          game.pendingMateModal = buildEndAnnouncement({ ...game.endReason, version: game.version + 1 });
        }
      } else if (checked) {
        game.notice = `${COLOR_NAMES[opponent]}被将军。`;
      } else {
        game.notice = `${COLOR_NAMES[opponent]}行棋。`;
      }
    }

    game.history.unshift(historyItem);
    game.positionKeys.push(positionKey(game.board, game.turn));
    game.snapshots.push(buildReviewSnapshot());
    return {
      moving: movingBeforeMove,
      captured: capturedBeforeMove
    };
  }

  function maybeScheduleAiTurn() {
    if (game.mode === "ai" && game.turn !== game.playerColor && !game.winner && !game.draw) {
      if (game.animation || game.thinking) {
        return;
      }
      scheduleAiMove(game.turn);
    }
  }

  function scheduleAiMove(color = game.turn) {
    if (game.thinking && game.turn === color) {
      return;
    }
    if (game.animation || game.mode !== "ai" || game.turn !== color || color === game.playerColor || game.winner || game.draw) {
      return;
    }
    clearAiTimers();
    game.thinking = true;
    game.notice = `${COLOR_NAMES[color]} AI 正在思考。`;
    render();
    const requestId = ++game.aiRequestId;
    const config = AI_SEARCH_CONFIG[game.aiLevel] || AI_SEARCH_CONFIG.normal;
    const watchdogMs = Math.max(8000, Math.min((config.timeMs || 1000) + AI_WATCHDOG_EXTRA_MS, AI_WATCHDOG_MAX_MS));
    aiWatchdogTimer = setTimeout(async () => {
      aiWatchdogTimer = null;
      if (requestId !== game.aiRequestId || !game.thinking || game.winner || game.draw) {
        return;
      }
      console.warn("AI move watchdog recovered a stuck turn");
      game.aiRequestId += 1;
      game.thinking = false;
      render();
      await waitForNextPaint();
      if (game.turn !== color || game.mode !== "ai" || color === game.playerColor || game.winner || game.draw) {
        return;
      }
      const fallback = chooseAiMove(color, game.aiLevel);
      if (fallback) {
        game.notice = "AI 响应超时，已启用本地兜底走子。";
        commitMove(fallback, "ai");
      } else {
        game.winner = otherColor(color);
        game.notice = `AI 超时且无可用着法，${COLOR_NAMES[game.winner]}获胜。`;
        maybeSaveCompletedGame();
        render();
      }
    }, watchdogMs);
    aiTimer = setTimeout(async () => {
      try {
        await waitForNextPaint();
        if (requestId !== game.aiRequestId || !game.thinking || game.winner || game.draw || game.turn !== color) {
          return;
        }
        const move = await chooseAiMoveAsync(color, game.aiLevel, requestId);
        if (requestId !== game.aiRequestId || game.turn !== color || game.mode !== "ai" || color === game.playerColor) {
          return;
        }
        clearAiTimers();
        game.thinking = false;
        if (move) {
          commitMove(move, "ai");
        } else {
          game.winner = otherColor(color);
          game.notice = `AI 无子可走，${COLOR_NAMES[game.winner]}获胜。`;
          maybeSaveCompletedGame();
          render();
        }
      } catch (error) {
        if (requestId !== game.aiRequestId || game.turn !== color || game.mode !== "ai" || color === game.playerColor) {
          return;
        }
        console.error("AI move failed", error);
        window.__lastAiError = {
          color,
          level: game.aiLevel,
          message: error.message || String(error),
          stack: error.stack || "",
          at: new Date().toISOString()
        };
        game.bookInfo = {
          source: "Pikafish 调度异常",
          family: "AI 外层调度",
          variation: error.message || String(error),
          notation: "重试 Pikafish",
          plan: "AI 外层调度捕获异常，正在重新请求浏览器内置 Pikafish WASM。"
        };
        clearAiTimers();
        render();
        await waitForNextPaint();
        const legalMoves = getAllLegalMoves(game.board, color);
        const retry = legalMoves.length ? await requestPikafishMove(color, game.aiLevel, legalMoves, requestId) : null;
        if (retry && requestId === game.aiRequestId && game.turn === color && game.mode === "ai") {
          game.thinking = false;
          commitMove(retry, "ai");
          return;
        }
        game.thinking = false;
        const fallback = chooseAiMove(color, game.aiLevel);
        if (fallback) {
          commitMove(fallback, "ai");
        } else {
          game.notice = `AI 行棋异常：${error.message || "未知错误"}。`;
          render();
        }
      }
    }, AI_AFTER_MOVE_DELAY_MS);
  }

  async function chooseAiMoveAsync(color, level, requestId) {
    const moves = getAllLegalMoves(game.board, color);
    game.bookInfo = null;
    if (!moves.length) {
      return null;
    }
    if (BOOK_FIRST_LEVELS.has(level)) {
      const isFirstAiMove = !game.history.some((item) => item.color === color);
      if (isFirstAiMove) {
        const firstMove = await chooseFirstAiMoveByStrategy(color, level, moves, requestId);
        if (firstMove) {
          return firstMove;
        }
      } else {
        const bookChoice = chooseOpeningBookMove(color, moves, level);
        if (bookChoice) {
          game.bookInfo = bookChoice.info;
          return bookChoice.move;
        }
      }
    }
    if (requestId !== game.aiRequestId) {
      return null;
    }
    const engineMove = await requestPikafishMove(color, level, moves, requestId);
    if (requestId !== game.aiRequestId) {
      return null;
    }
    return engineMove || chooseAiMove(color, level);
  }

  async function chooseFirstAiMoveByStrategy(color, level, moves, requestId) {
    const strategy = chooseFirstMoveStrategy();
    if (strategy === "random") {
      const firstMoveChoice = chooseFirstMovePaletteMove(color, level, moves);
      if (firstMoveChoice) {
        game.bookInfo = firstMoveChoice.info;
        return firstMoveChoice.move;
      }
      const bookChoice = chooseOpeningBookMove(color, moves, level);
      if (bookChoice) {
        game.bookInfo = bookChoice.info;
        return bookChoice.move;
      }
      return requestPikafishMove(color, level, moves, requestId);
    }
    if (strategy === "book") {
      const bookChoice = chooseOpeningBookMove(color, moves, level);
      if (bookChoice) {
        game.bookInfo = bookChoice.info;
        return bookChoice.move;
      }
      return requestPikafishMove(color, level, moves, requestId);
    }
    return requestPikafishMove(color, level, moves, requestId);
  }

  function chooseFirstMoveStrategy() {
    const entries = Object.entries(FIRST_AI_MOVE_STRATEGY);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [strategy, weight] of entries) {
      roll -= weight;
      if (roll <= 0) {
        return strategy;
      }
    }
    return "random";
  }

  function getPikafishWasmClient() {
    if (pikafishWasm) {
      return pikafishWasm;
    }
    if (!window.Worker) {
      pikafishWasm = { unavailable: "当前浏览器不支持 Web Worker" };
      return pikafishWasm;
    }
    let nextId = 1;
    pikafishWasm = {
      analyze(payload) {
        const id = nextId++;
        return new Promise((resolve, reject) => {
          const worker = new Worker(PIKAFISH_WASM_WORKER_URL);
          let settled = false;
          const finish = (fn, value) => {
            if (settled) {
              return;
            }
            settled = true;
            try {
              worker.terminate();
            } catch {}
            fn(value);
          };
          worker.onmessage = (event) => {
            const message = event.data || {};
            if (message.type === "ready" && !message.ok) {
              finish(reject, new Error(message.error || "Pikafish WASM 初始化失败"));
              return;
            }
            if (message.id !== id) {
              return;
            }
            if (message.ok) {
              finish(resolve, message);
            } else {
              finish(reject, new Error(message.error || "Pikafish WASM 分析失败"));
            }
          };
          worker.onerror = (error) => {
            finish(reject, new Error(error.message || "Pikafish WASM Worker 加载失败"));
          };
          worker.postMessage({ type: "analyze", id, ...payload });
        });
      },
      isReady() {
        return true;
      }
    };
    return pikafishWasm;
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

  function parsePikafishStats(raw) {
    const depths = [...String(raw || "").matchAll(/info depth (\d+)/g)].map((match) => Number(match[1]));
    const variations = parsePikafishVariations(raw);
    return {
      depthReached: depths.length ? Math.max(...depths) : null,
      pv: variations[0]?.pv || [],
      variations
    };
  }

  async function requestPikafishAnalysis({ board, turn, moveTime, depth, multiPv, threads, signal }) {
    if (signal?.aborted) {
      throw new DOMException("Pikafish 请求已取消", "AbortError");
    }
    const fen = boardToFen(board, turn);
    const timeoutMs = Math.max(3000, Math.min(Number(moveTime) || 1000, 300000) + 20000);
    if (DESKTOP_MODE) {
      const nativeResult = await requestJson("/api/engine/pikafish", {
        method: "POST",
        signal,
        body: JSON.stringify({
          board,
          turn,
          moveTime,
          depth,
          multiPv,
          threads
        })
      });
      if (!nativeResult.available || !nativeResult.move) {
        throw new Error(nativeResult.error || "桌面版 Pikafish 原生引擎未返回着法");
      }
      return {
        available: true,
        source: "native",
        bestmove: nativeResult.bestmove,
        move: nativeResult.move,
        fen: nativeResult.fen || fen,
        raw: nativeResult.raw || "",
        nnue: Boolean(nativeResult.nnue),
        depthReached: nativeResult.depthReached || null,
        pv: nativeResult.pv || [],
        variations: nativeResult.variations || []
      };
    }
    const client = getPikafishWasmClient();
    if (client.unavailable) {
      throw new Error(client.unavailable);
    }
    const run = (threadCount = threads) => client.analyze({
      fen,
      moveTime,
      depth,
      multiPv,
      threads: threadCount,
      timeoutMs
    });
    let result;
    try {
      result = await run();
    } catch (error) {
      if (signal?.aborted) {
        throw error;
      }
      try {
        result = await run(1);
      } catch (retryError) {
        retryError.message = `${retryError.message || "Pikafish WASM 分析失败"}；多线程重试前错误：${error.message || String(error)}`;
        throw retryError;
      }
    }
    const stats = parsePikafishStats(result.raw || "");
    return {
      available: true,
      source: "wasm",
      bestmove: result.bestmove,
      move: uciToMove(result.bestmove),
      fen,
      raw: result.raw || "",
      nnue: /NNUE evaluation/i.test(result.raw || ""),
      ...stats
    };
  }

  async function requestPikafishMove(color, level, legalMoves, requestId) {
    const config = AI_SEARCH_CONFIG[level] || AI_SEARCH_CONFIG.normal;
    const controller = new AbortController();
    const timeoutMs = Math.max(2000, Math.min((config.timeMs || 1000) + 35000, 60000));
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const threads = aiThreadCount(level);
    try {
      const data = await requestPikafishAnalysis({
        signal: controller.signal,
        board: game.board,
        turn: color,
        level,
        moveTime: config.timeMs,
        depth: Number.isFinite(config.maxDepth) ? config.maxDepth : null,
        multiPv: 5,
        threads
      });
      if (requestId !== game.aiRequestId || !data.move) {
        if (requestId === game.aiRequestId) {
          game.bookInfo = {
            source: "Pikafish 异常",
            family: "WASM 未返回着法",
            variation: data.error || data.bestmove || "无 bestmove",
            notation: "启用兜底",
            plan: `WASM 返回 available=${Boolean(data.available)}，${data.error || "没有可执行着法"}。已立即切换客户端自主搜索。`
          };
        }
        return null;
      }
      const legal = legalMoves.find((move) => moveKey(move) === moveKey(data.move));
      if (!legal) {
        console.warn("Pikafish returned illegal move", {
          color,
          level,
          fen: data.fen,
          bestmove: data.bestmove,
          parsed: data.move,
          legalMoves: legalMoves.map(moveKey),
          raw: data.raw
        });
        game.bookInfo = {
          source: "Pikafish 异常",
          family: "返回着法非法",
          variation: data.bestmove || moveKey(data.move),
          notation: "启用兜底",
          plan: "Pikafish WASM 返回的 bestmove 不在当前前端合法着法集合中，已切换本地兜底。"
        };
        return null;
      }
      game.bookInfo = {
        source: "Pikafish",
        family: data.source === "native" ? "桌面原生引擎" : data.available ? "浏览器 WASM 引擎" : "WASM 未可用",
        variation: data.bestmove || "bestmove",
        notation: formatMoveForBook(legal),
        plan: data.available
          ? `Pikafish ${data.source === "native" ? "桌面原生引擎" : "WASM"} 已接管本手决策，NNUE ${data.nnue ? "已加载" : "状态未知"}。${describePositiveEngineLines(data)}`
          : "未检测到 Pikafish WASM，已回退本地算法。"
      };
      return legal;
    } catch (error) {
      const isAbort = error.name === "AbortError";
      console.warn("Pikafish move request failed", {
        color,
        level,
        threads,
        message: error.message || String(error),
        stack: error.stack || ""
      });
      game.bookInfo = {
        source: "Pikafish WASM 失败",
        family: isAbort ? "WASM 超时" : "WASM 异常",
        variation: isAbort ? `超过 ${Math.round(timeoutMs / 1000)} 秒未返回` : (error.message || "未知错误"),
        notation: "启用兜底",
        plan: "浏览器未能及时取得 Pikafish WASM 着法，已立即切换客户端自主搜索。"
      };
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function aiThreadCount(level) {
    if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") {
      return 1;
    }
    const cores = Number(navigator.hardwareConcurrency) || 4;
    const cap = level === "master" || level === "bookMaster" ? GUIDE_MAX_THREADS : 4;
    return clamp(Math.floor(cores / 2) || 2, 1, cap);
  }

  function chooseAiMove(color, level) {
    const moves = getAllLegalMoves(game.board, color);
    game.bookInfo = null;
    if (!moves.length) {
      return null;
    }
    return chooseSearchFallbackMove(color, moves, level);
  }

  function chooseSearchFallbackMove(color, moves, level) {
    const config = CLIENT_FALLBACK_CONFIG[level] || CLIENT_FALLBACK_CONFIG.normal;
    const previousPikafishInfo = game.bookInfo && /Pikafish/.test(game.bookInfo.source || "")
      ? { ...game.bookInfo }
      : null;
    const immediateMate = findImmediateMateMove(game.board, color, moves);
    if (immediateMate) {
      game.bookInfo = {
        source: `${AI_LEVEL_NAMES[level] || "电脑"}客户端强搜索`,
        family: "离线杀棋",
        variation: "本地 AI 发现一步杀",
        notation: formatMoveForBook(immediateMate),
        plan: `${COLOR_NAMES[color]}检测到立即制胜路线，优先执行杀棋。`
      };
      return immediateMate;
    }
    const result = searchBestMove(game.board, color, moves, config);
    const move = result.move || rankMoves(game.board, moves, color)[0]?.move || moves[0];
    game.bookInfo = {
      source: `${AI_LEVEL_NAMES[level] || "电脑"}客户端强搜索`,
      family: "Alpha-Beta 自主计算",
      variation: "本地 AI 计算",
      notation: formatMoveForBook(move),
      plan: `${COLOR_NAMES[color]}已在浏览器本地完成迭代加深搜索，评分 ${Math.round(result.score || 0)}。这是 Pikafish WASM 缺失时的兜底。${previousPikafishInfo ? `Pikafish 失败原因：${previousPikafishInfo.family}，${previousPikafishInfo.variation}。` : ""}`
    };
    return move;
  }

  function findImmediateMateMove(board, color, moves) {
    return moves.find((move) => {
      const next = cloneBoard(board);
      applyMoveOnBoard(next, move);
      const enemy = otherColor(color);
      return isKingInCheck(next, enemy) && getAllLegalMoves(next, enemy).length === 0;
    }) || null;
  }

  function searchBestMove(board, color, moves, config) {
    const context = {
      aiColor: color,
      start: performance.now(),
      timeMs: config.timeMs,
      nodeWidth: config.nodeWidth,
      nodes: 0,
      timedOut: false,
      table: new Map()
    };
    const orderedRoot = limitOrderedMoves(rankMoves(board, moves, color), config.rootWidth).map((item) => item.move);
    let bestMove = orderedRoot[0] || moves[0];
    let bestScore = -SEARCH_INF;
    let completedDepth = 0;
    for (let depth = 1; depth <= config.maxDepth; depth += 1) {
      let depthBestMove = bestMove;
      let depthBestScore = -SEARCH_INF;
      let alpha = -SEARCH_INF;
      for (const move of orderedRoot) {
        if (searchTimedOut(context)) {
          break;
        }
        const next = cloneBoard(board);
        applyMoveOnBoard(next, move);
        const score = -negamax(next, otherColor(color), depth - 1, -SEARCH_INF, -alpha, context, 1);
        if (context.timedOut) {
          break;
        }
        if (score > depthBestScore) {
          depthBestScore = score;
          depthBestMove = move;
        }
        alpha = Math.max(alpha, score);
      }
      if (context.timedOut) {
        break;
      }
      bestMove = depthBestMove;
      bestScore = depthBestScore;
      completedDepth = depth;
    }
    return {
      move: bestMove,
      score: bestScore,
      depth: completedDepth,
      nodes: context.nodes,
      timedOut: context.timedOut
    };
  }

  function negamax(board, color, depth, alpha, beta, context, ply) {
    context.nodes += 1;
    if ((context.nodes & 127) === 0 && searchTimedOut(context)) {
      return evaluateBoard(board, color);
    }
    const key = `${depth}:${positionKey(board, color)}`;
    const cached = context.table.get(key);
    if (cached && cached.depth >= depth) {
      return cached.score;
    }
    const moves = getAllLegalMoves(board, color);
    if (!moves.length) {
      const losingScore = isKingInCheck(board, color) ? MATE_SCORE - ply : Math.floor(MATE_SCORE / 2) - ply;
      return -losingScore;
    }
    if (depth <= 0) {
      return quiescence(board, color, alpha, beta, context, ply);
    }
    const ordered = limitOrderedMoves(rankMoves(board, moves, color), context.nodeWidth);
    let best = -SEARCH_INF;
    for (const item of ordered) {
      const next = cloneBoard(board);
      applyMoveOnBoard(next, item.move);
      const score = -negamax(next, otherColor(color), depth - 1, -beta, -alpha, context, ply + 1);
      if (context.timedOut) {
        break;
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        break;
      }
    }
    if (!context.timedOut) {
      context.table.set(key, { depth, score: best });
    }
    return best;
  }

  function quiescence(board, color, alpha, beta, context, ply) {
    if (ply >= 8) {
      return evaluateBoard(board, color);
    }
    const standPat = evaluateBoard(board, color);
    if (standPat >= beta) {
      return beta;
    }
    let best = Math.max(alpha, standPat);
    const forcing = rankMoves(board, getAllLegalMoves(board, color), color)
      .filter((item) => item.capture || item.givesCheck)
      .slice(0, 10);
    for (const item of forcing) {
      if (searchTimedOut(context)) {
        break;
      }
      const next = cloneBoard(board);
      applyMoveOnBoard(next, item.move);
      const score = -quiescence(next, otherColor(color), -beta, -best, context, ply + 1);
      if (score >= beta) {
        return beta;
      }
      best = Math.max(best, score);
    }
    return best;
  }

  function limitOrderedMoves(orderedMoves, limit) {
    if (!Number.isFinite(limit)) {
      return orderedMoves;
    }
    return orderedMoves.slice(0, Math.max(1, limit));
  }

  function searchTimedOut(context) {
    if (context.timedOut) {
      return true;
    }
    if (performance.now() - context.start >= context.timeMs) {
      context.timedOut = true;
      return true;
    }
    return false;
  }

  function describePositiveEngineLines(data) {
    const lines = (Array.isArray(data.variations) ? data.variations : [])
      .map((variation) => ({
        variation,
        score: engineScoreValue(variation.score),
        firstMove: variation.pv?.[0]
      }))
      .filter((item) => item.score > 0 && item.firstMove)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item, index) => {
        const score = item.variation.score?.text || `${item.score > 0 ? "+" : ""}${(item.score / 100).toFixed(2)}兵`;
        return `${index + 1}. ${formatMoveForBook(item.firstMove)}（${score}）`;
      });
    return lines.length ? `后续正分候选：${lines.join("；")}。` : "暂无正分候选，按当前最佳着法行棋。";
  }

  function engineScoreValue(score) {
    if (!score) {
      return 0;
    }
    if (score.type === "mate") {
      return score.value > 0 ? 100000 - Math.abs(score.value) : -100000 + Math.abs(score.value);
    }
    return Number(score.cp ?? score.value ?? 0) || 0;
  }

  function chooseFirstMovePaletteMove(color, level, legalMoves) {
    if (!BOOK_FIRST_LEVELS.has(level)) {
      return null;
    }
    if (game.history.some((item) => item.color === color)) {
      return null;
    }
    const legalByKey = new Map(legalMoves.map((move) => [moveKey(move), move]));
    const candidates = firstMovePalette(color, level)
      .map((item) => {
        const legal = legalByKey.get(item.key);
        if (!legal) {
          return null;
        }
        return {
          move: legal,
          info: {
            source: `${AI_LEVEL_NAMES[level]}首着库`,
            family: "指定开局招法池",
            variation: "无视对方先手的首着随机",
            notation: item.notation,
            plan: `${COLOR_NAMES[color]}第一次行棋，从当前难度的指定首着招法里按权重随机选择。`
          },
          weight: item.weight
        };
      })
      .filter(Boolean);
    return weightedRandomChoice(candidates);
  }

  function firstMovePalette(color, level) {
    const side = color === "red" ? firstMovePaletteRed() : firstMovePaletteBlack();
    if (level === "newbie") {
      return side.newbie || side.easy;
    }
    return level === "easy" ? side.easy : side.normal;
  }

  function firstMovePaletteRed() {
    const common = [
      firstMoveItem(7, 7, 7, 4, "中炮", 1),
      firstMoveItem(6, 6, 5, 6, "挺3路兵", 1),
      firstMoveItem(6, 2, 5, 2, "挺7路兵", 1),
      firstMoveItem(9, 6, 7, 4, "飞相", 1),
      firstMoveItem(9, 1, 7, 2, "跳2路马", 1),
      firstMoveItem(9, 7, 7, 6, "跳9路马", 1),
      firstMoveItem(7, 7, 7, 3, "过宫炮", 0.25),
      firstMoveItem(6, 4, 5, 4, "挺中兵", 0.02),
      firstMoveItem(9, 0, 8, 0, "左车起动", 0.02),
      firstMoveItem(9, 8, 8, 8, "右车起动", 0.02)
    ];
    return {
      newbie: [
        ...common,
        firstMoveItem(7, 1, 5, 1, "2路巡河炮", 0.08),
        firstMoveItem(7, 7, 5, 7, "9路巡河炮", 0.08)
      ],
      normal: common,
      easy: [
        ...common,
        firstMoveItem(7, 1, 5, 1, "2路巡河炮", 0.05),
        firstMoveItem(7, 7, 5, 7, "9路巡河炮", 0.05)
      ]
    };
  }

  function firstMovePaletteBlack() {
    const common = [
      firstMoveItem(2, 7, 2, 4, "中炮", 1),
      firstMoveItem(3, 2, 4, 2, "挺3路卒", 1),
      firstMoveItem(3, 6, 4, 6, "挺7路卒", 1),
      firstMoveItem(0, 6, 2, 4, "飞象", 1),
      firstMoveItem(0, 1, 2, 2, "跳2路马", 1),
      firstMoveItem(0, 7, 2, 6, "跳9路马", 1),
      firstMoveItem(2, 1, 2, 5, "过宫炮", 0.25),
      firstMoveItem(3, 4, 4, 4, "挺中卒", 0.02),
      firstMoveItem(0, 0, 1, 0, "左车起动", 0.02),
      firstMoveItem(0, 8, 1, 8, "右车起动", 0.02)
    ];
    return {
      newbie: [
        ...common,
        firstMoveItem(2, 1, 4, 1, "2路巡河炮", 0.08),
        firstMoveItem(2, 7, 4, 7, "9路巡河炮", 0.08)
      ],
      normal: common,
      easy: [
        ...common,
        firstMoveItem(2, 1, 4, 1, "2路巡河炮", 0.05),
        firstMoveItem(2, 7, 4, 7, "9路巡河炮", 0.05)
      ]
    };
  }

  function firstMoveItem(fromRow, fromCol, toRow, toCol, notation, weight = 1) {
    return {
      key: moveKeyFromParts(fromRow, fromCol, toRow, toCol),
      notation,
      weight
    };
  }

  function chooseOpeningBookMove(color, legalMoves, level) {
    const candidates = findOpeningBookCandidates(color, legalMoves);
    return chooseBookCandidate(candidates, level);
  }

  function findOpeningBookCandidates(color, legalMoves = getAllLegalMoves(game.board, color)) {
    const ply = game.moveKeys.length;
    const legalByKey = new Map(legalMoves.map((move) => [moveKey(move), move]));
    const candidates = [];
    const seen = new Set();
    OPENING_BOOK_LINES.forEach((line) => {
      openingBookLineVariants(line).forEach((variant) => {
        if (ply >= variant.moves.length) {
          return;
        }
        const next = variant.moves[ply];
        if (next.color !== color || !lineMatchesMoveHistory(variant.moves, ply)) {
          return;
        }
        const legal = legalByKey.get(next.key);
        if (!legal) {
          return;
        }
        const uniqueKey = `${variant.id}:${ply}:${next.key}`;
        if (seen.has(uniqueKey)) {
          return;
        }
        seen.add(uniqueKey);
        candidates.push({
          move: legal,
          info: {
            source: variant.source,
            family: variant.family,
            variation: variant.variation,
            notation: next.notation,
            plan: variant.plan
          },
          score: variant.weight + Math.max(0, 10 - ply),
          weight: variant.weight + Math.max(0, 10 - ply)
        });
      });
    });
    return candidates;
  }

  function openingBookLineVariants(line) {
    const variants = [
      makeBookLineVariant(line, "base"),
      makeBookLineVariant(line, "mirrorCols"),
      makeBookLineVariant(line, "swapColors"),
      makeBookLineVariant(line, "swapColorsMirrorCols")
    ].filter(Boolean);
    const seen = new Set();
    return variants.filter((variant) => {
      const key = variant.moves.map((move) => `${move.color}:${move.key}`).join("|");
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function makeBookLineVariant(line, transform) {
    const transformedMoves = line.moves.map((move) => transformBookMove(move, transform));
    const suffixMap = {
      base: "",
      mirrorCols: " · 左右镜像",
      swapColors: " · 红黑镜像",
      swapColorsMirrorCols: " · 红黑左右镜像"
    };
    return {
      ...line,
      id: `${line.id}-${transform}`,
      family: `${line.family}${suffixMap[transform] || ""}`,
      variation: `${line.variation}${suffixMap[transform] || ""}`,
      moves: transformedMoves
    };
  }

  function transformBookMove(move, transform) {
    const mirrorCols = transform === "mirrorCols" || transform === "swapColorsMirrorCols";
    const swapColors = transform === "swapColors" || transform === "swapColorsMirrorCols";
    const mapSquare = (square) => ({
      row: swapColors ? ROWS - 1 - square.row : square.row,
      col: mirrorCols ? COLS - 1 - square.col : square.col
    });
    const from = mapSquare(move.from);
    const to = mapSquare(move.to);
    const color = swapColors ? otherColor(move.color) : move.color;
    return {
      ...move,
      color,
      from,
      to,
      key: moveKeyFromParts(from.row, from.col, to.row, to.col),
      notation: transformBookNotation(move.notation, transform)
    };
  }

  function transformBookNotation(notation, transform) {
    const suffixMap = {
      base: "",
      mirrorCols: "",
      swapColors: "（红黑镜像）",
      swapColorsMirrorCols: "（红黑左右镜像）"
    };
    return `${notation}${suffixMap[transform] || ""}`;
  }

  function lineMatchesMoveHistory(moves, ply) {
    for (let index = 0; index < ply; index += 1) {
      const expected = moves[index];
      const historyItem = game.history[game.history.length - 1 - index];
      if (!expected || expected.key !== game.moveKeys[index] || expected.color !== historyItem?.color) {
        return false;
      }
    }
    return true;
  }

  function randomChoice(candidates) {
    if (!candidates.length) {
      return null;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function weightedRandomChoice(candidates) {
    if (!candidates.length) {
      return null;
    }
    const total = candidates.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);
    if (total <= 0) {
      return randomChoice(candidates);
    }
    let roll = Math.random() * total;
    for (const item of candidates) {
      roll -= Math.max(0, Number(item.weight) || 0);
      if (roll <= 0) {
        return item;
      }
    }
    return candidates[candidates.length - 1];
  }

  function chooseBookCandidate(candidates, level) {
    if (!candidates.length) {
      return null;
    }
    const sorted = [...candidates].sort((a, b) => (b.score || 0) - (a.score || 0));
    const best = sorted[0];
    const config = BOOK_SELECTION_CONFIG[level];
    if (!config) {
      return randomChoice(candidates);
    }
    if (Math.random() < config.bestProbability) {
      return best;
    }
    const others = sorted.slice(1).filter((item) => !config.positiveOnlyOthers || item.score > 0);
    return randomChoice(others) || best;
  }

  function formatMoveForBook(move) {
    if (!move) {
      return "无可用着法";
    }
    return formatMoveOnBoard(game.board, move);
  }

  function formatMoveOnBoard(board, move) {
    if (!move) {
      return "无可用着法";
    }
    const piece = board[move.from.row]?.[move.from.col] || move.piece;
    const label = piece ? LABELS[piece.color][piece.type] : "棋子";
    return `${label} ${formatCoord(move.from)} → ${formatCoord(move.to)}`;
  }

  function rankMoves(board, moves, color) {
    return moves
      .map((move) => {
        const next = cloneBoard(board);
        const moving = next[move.from.row][move.from.col];
        const target = next[move.to.row][move.to.col];
        applyMoveOnBoard(next, move);
        const givesCheck = isKingInCheck(next, otherColor(color));
        const capture = Boolean(target);
        const movingValue = moving ? PIECE_VALUES[moving.type] : 0;
        const targetValue = target ? PIECE_VALUES[target.type] : 0;
        const sacrifice = Boolean(moving && isSquareAttacked(next, move.to, otherColor(color)) && targetValue < movingValue);
        const captureScore = target ? targetValue * 2.6 - movingValue * 0.15 : 0;
        const checkScore = givesCheck ? 720 : 0;
        const sacrificeScore = sacrifice && givesCheck ? 980 : sacrifice ? -movingValue * 0.18 : 0;
        const centerScore = 14 - Math.abs(4 - move.to.col) * 2 - Math.abs(4.5 - move.to.row);
        return {
          move,
          capture,
          givesCheck,
          sacrifice,
          score: evaluateBoard(next, color) + captureScore + checkScore + sacrificeScore + centerScore
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  function isSquareAttacked(board, square, byColor) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (board[row][col]?.color !== byColor) {
          continue;
        }
        if (getRawMoves(board, row, col).some((move) => move.to.row === square.row && move.to.col === square.col)) {
          return true;
        }
      }
    }
    return false;
  }

  function evaluateBoard(board, aiColor) {
    let score = 0;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const piece = board[row][col];
        if (!piece) {
          continue;
        }
        const value = PIECE_VALUES[piece.type] + positionalBonus(board, piece, row, col);
        score += piece.color === aiColor ? value : -value;
      }
    }
    score += (rawMobility(board, aiColor) - rawMobility(board, otherColor(aiColor))) * 2.4;
    score += kingFortressScore(board, aiColor) - kingFortressScore(board, otherColor(aiColor));
    if (isKingInCheck(board, otherColor(aiColor))) {
      score += 95;
    }
    if (isKingInCheck(board, aiColor)) {
      score -= 130;
    }
    return score;
  }

  function positionalBonus(board, piece, row, col) {
    const center = 4 - Math.abs(4 - col);
    if (piece.type === "pawn") {
      const progress = piece.color === "red" ? 9 - row : row;
      const crossed = piece.color === "red" ? row <= 4 : row >= 5;
      return progress * 7 + (crossed ? 28 + center * 3 : 0);
    }
    if (piece.type === "knight" || piece.type === "cannon") {
      return center * 8;
    }
    if (piece.type === "rook") {
      return center * 5 + openFileHint(board, piece, row, col);
    }
    if (piece.type === "king") {
      return piece.color === "red" ? (row === 9 ? 10 : -12) : row === 0 ? 10 : -12;
    }
    return 0;
  }

  function rawMobility(board, color) {
    let count = 0;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (board[row][col]?.color === color) {
          count += getRawMoves(board, row, col).length;
        }
      }
    }
    return count;
  }

  function kingFortressScore(board, color) {
    const king = findKing(board, color);
    if (!king) {
      return -10000;
    }
    let score = 0;
    const palaceRows = color === "red" ? [7, 8, 9] : [0, 1, 2];
    palaceRows.forEach((row) => {
      for (let col = 3; col <= 5; col += 1) {
        const piece = board[row][col];
        if (!piece || piece.color !== color) {
          continue;
        }
        if (piece.type === "advisor") {
          score += 26;
        }
        if (piece.type === "bishop") {
          score += 18;
        }
        if (piece.type === "king" && col === 4) {
          score += 10;
        }
      }
    });
    const centerPawnRow = color === "red" ? 6 : 3;
    if (board[centerPawnRow]?.[4]?.color === color && board[centerPawnRow][4].type === "pawn") {
      score += 22;
    }
    return score;
  }

  function openFileHint(board, piece, row, col) {
    let blockers = 0;
    const forward = piece.color === "red" ? -1 : 1;
    let nextRow = row + forward;
    while (inBounds(nextRow, col)) {
      if (board[nextRow]?.[col]) {
        blockers += 1;
      }
      nextRow += forward;
    }
    return blockers === 0 ? 22 : blockers === 1 ? 10 : 0;
  }

  function getLegalMovesForPiece(board, row, col) {
    const piece = board[row]?.[col];
    if (!piece) {
      return [];
    }
    return getRawMoves(board, row, col).filter((move) => {
      const next = cloneBoard(board);
      applyMoveOnBoard(next, move);
      if (isKingInCheck(next, piece.color)) {
        return false;
      }
      return board !== game.board || !violatesRepetitionRule(move, next, piece.color);
    });
  }

  function getAllLegalMoves(board, color) {
    const moves = [];
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (board[row][col]?.color === color) {
          moves.push(...getLegalMovesForPiece(board, row, col));
        }
      }
    }
    return moves;
  }

  function getRawMoves(board, row, col) {
    const piece = board[row]?.[col];
    if (!piece) {
      return [];
    }
    const moves = [];
    const add = (toRow, toCol) => {
      if (!inBounds(toRow, toCol)) {
        return;
      }
      const target = board[toRow][toCol];
      if (!target || target.color !== piece.color) {
        moves.push({
          from: { row, col },
          to: { row: toRow, col: toCol }
        });
      }
    };

    if (piece.type === "king") {
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (insidePalace(piece.color, nextRow, nextCol)) {
          add(nextRow, nextCol);
        }
      });
      const enemyKing = findKing(board, otherColor(piece.color));
      if (enemyKing && enemyKing.col === col && clearFile(board, row, enemyKing.row, col)) {
        add(enemyKing.row, enemyKing.col);
      }
      return moves;
    }

    if (piece.type === "advisor") {
      [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1]
      ].forEach(([dr, dc]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (insidePalace(piece.color, nextRow, nextCol)) {
          add(nextRow, nextCol);
        }
      });
      return moves;
    }

    if (piece.type === "bishop") {
      [
        [-2, -2, -1, -1],
        [-2, 2, -1, 1],
        [2, -2, 1, -1],
        [2, 2, 1, 1]
      ].forEach(([dr, dc, eyeR, eyeC]) => {
        const nextRow = row + dr;
        const nextCol = col + dc;
        if (!inBounds(nextRow, nextCol)) {
          return;
        }
        if (piece.color === "red" && nextRow < 5) {
          return;
        }
        if (piece.color === "black" && nextRow > 4) {
          return;
        }
        if (!board[row + eyeR][col + eyeC]) {
          add(nextRow, nextCol);
        }
      });
      return moves;
    }

    if (piece.type === "knight") {
      [
        [-2, -1, -1, 0],
        [-2, 1, -1, 0],
        [2, -1, 1, 0],
        [2, 1, 1, 0],
        [-1, -2, 0, -1],
        [1, -2, 0, -1],
        [-1, 2, 0, 1],
        [1, 2, 0, 1]
      ].forEach(([dr, dc, legR, legC]) => {
        const legRow = row + legR;
        const legCol = col + legC;
        if (inBounds(legRow, legCol) && !board[legRow][legCol]) {
          add(row + dr, col + dc);
        }
      });
      return moves;
    }

    if (piece.type === "rook") {
      scanLines(board, row, col, piece.color, false).forEach((move) => moves.push(move));
      return moves;
    }

    if (piece.type === "cannon") {
      scanLines(board, row, col, piece.color, true).forEach((move) => moves.push(move));
      return moves;
    }

    if (piece.type === "pawn") {
      const forward = piece.color === "red" ? -1 : 1;
      add(row + forward, col);
      const crossedRiver = piece.color === "red" ? row <= 4 : row >= 5;
      if (crossedRiver) {
        add(row, col - 1);
        add(row, col + 1);
      }
    }
    return moves;
  }

  function scanLines(board, row, col, color, cannon) {
    const moves = [];
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];
    dirs.forEach(([dr, dc]) => {
      let nextRow = row + dr;
      let nextCol = col + dc;
      let screenFound = false;
      while (inBounds(nextRow, nextCol)) {
        const target = board[nextRow][nextCol];
        if (!cannon) {
          if (!target) {
            moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
          } else {
            if (target.color !== color) {
              moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
            }
            break;
          }
        } else if (!screenFound) {
          if (!target) {
            moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
          } else {
            screenFound = true;
          }
        } else if (target) {
          if (target.color !== color) {
            moves.push({ from: { row, col }, to: { row: nextRow, col: nextCol } });
          }
          break;
        }
        nextRow += dr;
        nextCol += dc;
      }
    });
    return moves;
  }

  function applyMoveOnBoard(board, move) {
    board[move.to.row][move.to.col] = board[move.from.row][move.from.col];
    board[move.from.row][move.from.col] = null;
  }

  function isKingInCheck(board, color) {
    const king = findKing(board, color);
    if (!king) {
      return true;
    }
    const enemy = otherColor(color);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        if (board[row][col]?.color === enemy) {
          const attacks = getRawMoves(board, row, col);
          if (attacks.some((move) => move.to.row === king.row && move.to.col === king.col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function findKing(board, color) {
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const piece = board[row][col];
        if (piece?.color === color && piece.type === "king") {
          return { row, col };
        }
      }
    }
    return null;
  }

  function clearFile(board, rowA, rowB, col) {
    const start = Math.min(rowA, rowB) + 1;
    const end = Math.max(rowA, rowB);
    for (let row = start; row < end; row += 1) {
      if (board[row][col]) {
        return false;
      }
    }
    return true;
  }

  function insidePalace(color, row, col) {
    if (col < 3 || col > 5) {
      return false;
    }
    return color === "red" ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
  }

  function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function otherColor(color) {
    return color === "red" ? "black" : "red";
  }

  function formatCoord(square) {
    return `${square.col + 1}路${square.row + 1}线`;
  }

  function positionKey(board, turn) {
    return `${turn}:${board
      .map((row) =>
        row
          .map((piece) => (piece ? `${piece.color[0]}${piece.type[0]}` : "."))
          .join("")
      )
      .join("/")}`;
  }

  function violatesRepetitionRule(move, nextBoard, color) {
    const key = positionKey(nextBoard, otherColor(color));
    const repeatCount = game.positionKeys.filter((item) => item === key).length;
    if (repeatCount < REPETITION_LIMIT - 1) {
      return false;
    }
    return moveGivesCheck(nextBoard, color) || moveCreatesChase(nextBoard, move, color);
  }

  function moveGivesCheck(board, color) {
    return isKingInCheck(board, otherColor(color));
  }

  function moveCreatesChase(board, move, color) {
    const moving = board[move.to.row]?.[move.to.col];
    if (!moving) {
      return false;
    }
    const movingValue = PIECE_VALUES[moving.type] || 0;
    const attacks = getRawMoves(board, move.to.row, move.to.col);
    return attacks.some((attack) => {
      const target = board[attack.to.row]?.[attack.to.col];
      if (!target || target.color === color || target.type === "king") {
        return false;
      }
      return (PIECE_VALUES[target.type] || 0) >= Math.min(movingValue, 135);
    });
  }

  function buildMateAnnouncement(historyItem, moving, captured, motif, version = game.version + 1) {
    const winner = historyItem.color;
    const loser = otherColor(winner);
    const captureText = captured ? `，并吃掉${COLOR_NAMES[captured.color]}${LABELS[captured.color][captured.type]}` : "";
    return {
      version,
      title: `对局结束 · ${COLOR_NAMES[winner]}${motif}`,
      summary: `${COLOR_NAMES[winner]}${historyItem.piece}从 ${historyItem.from} 杀到 ${historyItem.to}${captureText}，完成制胜一击。`,
      detail: `${COLOR_NAMES[loser]}已被将军且没有合法应手：不能吃子解围，不能垫子遮挡，也不能让将帅脱离攻击线。本局到此终结。`,
      piece: moving ? LABELS[moving.color][moving.type] : historyItem.piece
    };
  }

  function buildEndAnnouncement({ title, summary, detail, version = game.version }) {
    return {
      version,
      title,
      summary,
      detail,
      piece: ""
    };
  }

  function buildMateAnnouncementFromLastMove() {
    if (!game.lastMove?.piece || !game.winner) {
      return null;
    }
    const piece = game.lastMove.piece;
    const historyItem = game.history[0] || {
      color: piece.color,
      piece: LABELS[piece.color][piece.type],
      from: formatCoord(game.lastMove.from),
      to: formatCoord(game.lastMove.to),
      captured: game.lastMove.captured ? LABELS[game.lastMove.captured.color][game.lastMove.captured.type] : ""
    };
    return buildMateAnnouncement(historyItem, piece, game.lastMove.captured, "将死绝杀", game.version);
  }

  function scheduleMateModal() {
    if (!game.pendingMateModal || game.mateModalShownForVersion === game.pendingMateModal.version) {
      return;
    }
    const delay = game.animation ? MOVE_ANIMATION_MS + 90 : 80;
    window.setTimeout(() => {
      if (!game.pendingMateModal || game.mateModalShownForVersion === game.pendingMateModal.version) {
        return;
      }
      showMateModal(game.pendingMateModal);
    }, delay);
  }

  function showMateModal(message) {
    els.mateTitle.textContent = message.title;
    els.mateSummary.textContent = message.summary;
    els.mateDetail.textContent = message.detail;
    game.mateModalShownForVersion = message.version;
    els.mateModal.classList.remove("hidden");
    els.mateReviewBtn.focus({ preventScroll: true });
  }

  function hideMateModal() {
    els.mateModal.classList.add("hidden");
  }

  function deriveMoveKeysFromHistory() {
    return [];
  }

  function moveKey(move) {
    return moveKeyFromParts(move.from.row, move.from.col, move.to.row, move.to.col);
  }

  function moveKeyFromParts(fromRow, fromCol, toRow, toCol) {
    return `${fromRow},${fromCol}-${toRow},${toCol}`;
  }

  function bookMove(color, fromRow, fromCol, toRow, toCol, notation) {
    return {
      color,
      from: { row: fromRow, col: fromCol },
      to: { row: toRow, col: toCol },
      key: moveKeyFromParts(fromRow, fromCol, toRow, toCol),
      notation
    };
  }

  function updateUi() {
    checkClockTimeout();
    const view = currentViewState();
    els.modeBadge.textContent = MODE_NAMES[game.mode];
    els.turnBadge.textContent = game.winner ? `${COLOR_NAMES[game.winner]}获胜` : game.draw ? "和棋" : `${isGuiding() ? "沙盘" : ""}${COLOR_NAMES[view.turn]}行棋`;
    const status = game.notice || composeStatus();
    const clockText = clockStatusText();
    els.gameStatus.textContent = clockText ? `${status} · ${clockText}` : status;

    els.modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === game.mode);
      button.disabled = button.dataset.mode !== game.mode && isModeSwitchLocked();
    });
    els.aiButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.aiLevel === game.aiLevel);
    });
    els.playerColorButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.playerColor === game.playerColor);
    });
    document.querySelectorAll("[data-theme]").forEach((button) => {
      button.classList.toggle("active", button.dataset.theme === game.theme);
    });
    els.canvasWrap?.classList.toggle("input-locked", Boolean(game.thinking || game.animation));

    els.aiSection.classList.toggle("hidden", game.mode !== "ai");
    els.onlineSection.classList.toggle("hidden", game.mode !== "online");
    els.matchRoomBtn.disabled = onlineBusy || Boolean(matchTimer);
    els.createRoomBtn.disabled = onlineBusy;
    els.joinRoomBtn.disabled = onlineBusy;
    els.redCaptured.textContent = capturedText("red");
    els.blackCaptured.textContent = capturedText("black");
    updateRoomInfo();
    updateBookPanel();
    updateReviewUi();
    updateGuideUi();
    updateHistory();
  }

  function checkClockTimeout() {
    if (!shouldRunClock()) {
      return;
    }
    if (activeClockRemaining(game.turn) <= 0) {
      const loser = game.turn;
      game.winner = otherColor(game.turn);
      if (loser === "red") {
        game.clocks.redMs = 0;
      } else {
        game.clocks.blackMs = 0;
      }
      game.notice = `${COLOR_NAMES[loser]}超时，${COLOR_NAMES[game.winner]}获胜。`;
      game.endReason = {
        title: `对局结束 · ${COLOR_NAMES[game.winner]}超时胜`,
        summary: `${COLOR_NAMES[loser]}局时或步时耗尽。`,
        detail: `当前局时规则为 ${game.timeControl.label}。${COLOR_NAMES[loser]}未能在限制时间内完成走子，本局由${COLOR_NAMES[game.winner]}获胜。`
      };
      game.pendingMateModal = buildEndAnnouncement({ ...game.endReason, version: game.version });
      maybeSaveCompletedGame();
      scheduleMateModal();
    }
  }

  function updateReviewUi() {
    if (!els.reviewStatus) {
      return;
    }
    const index = currentReviewIndex();
    const maxIndex = Math.max(0, game.snapshots.length - 1);
    const hasHistory = maxIndex > 0;
    els.reviewStatus.textContent = isReviewing() ? `复盘第 ${index} / ${maxIndex} 手` : `实战局面，共 ${game.history.length} 手`;
    if (els.reviewStartBtn) {
      els.reviewStartBtn.disabled = !hasHistory;
    }
    if (els.reviewPrevBtn) {
      els.reviewPrevBtn.disabled = !hasHistory;
    }
    if (els.reviewNextBtn) {
      els.reviewNextBtn.disabled = !hasHistory;
    }
    if (els.reviewLiveBtn) {
      els.reviewLiveBtn.disabled = !isReviewing();
    }
  }

  function updateBookPanel() {
    if (!els.bookTitle || !els.bookMeta) {
      return;
    }
    if (game.bookInfo) {
      els.bookTitle.textContent = `${game.bookInfo.source} · ${game.bookInfo.family}`;
      els.bookMeta.textContent = `${game.bookInfo.variation}：${game.bookInfo.notation}。${game.bookInfo.plan}`;
      return;
    }
    els.bookTitle.textContent = BOOK_FIRST_LEVELS.has(game.aiLevel) ? "本地谱库优先" : "Pikafish WASM 接管";
    const analysis = describeCurrentOpponentCandidates();
    els.bookMeta.textContent = analysis || (BOOK_FIRST_LEVELS.has(game.aiLevel)
      ? `${AI_LEVEL_NAMES[game.aiLevel]}首手按随机75% / 谱库20% / Pikafish WASM 5%；第二手起按 ${game.moveKeys.length} 手历史精确匹配本地谱库，并自动匹配左右镜像、红黑镜像；脱谱后由浏览器内置 Pikafish WASM 接管。`
      : "最强AI 直接由浏览器内置 Pikafish WASM 接管，不调用服务端接口。");
  }

  function describeCurrentOpponentCandidates() {
    if (game.winner || game.draw || game.guide.active || isReviewing()) {
      return "";
    }
    const color = game.turn;
    const legalMoves = getAllLegalMoves(game.board, color);
    if (!legalMoves.length) {
      return "";
    }
    const matchedBooks = findOpeningBookCandidates(color, legalMoves);
    if (matchedBooks.length) {
      const names = [...new Set(matchedBooks.map((item) => item.info.notation))]
        .slice(0, 5)
        .join("、");
      return `当前仍有严格匹配棋谱：${COLOR_NAMES[color]}可能走 ${names}。`;
    }
    const ranked = rankMoves(game.board, legalMoves, color).slice(0, 5);
    const text = ranked
      .map((item, index) => `${index + 1}. ${formatMoveOnBoard(game.board, item.move)}（评估 ${Math.round(item.score)}）`)
      .join("；");
    return `当前无严格匹配棋谱，分析${COLOR_NAMES[color]}可能走：${text}。`;
  }

  function updateGuideUi() {
    if (!els.guideInfo) {
      return;
    }
    if (isReviewing()) {
      const index = currentReviewIndex();
      const maxIndex = Math.max(0, game.snapshots.length - 1);
      const hasPrev = index > 0;
      const hasNext = index < maxIndex;
      const isPlaying = Boolean(reviewPlayTimer);
      if (els.guideStartBtn) {
        els.guideStartBtn.disabled = !hasPrev;
        els.guideStartBtn.title = "回到开局";
        els.guideStartBtn.setAttribute("aria-label", "回到开局");
      }
      if (els.guidePrevBtn) {
        els.guidePrevBtn.disabled = !hasPrev;
        els.guidePrevBtn.title = "上一手";
        els.guidePrevBtn.setAttribute("aria-label", "上一手");
      }
      if (els.guidePlayBtn) {
        els.guidePlayBtn.disabled = !hasNext || isPlaying;
        els.guidePlayBtn.title = "播放棋局";
        els.guidePlayBtn.setAttribute("aria-label", "播放棋局");
      }
      if (els.guideNextBtn) {
        els.guideNextBtn.disabled = !hasNext || Boolean(game.animation);
        els.guideNextBtn.title = "下一手";
        els.guideNextBtn.setAttribute("aria-label", "下一手");
      }
      if (els.guideEndBtn) {
        els.guideEndBtn.disabled = false;
        els.guideEndBtn.title = "回到实战";
        els.guideEndBtn.setAttribute("aria-label", "回到实战");
      }
      if (els.guideLines) {
        els.guideLines.innerHTML = "";
      }
      const nextMove = nextReviewMove();
      els.guideInfo.textContent = nextMove
        ? `正在回看第 ${index} / ${maxIndex} 手，棋盘已标出下一手：${formatMoveOnBoard(currentViewState().board, nextMove)}。`
        : `正在回看第 ${index} / ${maxIndex} 手，已到最后局面。`;
      return;
    }
    const active = isGuiding();
    const total = Math.max(0, game.guide.snapshots.length - 1);
    const moveText = game.guide.moves[game.guide.index - 1]?.text || "起点";
    const canStepBack = (game.guide.trailIndex || 0) > 0;
    els.guideBtn.disabled = game.guide.loading || game.thinking || Boolean(game.animation);
    if (els.guideStartBtn) {
      els.guideStartBtn.disabled = !active || !canStepBack;
      els.guideStartBtn.title = "变化起点";
      els.guideStartBtn.setAttribute("aria-label", "变化起点");
    }
    if (els.guidePrevBtn) {
      els.guidePrevBtn.disabled = !active || !canStepBack;
      els.guidePrevBtn.title = "退一步";
      els.guidePrevBtn.setAttribute("aria-label", "退一步");
    }
    if (els.guidePlayBtn) {
      els.guidePlayBtn.disabled = !active || game.guide.playing || game.guide.index >= game.guide.snapshots.length - 1;
      els.guidePlayBtn.title = "播放路线";
      els.guidePlayBtn.setAttribute("aria-label", "播放路线");
    }
    if (els.guideNextBtn) {
      els.guideNextBtn.disabled = !active || game.guide.loading || Boolean(game.animation) || !game.guide.moves[game.guide.index];
      els.guideNextBtn.title = "按推荐走下一步";
      els.guideNextBtn.setAttribute("aria-label", "按推荐走下一步");
    }
    if (els.guideEndBtn) {
      els.guideEndBtn.disabled = !active && !game.guide.loading;
      els.guideEndBtn.title = "结束指导";
      els.guideEndBtn.setAttribute("aria-label", "结束指导");
    }
    renderGuideLines();
    if (game.guide.loading) {
      const side = game.guide.analysis?.turn ? COLOR_NAMES[game.guide.analysis.turn] : "当前方";
      els.guideInfo.textContent = `Pikafish 正在刷新${side}下一手。`;
      return;
    }
    if (active) {
      const selected = game.guide.variations[game.guide.selectedVariation];
      const routeLabel = selected?.best ? "最优路线" : `候选路线 ${game.guide.selectedVariation + 1}`;
      const intent = selected ? describeOpponentGuideIntent(selected) : moveText;
      els.guideInfo.textContent = `${routeLabel} · 沙盘第 ${game.guide.index} / ${total} 手：${intent}。${selected?.detail || ""}`;
      return;
    }
    els.guideInfo.textContent = "未开始推演";
  }

  function renderGuideLines() {
    if (!els.guideLines) {
      return;
    }
    const key = game.guide.variations
      .map((variation, index) => `${index}:${variation.best}:${variation.scoreText}:${variation.summary}`)
      .join("|") + `#${game.guide.selectedVariation}`;
    if (els.guideLines.dataset.key === key) {
      return;
    }
    els.guideLines.dataset.key = key;
    els.guideLines.innerHTML = "";
    game.guide.variations.forEach((variation, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `guide-line-button${index === game.guide.selectedVariation ? " active" : ""}`;
      const label = variation.best ? "最优" : `候选${index + 1}`;
      button.innerHTML = `
        <span class="route-rank">${label}</span>
        <span class="route-main">${escapeHtml(variation.summary)}</span>
        <span class="route-score">${escapeHtml(variation.scoreText)}</span>
      `;
      button.addEventListener("click", () => selectGuideVariation(index));
      els.guideLines.appendChild(button);
    });
  }

  function composeStatus() {
    if (game.winner) {
      return `${COLOR_NAMES[game.winner]}获胜。`;
    }
    if (game.draw) {
      return "本局和棋。";
    }
    if (game.mode === "online" && game.online?.roomCode && !onlineReady()) {
      return "等待另一位玩家加入。";
    }
    if (isKingInCheck(game.board, game.turn)) {
      return `${COLOR_NAMES[game.turn]}被将军。`;
    }
    return `${COLOR_NAMES[game.turn]}行棋。`;
  }

  function capturedText(color) {
    const pieces = currentViewState().captured?.[color] || [];
    if (!pieces.length) {
      return "无";
    }
    return pieces.map((piece) => LABELS[piece.color][piece.type]).join(" ");
  }

  function updateHistory() {
    els.moveList.innerHTML = "";
    if (!game.history.length) {
      const empty = document.createElement("li");
      empty.textContent = "开局";
      els.moveList.appendChild(empty);
      renderSavedGames();
      return;
    }
    game.history.forEach((item) => {
      const li = document.createElement("li");
      const captureText = item.captured ? ` 吃${item.captured}` : "";
      const suffix = item.stale ? " 困毙" : item.mate ? " 将死" : item.check ? " 将军" : "";
      li.textContent = `${item.no}. ${COLOR_NAMES[item.color]}${item.piece} ${item.from} → ${item.to}${captureText}${suffix}`;
      els.moveList.appendChild(li);
    });
    renderSavedGames();
  }

  function readSavedGames() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_SAVED_GAMES) || "[]");
      return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item.snapshot) : [];
    } catch {
      return [];
    }
  }

  function writeSavedGames(records) {
    localStorage.setItem(STORAGE_SAVED_GAMES, JSON.stringify(records.slice(0, 30)));
  }

  function completedGameTitle(snapshot) {
    if (snapshot.endReason?.title) {
      return snapshot.endReason.title;
    }
    if (snapshot.winner) {
      return `${COLOR_NAMES[snapshot.winner]}获胜`;
    }
    if (snapshot.draw) {
      return "和棋";
    }
    return "已结束对局";
  }

  function maybeSaveCompletedGame() {
    if (!game.winner && !game.draw) {
      return;
    }
    if (!game.history.length || game.savedArchiveVersion === game.version) {
      return;
    }
    const snapshot = makeSnapshot();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const record = {
      id,
      savedAt: new Date().toISOString(),
      title: completedGameTitle(snapshot),
      mode: game.mode,
      aiLevel: game.aiLevel,
      moveCount: game.history.length,
      winner: game.winner,
      snapshot
    };
    const records = readSavedGames().filter((item) => item.id !== id);
    records.unshift(record);
    writeSavedGames(records);
    game.savedArchiveVersion = game.version;
  }

  function renderSavedGames() {
    if (!els.savedGameList) {
      return;
    }
    const records = readSavedGames();
    els.savedGameList.innerHTML = "";
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "saved-game-empty";
      empty.textContent = "暂无历史对局";
      els.savedGameList.appendChild(empty);
      return;
    }
    records.slice(0, 12).forEach((record) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "saved-game-button";
      const date = new Date(record.savedAt);
      const timeText = Number.isNaN(date.getTime()) ? "未知时间" : date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
      const modeText = MODE_NAMES[record.mode] || "对局";
      button.innerHTML = `
        <strong>${escapeHtml(record.title || "历史对局")}</strong>
        <span>${escapeHtml(timeText)} · ${escapeHtml(modeText)} · ${Number(record.moveCount) || 0} 手</span>
      `;
      button.addEventListener("click", () => openSavedGame(record.id));
      els.savedGameList.appendChild(button);
    });
  }

  function openSavedGame(id) {
    const record = readSavedGames().find((item) => item.id === id);
    if (!record?.snapshot) {
      game.notice = "历史记录已失效。";
      updateUi();
      return;
    }
    if (!game.archiveReviewing) {
      game.archiveReturnSnapshot = makeSnapshot();
    }
    clearGuide();
    hideMateModal();
    loadSnapshot(record.snapshot);
    game.archiveReviewing = true;
    game.reviewIndex = 0;
    game.notice = `正在复盘历史记录：${record.title || "历史对局"}。`;
    render();
  }

  function updateRoomInfo() {
    if (game.mode !== "online") {
      return;
    }
    if (!game.online?.roomCode) {
      els.roomInfo.innerHTML = "<span>未连接玩家对练房间</span>";
      return;
    }
    const colorText = game.online.color ? COLOR_NAMES[game.online.color] : "观战";
    let ready = onlineReady() ? "已满员" : "等待对手";
    if (matchTimer && matchStartedAt && !onlineReady()) {
      const remain = Math.max(0, Math.ceil((ONLINE_MATCH_TIMEOUT_MS - (Date.now() - matchStartedAt)) / 1000));
      ready = `匹配中，剩余 ${remain} 秒`;
    }
    const clockText = game.clocks ? clockStatusText() : "未启用计时";
    els.roomInfo.innerHTML = `<span>玩家对练房间 ${game.online.roomCode} · ${colorText} · ${ready}<br>${game.timeControl.label}<br>${clockText}</span>`;
  }

  function onlineReady() {
    return Boolean(game.online?.players?.red && game.online?.players?.black);
  }

  function getClientId() {
    const existing = localStorage.getItem(STORAGE_CLIENT_ID);
    if (existing) {
      return existing;
    }
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_CLIENT_ID, id);
    return id;
  }

  function selectedTimeControlId() {
    return els.timeControlSelect?.value || "30-10";
  }

  async function createOnlineRoom() {
    if (onlineBusy) {
      return;
    }
    stopMatching();
    onlineBusy = true;
    game.mode = "online";
    game.notice = "正在创建玩家对练房间。";
    render();
    try {
      const data = await requestJson("/api/rooms", {
        method: "POST",
        body: JSON.stringify({ clientId: getClientId(), timeControl: selectedTimeControlId() })
      });
      applyOnlinePayload(data, "玩家对练房间已创建，等待对手加入。");
      els.roomCodeInput.value = data.roomCode;
      startPolling();
    } catch (error) {
      game.notice = `创建失败：${error.message}`;
    } finally {
      onlineBusy = false;
      render();
    }
  }

  async function startOnlineMatch() {
    if (onlineBusy || matchTimer) {
      return;
    }
    onlineBusy = true;
    game.mode = "online";
    game.notice = "正在匹配玩家，最多等待 30 秒。";
    render();
    try {
      const data = await requestJson("/api/match", {
        method: "POST",
        body: JSON.stringify({ clientId: getClientId(), timeControl: selectedTimeControlId() })
      });
      applyOnlinePayload(data, data.matched ? "匹配成功，开始对局。" : "正在匹配玩家，30 秒内无人加入将由入门 AI 迎战。");
      if (!data.matched) {
        matchStartedAt = Date.now();
        matchTimer = setTimeout(() => {
          if (game.mode !== "online" || onlineReady()) {
            stopMatching();
            return;
          }
          const level = "easy";
          stopPolling();
          stopMatching();
          game.mode = "ai";
          game.aiLevel = level;
          game.playerColor = game.online?.color || "red";
          game.online = null;
          game.flipped = game.playerColor === "black";
          resetBoard(0);
          game.notice = "30 秒未匹配到真人，已改由入门 AI 迎战。";
          render();
          maybeScheduleAiTurn();
        }, ONLINE_MATCH_TIMEOUT_MS);
      }
      startPolling();
    } catch (error) {
      game.notice = `匹配失败：${error.message}`;
    } finally {
      onlineBusy = false;
      render();
    }
  }

  async function joinOnlineRoom() {
    if (onlineBusy) {
      return;
    }
    const roomCode = els.roomCodeInput.value.trim().toUpperCase();
    if (!roomCode) {
      game.notice = "请输入房间码。";
      updateUi();
      return;
    }
    stopMatching();
    onlineBusy = true;
    game.mode = "online";
    game.notice = "正在加入玩家对练房间。";
    render();
    try {
      const data = await requestJson(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
        method: "POST",
        body: JSON.stringify({ clientId: getClientId() })
      });
      applyOnlinePayload(data, "已加入玩家对练房间。");
      startPolling();
    } catch (error) {
      game.notice = `加入失败：${error.message}`;
    } finally {
      onlineBusy = false;
      render();
    }
  }

  function applyOnlinePayload(data, notice) {
    game.online = {
      roomCode: data.roomCode,
      color: data.color,
      players: data.players || { red: false, black: false }
    };
    game.playerColor = data.color;
    game.flipped = data.color === "black";
    loadSnapshot(data.state);
    if (els.timeControlSelect && game.timeControl?.id) {
      els.timeControlSelect.value = game.timeControl.id;
    }
    game.notice = notice;
  }

  async function publishOnlineMove(baseVersion, nextState, beforeState) {
    try {
      const data = await requestJson(`/api/rooms/${encodeURIComponent(game.online.roomCode)}/move`, {
        method: "POST",
        body: JSON.stringify({
          clientId: getClientId(),
          color: game.online.color,
          baseVersion,
          state: nextState
        })
      });
      game.online.players = data.players || game.online.players;
      if (data.state && data.state.version !== game.version) {
        loadSnapshot(data.state, { animateLastMove: true });
      }
      game.notice = composeStatus();
    } catch (error) {
      loadSnapshot(beforeState);
      game.notice = `同步失败：${error.message}`;
      pollRoom();
    } finally {
      render();
    }
  }

  async function resetOnlineRoom() {
    if (!game.online?.roomCode || onlineBusy) {
      return;
    }
    onlineBusy = true;
    game.notice = "正在重开房间棋局。";
    render();
    try {
      const data = await requestJson(`/api/rooms/${encodeURIComponent(game.online.roomCode)}/reset`, {
        method: "POST",
        body: JSON.stringify({ clientId: getClientId() })
      });
      game.online.players = data.players || game.online.players;
      loadSnapshot(data.state);
      game.notice = "房间已重开。";
    } catch (error) {
      game.notice = `重开失败：${error.message}`;
    } finally {
      onlineBusy = false;
      render();
    }
  }

  function startPolling() {
    stopPolling();
    pollRoom();
    pollTimer = setInterval(pollRoom, ONLINE_POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  async function pollRoom() {
    if (game.mode !== "online" || !game.online?.roomCode) {
      return;
    }
    try {
      const wasReady = onlineReady();
      const data = await requestJson(`/api/rooms/${encodeURIComponent(game.online.roomCode)}?clientId=${encodeURIComponent(getClientId())}`);
      game.online.players = data.players || game.online.players;
      if (data.color) {
        game.online.color = data.color;
        game.playerColor = data.color;
      }
      if (onlineReady()) {
        stopMatching();
      }
      if (data.state && data.state.version !== game.version) {
        loadSnapshot(data.state, { animateLastMove: true });
        game.notice = composeStatus();
      } else if (onlineReady() !== wasReady) {
        game.notice = composeStatus();
      }
      updateUi();
    } catch (error) {
      game.notice = `房间连接异常：${error.message}`;
      updateUi();
    }
  }

  async function requestJson(url, options = {}) {
    const apiUrl = /^https?:\/\//i.test(url) ? url : `${API_BASE}${url}`;
    const response = await fetch(apiUrl, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let data = {};
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
    }
    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async function probePikafishHealth() {
    try {
      const response = await fetch("engines/pikafish-wasm/pikafish.js", { cache: "no-store" });
      if (response.ok) {
        return "Pikafish WASM 脚本已找到，但初始化或分析失败。请检查浏览器是否支持 WebAssembly、SharedArrayBuffer 和跨源隔离。";
      }
      return `未找到 Pikafish WASM 脚本：HTTP ${response.status}。请先运行 npm run build:pikafish-wasm。`;
    } catch (error) {
      return `Pikafish WASM 探活失败：${error.message}。请确认 pikafish.js 和 pikafish.wasm 已发布到 engines/pikafish-wasm/。`;
    }
  }

  function shade(hex, amount) {
    const value = hex.replace("#", "");
    const number = parseInt(value.length === 3 ? value.split("").map((char) => char + char).join("") : value, 16);
    const r = Math.max(0, Math.min(255, (number >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((number >> 8) & 255) + amount));
    const b = Math.max(0, Math.min(255, (number & 255) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }

  window.xianqiDebug = {
    game,
    createInitialBoard,
    getAllLegalMoves,
    getLegalMovesForPiece,
    isKingInCheck,
    resetBoard,
    chooseAiMove,
    commitMove,
    moveKey,
    OPENING_BOOK_LINES
  };

  setup();
})();
