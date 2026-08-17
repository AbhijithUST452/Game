(() => {
  "use strict";
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  const TIME_STEP = 1000 / 60;
  const CELL = 40;
  const neon = {
    cyan: "#00F3FF",
    magenta: "#FF00EA",
    orange: "#FF9F1C",
    red: "#ff234d",
  };

  const $ = (id) => document.getElementById(id);
  const screens = [
    "mode-screen",
    "name-screen",
    "instructions-screen",
    "game-over-screen",
    "leaderboard-screen",
  ].map($);
  const keys = new Set();
  let audioCtx = null;
  let selectedMode = "solo-cat";
  let lastTime = 0,
    accumulator = 0,
    frame = 0;
  let isPlaying = false;
  let timeRemaining = 60;
  let catScore = 0,
    schrodingerScore = 0,
    comboMultiplier = 1,
    lastHitTime = -999;
  let survivedTicks = 0;
  let totalHits = 0,
    catWasHit = false,
    shotsFired = 0,
    shotsHit = 0;
  let boxes = [],
    particles = [],
    floatingTexts = [],
    decoys = [],
    powerups = [],
    mapObstacles = [];
  let hazard = null;
  let nextPowerupAt = 7,
    nextHazardAt = 15;

  // Leaderboard System
  const LEADERBOARD_KEY = "schrodinger_cat_leaderboard";
  let gameoverLeaderboardFilter = "all";
  let mainLeaderboardFilter = "all";
  let latestNewScoreIds = [];

  const imgCat = new Image();
  imgCat.src = "assets/cat.png";
  const imgSchro = new Image();
  imgSchro.src = "assets/schrodinger.png";
  const bgm = $("bgm");

  const cat = makeEntity("cat", 120, 300, 40, 5);
  const schro = makeEntity("schro", 760, 300, 40, 4);
  cat.buff = null;
  cat.buffTimer = 0;
  cat.dashCooldown = 0;
  schro.power = "Standard";
  schro.ammo = Infinity;
  schro.shootCooldown = 0;
  schro.stillFrames = 0;
  schro.observing = false;
  schro.slowTimer = 0;

  // Leaderboard Functions
  function getLeaderboard() {
    try {
      const data = localStorage.getItem(LEADERBOARD_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Failed to load leaderboard:", e);
      return [];
    }
  }

  function saveLeaderboard(entries) {
    try {
      entries.sort((a, b) => b.score - a.score);
      if (entries.length > 100) entries = entries.slice(0, 100);
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to save leaderboard:", e);
    }
  }

  function formatLeaderboardDate() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${min}`;
  }

  function addScoreToLeaderboard(name, role, score, mode, isWinner) {
    const entries = getLeaderboard();
    const id =
      "score-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    const newEntry = {
      id: id,
      name: name || (role === "Cat" ? "Cat" : "Schrödinger"),
      role: role,
      score: score,
      mode: mode,
      isWinner: isWinner,
      date: formatLeaderboardDate(),
    };
    entries.push(newEntry);
    saveLeaderboard(entries);
    return id;
  }

  function escapeHTML(str) {
    if (!str) return "";
    return str.replace(
      /[&<>'"]/g,
      (tag) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        })[tag] || tag,
    );
  }

  function renderLeaderboard(tbodyId, filterMode = "all", highlightIds = []) {
    const tbody = $(tbodyId);
    if (!tbody) return;

    let entries = getLeaderboard();
    if (filterMode !== "all") {
      entries = entries.filter((e) => e.mode === filterMode);
    }
    entries.sort((a, b) => b.score - a.score);

    if (entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="padding: 15px; opacity: 0.6; font-style: italic;">No quantum records found.</td></tr>`;
      return;
    }

    let html = "";
    entries.forEach((entry, idx) => {
      const isHighlighted = highlightIds && highlightIds.includes(entry.id);
      const rank = idx + 1;
      let rankBadge = `<span class="rank-badge rank-other">${rank}</span>`;
      if (rank === 1) rankBadge = `<span class="rank-badge rank-1">👑 1</span>`;
      else if (rank === 2)
        rankBadge = `<span class="rank-badge rank-2">🥈 2</span>`;
      else if (rank === 3)
        rankBadge = `<span class="rank-badge rank-3">🥉 3</span>`;

      const roleBadge =
        entry.role === "Cat"
          ? `<span class="role-cat">🐱 Cat</span>`
          : `<span class="role-schro">🔬 Schro</span>`;
      const isNewPill = isHighlighted
        ? `<span class="new-pill">NEW</span>`
        : "";
      const rowClass = isHighlighted ? ' class="new-score-row"' : "";

      html += `<tr${rowClass}>
        <td>${rankBadge}</td>
        <td><strong>${escapeHTML(entry.name)}</strong>${isNewPill}</td>
        <td>${roleBadge}</td>
        <td>${entry.mode === "solo-cat" ? "Solo Cat" : entry.mode === "solo-schro" ? "Solo Schro" : "Versus"}</td>
        <td><span class="score-val">${entry.score}</span></td>
        <td style="font-size: 0.85em; opacity: 0.8;">${entry.date || "-"}</td>
      </tr>`;
    });

    tbody.innerHTML = html;
  }

  function setupLeaderboardTabs() {
    const gameoverTabs = document.querySelectorAll(
      "#gameover-leaderboard-tabs .tab-btn",
    );
    gameoverTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        gameoverTabs.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        gameoverLeaderboardFilter =
          e.target.getAttribute("data-filter") || "all";
        renderLeaderboard(
          "gameover-leaderboard-body",
          gameoverLeaderboardFilter,
          latestNewScoreIds,
        );
      });
    });

    const mainTabs = document.querySelectorAll(
      "#main-leaderboard-tabs .tab-btn",
    );
    mainTabs.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        mainTabs.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        mainLeaderboardFilter = e.target.getAttribute("data-filter") || "all";
        renderLeaderboard("main-leaderboard-body", mainLeaderboardFilter, []);
      });
    });
  }

  function makeEntity(type, x, y, size, speed) {
    return {
      type,
      x,
      y,
      prevX: x,
      prevY: y,
      vx: 0,
      vy: 0,
      size,
      speed,
      aiPath: [],
      aiTarget: null,
      aiRecalc: 0,
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const aabb = (a, b) =>
    Math.abs(a.x - b.x) * 2 < a.size + b.size &&
    Math.abs(a.y - b.y) * 2 < a.size + b.size;
  const circleHit = (e, c) =>
    Math.hypot(e.x - c.x, e.y - c.y) < e.size / 2 + c.r;

  function showScreen(id) {
    screens.forEach((s) => s.classList.toggle("hidden", s.id !== id));
  }
  function hideScreens() {
    screens.forEach((s) => s.classList.add("hidden"));
  }

  function updateNameFieldsForMode() {
    const catField = $("cat-name-field");
    const schroField = $("schro-name-field");
    const catInput = $("cat-name");
    const schroInput = $("schro-name");
    const soloCat = selectedMode === "solo-cat";
    const soloSchro = selectedMode === "solo-schro";
    const multi = selectedMode === "multi";

    catField.classList.toggle("hidden", !(soloCat || multi));
    schroField.classList.toggle("hidden", !(soloSchro || multi));

    catInput.value = "";
    schroInput.value = "";
    catInput.placeholder = soloCat ? "Enter Cat name" : "Enter Cat name";
    schroInput.placeholder = soloSchro
      ? "Enter Schrödinger name"
      : "Enter Schrödinger name";
  }

  function validateNameInputs() {
    const catInput = $("cat-name");
    const schroInput = $("schro-name");
    const trimCat = catInput.value.trim();
    const trimSchro = schroInput.value.trim();

    if (selectedMode === "solo-cat") {
      if (!trimCat) {
        alert("Please enter the Cat name to continue.");
        catInput.focus();
        return false;
      }
      return true;
    }

    if (selectedMode === "solo-schro") {
      if (!trimSchro) {
        alert("Please enter the Schrödinger name to continue.");
        schroInput.focus();
        return false;
      }
      return true;
    }

    if (!trimCat || !trimSchro) {
      alert("Please enter both Cat and Schrödinger names to continue.");
      if (!trimCat) catInput.focus();
      else schroInput.focus();
      return false;
    }

    return true;
  }

  document.querySelectorAll("[data-mode]").forEach((btn) =>
    btn.addEventListener("click", () => {
      selectedMode = btn.dataset.mode;
      sfx("btnClick");
      updateNameFieldsForMode();
      showScreen("name-screen");
    }),
  );
  $("back-to-mode").onclick = () => {
    sfx("click");
    showScreen("mode-screen");
  };
  $("names-next").onclick = () => {
    if (!validateNameInputs()) return;
    sfx("click");
    populateInstructions();
    showScreen("instructions-screen");
  };
  $("start-game").onclick = () => {
    sfx("unlock");
    startGame();
  };
  $("replay").onclick = () => {
    sfx("btnClick");
    startGame();
  };
  $("change-mode").onclick = () => {
    sfx("click");
    showScreen("mode-screen");
  };

  // Leaderboard screen handlers
  const viewLeaderboardBtn = $("view-leaderboard-btn");
  if (viewLeaderboardBtn) {
    viewLeaderboardBtn.addEventListener("click", () => {
      sfx("btnClick");
      screens.forEach((s) => s.classList.add("hidden"));
      $("leaderboard-screen").classList.remove("hidden");
      mainLeaderboardFilter = "all";
      const mainTabs = document.querySelectorAll(
        "#main-leaderboard-tabs .tab-btn",
      );
      mainTabs.forEach((b) =>
        b.classList.toggle("active", b.getAttribute("data-filter") === "all"),
      );
      renderLeaderboard("main-leaderboard-body", "all", []);
    });
  }

  const leaderboardBackBtn = $("leaderboard-back-btn");
  if (leaderboardBackBtn) {
    leaderboardBackBtn.addEventListener("click", () => {
      sfx("click");
      showScreen("mode-screen");
    });
  }

  const resetLeaderboardBtn = $("reset-leaderboard-btn");
  if (resetLeaderboardBtn) {
    resetLeaderboardBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to clear all leaderboard records?")) {
        saveLeaderboard([]);
        if (typeof sfx === "function") sfx("dash");
        renderLeaderboard("main-leaderboard-body", mainLeaderboardFilter, []);
      }
    });
  }

  $("volume-slider").oninput = (e) => {
    bgm.volume = Number(e.target.value) - Number(e.target.value) * 0.8;
  };
  $("mute-btn").onclick = () => {
    bgm.muted = !bgm.muted;
    $("mute-btn").textContent = bgm.muted ? "Unmute" : "Mute";
    sfx("click");
  };
  addEventListener("keydown", (e) => {
    keys.add(e.key.toLowerCase());
    if (
      [" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(
        e.key.toLowerCase(),
      )
    )
      e.preventDefault();
    resumeAudio();
  });
  addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  document.body.addEventListener("pointerdown", resumeAudio, { once: false });

  function resumeAudio() {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    bgm.volume =
      Number($("volume-slider").value) - Number($("volume-slider").value) * 0.8;
    bgm.play().catch(() => startSynthBgm());
  }
  let synthBgmStarted = false;
  function startSynthBgm() {
    if (!audioCtx || synthBgmStarted) return;
    synthBgmStarted = true;
    const bass = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    bass.type = "sawtooth";
    bass.frequency.value = 55;
    gain.gain.value = 0.025;
    bass.connect(gain).connect(audioCtx.destination);
    bass.start();
  }
  function sfx(type) {
    if (!audioCtx)
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    const t = audioCtx.currentTime;
    const key = String(type || "click").toLowerCase();
    const settings = {
      click: ["sine", 420, 180, 0.11, 0.09],
      btnclick: ["triangle", 600, 260, 0.16, 0.117],
      btnClick: ["triangle", 600, 260, 0.16, 0.117],
      shoot: ["square", 180, 90, 0.15, 0.0684],
      dash: ["sawtooth", 760, 180, 0.22, 0.099],
      unlock: ["triangle", 280, 800, 0.28, 0.117],
      hit: ["square", 96, 26, 0.26, 0.144],
      powerup: ["triangle", 440, 620, 0.24, 0.126],
      "powerup-zoomies": ["triangle", 440, 720, 0.22, 0.144],
      "powerup-ghost": ["sine", 360, 640, 0.26, 0.135],
      "powerup-wormhole": ["sawtooth", 210, 980, 0.3, 0.144],
      "powerup-multi": ["square", 260, 820, 0.26, 0.126],
      "powerup-tracking": ["sawtooth", 330, 920, 0.25, 0.135],
      "powerup-heavy": ["square", 220, 680, 0.28, 0.144],
      gameover: ["sawtooth", 120, 32, 0.7, 0.162],
    }[key] || ["sine", 300, 100, 0.15, 0.072];
    o.type = settings[0];
    o.frequency.setValueAtTime(settings[1], t);
    o.frequency.exponentialRampToValueAtTime(settings[2], t + settings[3]);
    g.gain.setValueAtTime(settings[4], t);
    if (key === "gameover") {
      g.gain.exponentialRampToValueAtTime(0.0001, t + settings[3]);
      o.frequency.setValueAtTime(140, t + settings[3] * 0.25);
      o.frequency.exponentialRampToValueAtTime(30, t + settings[3]);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + settings[3]);
    }
    o.connect(g).connect(audioCtx.destination);
    o.start(t);
    o.stop(t + settings[3]);
  }

  function populateInstructions() {
    const catName = sanitizeName($("cat-name").value, "Cat");
    const schroName = sanitizeName($("schro-name").value, "Schrödinger");
    $("cat-name-label").textContent = catName;
    $("schro-name-label").textContent = schroName;
    const lines = {
      "solo-cat": `<b>${catName}</b>: Arrow keys to move, Shift to dash. Survive 60 seconds. AI Schrödinger hunts and shoots.<br><br>Score: Cat +5 per second, Schrödinger +100 per hit. Missed AI shots cost -20. Cat hit by box costs -20.`,
      "solo-schro": `<b>${schroName}</b>: Arrow keys to move, Space to shoot. Box the AI Cat before time runs out.<br><br>Score: Cat +5 per second, Schrödinger +100 per hit. Missed Schrödinger shots cost -50. Cat hit by box costs -20.`,
      multi: `<b>${catName}</b>: WASD move, Shift dash.<br><b>${schroName}</b>: Arrow keys move, Space shoot.<br><br>Local PvP. Cat survives, Schrödinger boxes. Score: Cat +5 per second, Schrödinger +100 per hit. Missed Schrödinger shots cost -50. Cat hit by box costs -20.`,
    }[selectedMode];
    $("instructions-title").textContent =
      selectedMode === "multi" ? "Local PvP Rules" : "Solo Mode Rules";
    $("instructions-body").innerHTML =
      lines +
      `<br><br>Powerups spawn every 7 seconds. Circles help the Cat. Triangles upgrade Schrödinger's next 3 shots. Red hazard zones are dangerous to both players.`;
  }
  function sanitizeName(v, fallback) {
    return (v || fallback).replace(/[<>]/g, "").trim().slice(0, 15) || fallback;
  }

  function startGame() {
    hideScreens();
    resumeAudio();
    isPlaying = true;
    timeRemaining = 60;
    catScore = 0;
    schrodingerScore = 0;
    comboMultiplier = 1;
    lastHitTime = -999;
    survivedTicks = 0;
    totalHits = 0;
    catWasHit = false;
    shotsFired = 0;
    shotsHit = 0;
    boxes = [];
    particles = [];
    floatingTexts = [];
    decoys = [];
    powerups = [];
    hazard = null;
    nextPowerupAt = 7;
    nextHazardAt = 15;
    frame = 0;
    Object.assign(cat, makeEntity("cat", 120, 300, 40, 5), {
      buff: null,
      buffTimer: 0,
      dashCooldown: 0,
    });
    Object.assign(schro, makeEntity("schro", 760, 300, 40, 4), {
      power: "Standard",
      ammo: Infinity,
      shootCooldown: 0,
      stillFrames: 0,
      observing: false,
      slowTimer: 0,
    });
    generateObstacles();
    updateHud();
    lastTime = performance.now();
    accumulator = 0;
  }

  function generateObstacles() {
    mapObstacles = [];
    let attempts = 0;
    while (mapObstacles.length < 6 && attempts++ < 400) {
      const o = {
        x: rand(170, 720),
        y: rand(100, 500),
        w: rand(55, 125),
        h: rand(45, 100),
      };
      if (
        Math.hypot(o.x - cat.x, o.y - cat.y) < 140 ||
        Math.hypot(o.x - schro.x, o.y - schro.y) < 140
      )
        continue;
      if (
        mapObstacles.some(
          (p) =>
            !(
              o.x + o.w + 45 < p.x ||
              o.x > p.x + p.w + 45 ||
              o.y + o.h + 45 < p.y ||
              o.y > p.y + p.h + 45
            ),
        )
      )
        continue;
      mapObstacles.push(o);
    }
  }

  requestAnimationFrame(loop);
  function loop(ts) {
    const delta = Math.min(ts - lastTime, 100);
    lastTime = ts;
    accumulator += delta;
    while (accumulator >= TIME_STEP) {
      if (isPlaying) update();
      accumulator -= TIME_STEP;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function update() {
    frame++;
    timeRemaining -= 1 / 60;
    if (timeRemaining <= 0) return endGame();
    survivedTicks++;
    if (survivedTicks >= 60) {
      survivedTicks = 0;
      catScore += 5;
      addText(cat.x, cat.y - 28, "+5", neon.cyan);
    }
    if (60 - timeRemaining >= nextPowerupAt) {
      spawnPowerup();
      nextPowerupAt += 7;
    }
    if (60 - timeRemaining >= nextHazardAt) {
      spawnHazard();
      nextHazardAt += 15;
    }
    updatePlayer(cat, isCatAI());
    updateSchro(isSchroAI());
    updateBoxes();
    updatePowerups();
    updateHazard();
    updateFx();
    updateHud();
  }
  const isCatAI = () => selectedMode === "solo-schro";
  const isSchroAI = () => selectedMode === "solo-cat";

  function updatePlayer(e, ai) {
    e.prevX = e.x;
    e.prevY = e.y;
    let dx = 0,
      dy = 0;
    if (ai) aiCatMove();
    else {
      const useWasd = selectedMode === "multi";
      dx += keys.has(useWasd ? "a" : "arrowleft") ? -1 : 0;
      dx += keys.has(useWasd ? "d" : "arrowright") ? 1 : 0;
      dy += keys.has(useWasd ? "w" : "arrowup") ? -1 : 0;
      dy += keys.has(useWasd ? "s" : "arrowdown") ? 1 : 0;
      const mag = Math.hypot(dx, dy) || 1;
      const slow = schro.observing ? 0.5 : 1;
      const buff = e.buff === "Zoomies" ? 1.8 : 1;
      e.x += (dx / mag) * e.speed * slow * buff;
      e.y += (dy / mag) * e.speed * slow * buff;
      if (keys.has("shift") && e.dashCooldown <= 0 && (dx || dy))
        dashCat(dx / mag, dy / mag);
      if (e.dashCooldown > 0) e.dashCooldown--;
    }
    if (e.buffTimer > 0 && --e.buffTimer <= 0) expireCatBuff();
    constrainEntity(e, e.buff === "Ghost");
  }
  function dashCat(nx, ny) {
    cat.x += nx * 150;
    cat.y += ny * 150;
    cat.dashCooldown = 120;
    sfx("dash");
    for (let i = 0; i < 7; i++)
      decoys.push({
        x: cat.prevX - nx * i * 11,
        y: cat.prevY - ny * i * 11,
        life: 32 - i * 3,
      });
  }
  function updateSchro(ai) {
    schro.prevX = schro.x;
    schro.prevY = schro.y;
    if (schro.shootCooldown > 0) schro.shootCooldown--;
    if (schro.slowTimer > 0) schro.slowTimer--;
    if (ai) aiSchroMove();
    else {
      let dx = 0,
        dy = 0;
      dx += keys.has("arrowleft") ? -1 : 0;
      dx += keys.has("arrowright") ? 1 : 0;
      dy += keys.has("arrowup") ? -1 : 0;
      dy += keys.has("arrowdown") ? 1 : 0;
      const mag = Math.hypot(dx, dy) || 1;
      const slow = schro.slowTimer > 0 ? 0.55 : 1;
      schro.x += (dx / mag) * schro.speed * slow;
      schro.y += (dy / mag) * schro.speed * slow;
      if (keys.has(" ")) shootAt(cat.x, cat.y);
      schro.stillFrames = dx || dy ? 0 : schro.stillFrames + 1;
    }
    schro.observing = schro.stillFrames >= 90;
    constrainEntity(schro, false);
  }

  function constrainEntity(e, ghost) {
    e.x = clamp(e.x, e.size / 2, W - e.size / 2);
    e.y = clamp(e.y, e.size / 2, H - e.size / 2);
    if (ghost && e.type === "cat") return;
    for (const o of mapObstacles) {
      if (rectEntityHit(e, o)) {
        e.x = e.prevX;
        e.y = e.prevY;
        break;
      }
    }
  }
  function rectEntityHit(e, o) {
    return (
      e.x + e.size / 2 > o.x &&
      e.x - e.size / 2 < o.x + o.w &&
      e.y + e.size / 2 > o.y &&
      e.y - e.size / 2 < o.y + o.h
    );
  }
  function expireCatBuff() {
    const old = cat.buff;
    cat.buff = null;
    if (old === "Ghost") {
      for (
        let i = 0;
        i < 80 && mapObstacles.some((o) => rectEntityHit(cat, o));
        i++
      ) {
        cat.x = rand(45, W - 45);
        cat.y = rand(70, H - 45);
      }
    }
  }

  function shootAt(tx, ty) {
    if (schro.shootCooldown > 0) return;
    schro.shootCooldown = 22;
    sfx("shoot");
    const ang = Math.atan2(ty - schro.y, tx - schro.x);
    const kind = schro.power;
    if (kind === "Multi")
      [-0.22, 0, 0.22].forEach((a) => makeBox(ang + a, kind, true));
    else makeBox(ang, kind, false);
    shotsFired++;
    if (schro.ammo !== Infinity && --schro.ammo <= 0) {
      schro.power = "Standard";
      schro.ammo = Infinity;
    }
  }
  function makeBox(ang, kind, volley) {
    const heavy = kind === "Heavy";
    boxes.push({
      x: schro.x,
      y: schro.y,
      vx: Math.cos(ang) * (heavy ? 5 : 8),
      vy: Math.sin(ang) * (heavy ? 5 : 8),
      size: heavy ? 34 : 22,
      life: 95,
      kind,
      hit: false,
      volley,
    });
  }
  function updateBoxes() {
    for (const b of boxes) {
      if (b.kind === "Tracking") {
        const a = Math.atan2(cat.y - b.y, cat.x - b.x),
          sp = Math.hypot(b.vx, b.vy);
        b.vx = b.vx * 0.94 + Math.cos(a) * sp * 0.06;
        b.vy = b.vy * 0.94 + Math.sin(a) * sp * 0.06;
      }
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      if (cat.buff !== "Ghost" && aabb(b, cat)) {
        hitCat(b);
        b.life = 0;
        b.hit = true;
      }
      if (mapObstacles.some((o) => rectEntityHit(b, o))) b.life = 0;
      if (b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20) b.life = 0;
    }
    const before = boxes.length;
    boxes = boxes.filter((b) => {
      if (b.life > 0) return true;
      if (!b.hit) missPenalty();
      burst(b.x, b.y, b.hit ? neon.orange : neon.magenta);
      return false;
    });
  }
  function hitCat(b) {
    const now = 60 - timeRemaining;
    comboMultiplier =
      now - lastHitTime <= 3 ? Math.min(5, comboMultiplier + 1) : 1;
    lastHitTime = now;
    const pts = 100 * comboMultiplier;
    schrodingerScore += pts;
    // Cat loses -20 points when hit by Schrodinger's box
    const before = catScore;
    catScore = Math.max(0, catScore - 20);
    if (before > catScore)
      addText(cat.x, cat.y - 45, `-${before - catScore}`, neon.red);
    totalHits++;
    shotsHit++;
    catWasHit = true;
    sfx("hit");
    addText(cat.x, cat.y - 35, `+${pts} x${comboMultiplier}`, neon.orange);
    // Burst effect and respawn cat to a safe location
    burst(cat.x, cat.y, neon.cyan);
    safeTeleport(cat);
  }
  function missPenalty() {
    // Scoring: -50 for solo-schro and multi, -20 for solo-cat
    const p = selectedMode === "solo-cat" ? 20 : 50;
    const before = schrodingerScore;
    schrodingerScore = Math.max(0, schrodingerScore - p);
    if (before > 0)
      addText(
        schro.x,
        schro.y - 34,
        `-${before - schrodingerScore}`,
        neon.magenta,
      );
  }

  function spawnPowerup() {
    if (powerups.length >= 3) return;
    let p;
    for (let i = 0; i < 50; i++) {
      const catSide = Math.random() < 0.5;
      p = {
        x: rand(50, W - 50),
        y: rand(75, H - 55),
        size: 24,
        side: catSide ? "cat" : "schro",
        type: catSide
          ? pick(["Zoomies", "Ghost", "Wormhole"])
          : pick(["Multi", "Tracking", "Heavy"]),
      };
      if (!mapObstacles.some((o) => rectEntityHit(p, o))) break;
    }
    powerups.push(p);
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function nearestPowerupFor(side, entity) {
    return powerups
      .filter((p) => p.side === side)
      .map((p) => ({ ...p, dist: Math.hypot(p.x - entity.x, p.y - entity.y) }))
      .sort((a, b) => a.dist - b.dist)[0];
  }
  function updatePowerups() {
    powerups = powerups.filter((p) => {
      if (p.side === "cat" && aabb(p, cat)) {
        applyCatPower(p.type);
        return false;
      }
      if (p.side === "schro" && aabb(p, schro)) {
        schro.power = p.type;
        schro.ammo = 3;
        addText(schro.x, schro.y - 28, p.type, neon.magenta);
        sfx(`powerup-${p.type.toLowerCase()}`);
        return false;
      }
      return true;
    });
  }
  function applyCatPower(type) {
    addText(cat.x, cat.y - 28, type, neon.cyan);
    const soundKey = `powerup-${type.toLowerCase()}`;
    sfx(soundKey);
    if (type === "Wormhole") {
      safeTeleport(cat);
      burst(cat.x, cat.y, neon.cyan);
      return;
    }
    cat.buff = type;
    cat.buffTimer = 240;
  }
  function safeTeleport(e) {
    for (let i = 0; i < 100; i++) {
      e.x = rand(45, W - 45);
      e.y = rand(75, H - 45);
      if (
        !mapObstacles.some((o) => rectEntityHit(e, o)) &&
        Math.hypot(e.x - schro.x, e.y - schro.y) > 180
      )
        return;
    }
  }

  function spawnHazard() {
    hazard = {
      x: rand(120, W - 120),
      y: rand(120, H - 120),
      r: 8,
      maxR: rand(60, 95),
      life: 480,
    };
  }
  function updateHazard() {
    if (!hazard) return;
    hazard.life--;
    hazard.r = Math.min(hazard.maxR, hazard.r + 0.45);
    if (circleHit(cat, hazard)) {
      const before = catScore;
      catScore = Math.max(0, catScore - 2);
      if (before > catScore && frame % 12 === 0)
        addText(cat.x, cat.y - 26, `-${before - catScore}`, neon.red);
    }
    if (circleHit(schro, hazard)) schro.slowTimer = 15;
    if (hazard.life <= 0) hazard = null;
  }

  function pointBlocked(x, y, pad = 20) {
    if (x < pad || y < pad || x > W - pad || y > H - pad) return true;
    return mapObstacles.some(
      (o) =>
        x + pad > o.x &&
        x - pad < o.x + o.w &&
        y + pad > o.y &&
        y - pad < o.y + o.h,
    );
  }
  function segmentIntersectsExpandedRect(a, b, o, pad) {
    const minX = o.x - pad,
      maxX = o.x + o.w + pad;
    const minY = o.y - pad,
      maxY = o.y + o.h + pad;
    let t0 = 0,
      t1 = 1;
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const clip = (p, q) => {
      if (Math.abs(p) < 0.0001) return q >= 0;
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    };
    return (
      clip(-dx, a.x - minX) &&
      clip(dx, maxX - a.x) &&
      clip(-dy, a.y - minY) &&
      clip(dy, maxY - a.y) &&
      t1 > 0 &&
      t0 < 1
    );
  }
  function hasLineOfSight(from, to, pad = 26) {
    return !mapObstacles.some((o) =>
      segmentIntersectsExpandedRect(from, to, o, pad),
    );
  }
  function hasClearShot(from, to) {
    const projectilePadding = schro.power === "Heavy" ? 26 : 20;
    return hasLineOfSight(from, to, projectilePadding);
  }
  function findShootingPosition() {
    const candidates = [];
    const addCandidate = (x, y) => {
      if (pointBlocked(x, y, schro.size / 2 + 4)) return;
      const target = { x, y, size: 20 };
      if (!hasClearShot(target, cat)) return;
      const distToCat = Math.hypot(x - cat.x, y - cat.y);
      if (distToCat < 115 || distToCat > 390) return;
      const distToSchro = Math.hypot(x - schro.x, y - schro.y);
      const currentSideBonus = hasClearShot(schro, cat) ? 0 : -80;
      candidates.push({
        x,
        y,
        size: 20,
        score: distToSchro + Math.abs(distToCat - 235) * 0.8 + currentSideBonus,
      });
    };

    for (const r of [135, 175, 215, 255, 300, 350]) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + (frame % 180) * 0.008;
        addCandidate(cat.x + Math.cos(a) * r, cat.y + Math.sin(a) * r);
      }
    }

    // If the ring search fails, scan the BFS grid for any legal firing lane.
    // This prevents the AI from getting stuck on the wrong side of a wall.
    if (!candidates.length) {
      for (let y = 60; y < H - 30; y += CELL) {
        for (let x = 40; x < W - 30; x += CELL)
          addCandidate(x + CELL / 2, y + CELL / 2);
      }
    }
    return candidates.sort((a, b) => a.score - b.score)[0] || bestEscapePoint();
  }
  function aiSchroMove() {
    const d = Math.hypot(cat.x - schro.x, cat.y - schro.y);
    const visible = hasLineOfSight(schro, cat);
    const usefulPowerup = nearestPowerupFor("schro", schro);

    // If the Cat is visible, attack. If not, reposition instead of standing still
    // or wasting shots into walls.
    if (visible && d <= 320) {
      schro.stillFrames++;
      if (frame % 38 === 0 || d < 230) shootAt(cat.x, cat.y);
      return;
    }

    schro.stillFrames = 0;

    // Fetch Schrödinger powerups when the Cat is not immediately shootable.
    // This makes the AI actively collect triangle abilities instead of idling.
    if (
      usefulPowerup &&
      Math.hypot(usefulPowerup.x - schro.x, usefulPowerup.y - schro.y) < 420
    ) {
      if (!aiMoveWithPath(schro, usefulPowerup)) {
        const fallback = bestEscapePoint();
        if (!aiMoveWithPath(schro, fallback)) {
          aiMoveWithPath(schro, { x: rand(80, W - 80), y: rand(80, H - 80) });
        }
      }
      return;
    }

    // Move to a clean firing lane around the Cat. This solves the wall-camping case:
    // the AI goes around the obstacle, then fires only when line of sight is clear.
    const firingSpot = findShootingPosition();
    if (firingSpot) {
      if (!aiMoveWithPath(schro, firingSpot)) {
        const fallback = bestEscapePoint();
        if (!aiMoveWithPath(schro, fallback)) {
          aiMoveWithPath(schro, { x: rand(80, W - 80), y: rand(80, H - 80) });
        }
      }
      return;
    }

    // Last resort: keep chasing the Cat through the normal BFS pathfinder.
    // If pathfinding fails, pick a safe escape point to avoid getting stuck.
    if (!aiMoveWithPath(schro, cat)) {
      const fallback = bestEscapePoint();
      if (!aiMoveWithPath(schro, fallback)) {
        aiMoveWithPath(schro, { x: rand(80, W - 80), y: rand(80, H - 80) });
      }
    }
  }
  function aiCatMove() {
    const nearPower = nearestPowerupFor("cat", cat);
    let target = null;

    // In Solo Schrödinger mode, the AI Cat actively seeks Cat abilities.
    // Pickups are used on collection: Zoomies/Ghost activate, Wormhole teleports immediately.
    if (
      selectedMode === "solo-schro" &&
      nearPower &&
      nearPower.dist < 480 &&
      !cat.buff
    )
      target = nearPower;
    else if (nearPower && nearPower.dist < 300 && !cat.buff) target = nearPower;
    else target = bestEscapePoint();

    aiMoveWithPath(cat, target);
    if (
      Math.hypot(cat.x - schro.x, cat.y - schro.y) < 135 &&
      cat.dashCooldown <= 0
    ) {
      const a = Math.atan2(cat.y - schro.y, cat.x - schro.x);
      dashCat(Math.cos(a), Math.sin(a));
    }
    if (cat.dashCooldown > 0) cat.dashCooldown--;
  }
  function bestEscapePoint() {
    const pts = [
      [60, 80],
      [450, 80],
      [840, 80],
      [60, 300],
      [840, 300],
      [60, 540],
      [450, 540],
      [840, 540],
    ].map(([x, y]) => ({ x, y, size: 20 }));
    return pts.sort(
      (a, b) =>
        Math.hypot(b.x - schro.x, b.y - schro.y) -
        Math.hypot(a.x - schro.x, a.y - schro.y),
    )[0];
  }

  function aiMoveWithPath(e, target) {
    if (!target) return false;

    const targetKey = `${Math.round(target.x)},${Math.round(target.y)}`;
    const distToTarget = Math.hypot(e.x - target.x, e.y - target.y);

    // If the AI is already effectively at the target, stop moving instead of
    // orbiting around it forever. This is especially important for power-up pickups.
    if (distToTarget < 18) {
      e.aiPath = [];
      e.aiTargetKey = null;
      e.aiStallFrames = 0;
      return true;
    }

    if (e.aiTargetKey === targetKey && e.aiLastTargetDist !== undefined) {
      const delta = Math.abs(e.aiLastTargetDist - distToTarget);
      if (delta < 2 && distToTarget < 70) {
        e.aiStallFrames = (e.aiStallFrames || 0) + 1;
        if (e.aiStallFrames > 18) {
          e.aiPath = [];
          e.aiRecalc = 0;
          e.aiTargetKey = null;
          return false;
        }
      } else {
        e.aiStallFrames = 0;
      }
    }
    e.aiLastTargetDist = distToTarget;
    e.aiTargetKey = targetKey;

    if (e.aiRecalc-- <= 0 || !e.aiPath.length) {
      const pathTarget = pointBlocked(target.x, target.y, e.size + 8)
        ? bestEscapePoint()
        : target;
      e.aiPath = bfsPath(e, pathTarget);
      e.aiRecalc = 20;
    }
    const n = e.aiPath[0];
    if (!n) {
      e.aiRecalc = 0;
      return false;
    }
    const tx = n.x * CELL + CELL / 2,
      ty = n.y * CELL + CELL / 2;
    const a = Math.atan2(ty - e.y, tx - e.x);
    const slow = e.type === "schro" && e.slowTimer > 0 ? 0.55 : 1;
    const sp =
      e.speed * (e.type === "cat" && e.buff === "Zoomies" ? 1.8 : 1) * slow;
    e.x += Math.cos(a) * sp;
    e.y += Math.sin(a) * sp;
    if (Math.hypot(tx - e.x, ty - e.y) < 8) e.aiPath.shift();
    return true;
  }
  function bfsPath(e, target) {
    const cols = Math.floor(W / CELL),
      rows = Math.floor(H / CELL);
    const block = Array.from({ length: rows }, () => Array(cols).fill(false));
    for (const o of mapObstacles) {
      const pad = e.size / 2;
      const x0 = clamp(Math.floor((o.x - pad) / CELL), 0, cols - 1),
        x1 = clamp(Math.floor((o.x + o.w + pad) / CELL), 0, cols - 1);
      const y0 = clamp(Math.floor((o.y - pad) / CELL), 0, rows - 1),
        y1 = clamp(Math.floor((o.y + o.h + pad) / CELL), 0, rows - 1);
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) block[y][x] = true;
    }
    if (e.type === "cat" && e.buff === "Ghost")
      block.forEach((r) => r.fill(false));
    const start = {
      x: clamp(Math.floor(e.x / CELL), 0, cols - 1),
      y: clamp(Math.floor(e.y / CELL), 0, rows - 1),
    };
    const goal = {
      x: clamp(Math.floor(target.x / CELL), 0, cols - 1),
      y: clamp(Math.floor(target.y / CELL), 0, rows - 1),
    };
    const q = [start],
      seen = new Set([`${start.x},${start.y}`]),
      parent = {};
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ];
    while (q.length) {
      const cur = q.shift();
      if (cur.x === goal.x && cur.y === goal.y) break;
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx,
          ny = cur.y + dy,
          key = `${nx},${ny}`;
        if (
          nx < 0 ||
          ny < 0 ||
          nx >= cols ||
          ny >= rows ||
          block[ny][nx] ||
          seen.has(key)
        )
          continue;
        seen.add(key);
        parent[key] = cur;
        q.push({ x: nx, y: ny });
      }
    }
    let cur = goal,
      path = [],
      guard = 0;
    while ((cur.x !== start.x || cur.y !== start.y) && guard++ < 300) {
      path.unshift(cur);
      cur = parent[`${cur.x},${cur.y}`];
      if (!cur) return [];
    }
    return path.slice(0, 14);
  }

  function updateFx() {
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    particles = particles.filter((p) => p.life > 0);
    floatingTexts.forEach((t) => {
      t.y -= 0.65;
      t.life--;
    });
    floatingTexts = floatingTexts.filter((t) => t.life > 0);
    decoys.forEach((d) => d.life--);
    decoys = decoys.filter((d) => d.life > 0);
  }
  function burst(x, y, color) {
    for (let i = 0; i < 12; i++)
      particles.push({
        x,
        y,
        vx: rand(-2, 2),
        vy: rand(-2, 2),
        life: rand(15, 32),
        color,
      });
  }
  function addText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 58 });
  }

  function updateHud() {
    catScore = Math.max(0, catScore);
    schrodingerScore = Math.max(0, schrodingerScore);
    $("cat-score").textContent = Math.round(catScore);
    $("schro-score").textContent = Math.round(schrodingerScore);
    $("timer").textContent = Math.max(0, Math.ceil(timeRemaining));
    $("timer").classList.toggle("danger", timeRemaining < 10);
    $("cat-powerup-ui").textContent =
      `CAT BUFF: ${cat.buff ? cat.buff.toUpperCase() + " " + Math.ceil(cat.buffTimer / 60) + "s" : "NONE"}`;
    $("powerup-ui").textContent =
      `BOX: ${schro.power.toUpperCase()} ${schro.ammo === Infinity ? "∞" : schro.ammo}`;
  }

  function endGame() {
    isPlaying = false;
    sfx("gameover");
    updateHud();
    catScore = Math.max(0, catScore);
    schrodingerScore = Math.max(0, schrodingerScore);
    const catWins = catScore >= schrodingerScore;
    const catName = $("cat-name-label").textContent;
    const schroName = $("schro-name-label").textContent;

    $("winner-text").textContent = catWins
      ? `${catName} escaped the paradox!`
      : `${schroName} collapsed the wavefunction!`;
    $("final-scores").innerHTML =
      `<p>Cat Score: <b>${Math.round(catScore)}</b></p><p>Schrödinger Score: <b>${Math.round(schrodingerScore)}</b></p><p>Hits: ${totalHits} | Shot Accuracy: ${shotsFired ? Math.round((shotsHit / shotsFired) * 100) : 0}%</p>`;

    // Update match summary cards
    $("final-cat-name").textContent = catName;
    $("final-cat-score").textContent = Math.round(catScore);
    $("final-schrodinger-name").textContent = schroName;
    $("final-schrodinger-score").textContent = Math.round(schrodingerScore);

    const catCard = $("summary-cat-card");
    const schroCard = $("summary-schro-card");
    if (catCard) catCard.classList.remove("winner");
    if (schroCard) schroCard.classList.remove("winner");
    if (catWins) catCard.classList.add("winner");
    else if (schrodingerScore > catScore) schroCard.classList.add("winner");

    const badges = [];
    if (!catWasHit) badges.push("Untouchable");
    if (totalHits >= 5) badges.push("Speed Boxer");
    if (comboMultiplier >= 3) badges.push("Combo Collapse");
    if (catScore > 250) badges.push("Nine Lives");
    $("achievements").innerHTML = badges.length
      ? badges.map((b) => `<span>${b}</span>`).join("")
      : `<span>Quantum Rookie</span>`;

    // Add to leaderboard
    latestNewScoreIds = [];
    if (selectedMode === "solo-cat") {
      const id = addScoreToLeaderboard(
        catName,
        "Cat",
        Math.round(catScore),
        "solo-cat",
        catWins,
      );
      latestNewScoreIds.push(id);
    } else if (selectedMode === "solo-schro") {
      const id = addScoreToLeaderboard(
        schroName,
        "Schrodinger",
        Math.round(schrodingerScore),
        "solo-schro",
        schrodingerScore >= catScore,
      );
      latestNewScoreIds.push(id);
    } else if (selectedMode === "multi") {
      const idCat = addScoreToLeaderboard(
        catName,
        "Cat",
        Math.round(catScore),
        "multi",
        catScore > schrodingerScore,
      );
      const idSchro = addScoreToLeaderboard(
        schroName,
        "Schrodinger",
        Math.round(schrodingerScore),
        "multi",
        schrodingerScore > catScore,
      );
      latestNewScoreIds.push(idCat, idSchro);
    }

    gameoverLeaderboardFilter = "all";
    const gameoverTabs = document.querySelectorAll(
      "#gameover-leaderboard-tabs .tab-btn",
    );
    gameoverTabs.forEach((b) =>
      b.classList.toggle("active", b.getAttribute("data-filter") === "all"),
    );
    renderLeaderboard("gameover-leaderboard-body", "all", latestNewScoreIds);

    showScreen("game-over-screen");
  }

  function draw() {
    drawBackground();
    drawObstacles();
    drawHazard();
    drawPowerups();
    drawDecoys();
    drawObserver();
    drawPlayers();
    drawBoxes();
    drawParticles();
    drawTexts();
  }
  function drawBackground() {
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#0A192F";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += CELL) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += CELL) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  function drawObstacles() {
    ctx.save();
    ctx.shadowBlur = 16;
    ctx.shadowColor = neon.cyan;
    for (const o of mapObstacles) {
      ctx.fillStyle = "rgba(0,243,255,.10)";
      ctx.strokeStyle = neon.cyan;
      ctx.lineWidth = 2;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    }
    ctx.restore();
  }
  function drawHazard() {
    if (!hazard) return;
    ctx.save();
    ctx.globalAlpha = 0.25 + Math.sin(frame * 0.18) * 0.12;
    ctx.fillStyle = neon.red;
    ctx.shadowBlur = 25;
    ctx.shadowColor = neon.red;
    ctx.beginPath();
    ctx.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = neon.red;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  function drawPowerups() {
    for (const p of powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.shadowBlur = 18;
      ctx.shadowColor = p.side === "cat" ? neon.cyan : neon.magenta;
      ctx.strokeStyle = ctx.shadowColor;
      ctx.fillStyle =
        p.side === "cat" ? "rgba(0,243,255,.18)" : "rgba(255,0,234,.18)";
      ctx.lineWidth = 3;
      if (p.side === "cat") {
        ctx.beginPath();
        ctx.arc(0, 0, 13 + Math.sin(frame * 0.12) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(15, 12);
        ctx.lineTo(-15, 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function drawDecoys() {
    ctx.save();
    for (const d of decoys) {
      ctx.globalAlpha = (d.life / 32) * 0.35;
      ctx.shadowBlur = 12;
      ctx.shadowColor = neon.cyan;
      ctx.drawImage(imgCat, d.x - 20, d.y - 20, 40, 40);
    }
    ctx.restore();
  }
  function drawObserver() {
    if (!schro.observing) return;
    ctx.save();
    ctx.strokeStyle = neon.cyan;
    ctx.globalAlpha = 0.5 + 0.2 * Math.sin(frame * 0.2);
    ctx.shadowBlur = 20;
    ctx.shadowColor = neon.cyan;
    ctx.beginPath();
    ctx.arc(schro.x, schro.y, 70 + Math.sin(frame * 0.1) * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  function drawPlayers() {
    drawSprite(imgCat, cat, cat.buff === "Ghost" ? 0.45 : 1, neon.cyan);
    drawSprite(imgSchro, schro, 1, neon.magenta);
  }
  function drawSprite(img, e, alpha, glow) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 18;
    ctx.shadowColor = glow;
    ctx.drawImage(img, e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    ctx.restore();
  }
  function drawBoxes() {
    for (const b of boxes) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 4);
      ctx.shadowBlur = 14;
      ctx.shadowColor = b.kind === "Tracking" ? neon.cyan : neon.orange;
      ctx.fillStyle =
        b.kind === "Heavy" ? "rgba(255,159,28,.8)" : "rgba(255,255,255,.85)";
      ctx.strokeStyle = neon.magenta;
      ctx.lineWidth = 2;
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
      ctx.strokeRect(-b.size / 2, -b.size / 2, b.size, b.size);
      ctx.restore();
    }
  }
  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.life / 32;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;
  }
  function drawTexts() {
    ctx.save();
    ctx.font = "bold 16px Courier New";
    ctx.textAlign = "center";
    for (const t of floatingTexts) {
      ctx.globalAlpha = t.life / 58;
      ctx.fillStyle = t.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.restore();
  }

  showScreen("mode-screen");
  setupLeaderboardTabs();
  draw();
})();
