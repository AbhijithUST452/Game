/* ======================================================
   THE SCHRODINGER PARADOX — game.js
   Core simulation: movement, boxes, obstacles, power-ups,
   hazards, quantum mechanics, AI opponent, rendering.
   Exposes window.SP.Game
   ====================================================== */

   window.SP = window.SP || {};

   SP.Game = (function () {
   
     // ---------------------------------------------------
     // Constants
     // ---------------------------------------------------
     var W = 960, H = 600;
     var PLAYER_RADIUS = 20;
     var PLAYER_SPEED = 230;           // px/sec
     var OBSTACLE_COUNT = 7;
     var SPAWN_MARGIN = 60;
   
     var CHARGE_MAX = 1.1;             // seconds
     var BOX_BASE_SPEED = 340;
     var BOX_SPEED_PER_CHARGE = 260;
     var BOX_BASE_RANGE = 260;
     var BOX_RANGE_PER_CHARGE = 380;
     var BOX_RADIUS = 9;
   
     var DASH_DISTANCE = 130;
     var DASH_COOLDOWN = 2.0;
   
     var OBSERVER_STILL_THRESHOLD = 1.5;
     var OBSERVER_SLOW_DURATION = 2.0;
     var OBSERVER_SLOW_FACTOR = 0.5;
   
     var ORB_MAX_ACTIVE = 2;
     var ORB_SPAWN_COOLDOWN = 7;
     var ORB_RADIUS = 13;
     var POWERUP_USES = 3;
   
     var HAZARD_COUNT = 2;
     var HAZARD_BASE_R = 55;
     var HAZARD_AMPLITUDE = 22;
     var HAZARD_DRAIN = 4;             // points per tick
     var HAZARD_TICK = 0.4;            // seconds
   
     var CAT_SURVIVAL_RATE = 2.2;      // points per second
     var CAT_HIT_PENALTY = 20;
     var NEAR_MISS_BONUS = 15;
     var NEAR_MISS_RADIUS = PLAYER_RADIUS + BOX_RADIUS + 26;
     var COMBO_WINDOW = 3000;          // ms
   
     var COLORS = {
       schrodinger: '#4cf3ff',
       cat: '#ff3ec9',
       multi: '#ffb238',
       tracking: '#4cf3ff',
       heavy: '#a97bff',
       wormhole: '#4dffa0',
       hazard: '#ff4d5e',
       obstacle: '#1c6d78'
     };
   
     // ---------------------------------------------------
     // Module state
     // ---------------------------------------------------
     var canvas, ctx;
     var running = false;
     var rafId = null;
     var lastTime = 0;
   
     var pressedCodes = {};
     var config = null;
   
     var schrodinger, cat;
     var obstacles = [];
     var boxes = [];
     var orbs = [];
     var hazards = [];
     var particles = [];
     var floatingTexts = [];
   
     var scores = { schrodinger: 0, cat: 0 };
     var stats = {
       throwCount: 0,
       hitCount: 0,
       dashCount: 0,
       maxCombo: 0,
       catWasHit: false,
       hazardTouches: 0
     };
     var comboCount = 0;
     var lastHitTime = -99999;
     var orbSpawnTimer = 0;
     var gridTime = 0;
   
     var shakeTime = 0;
     var shakeMag = 0;
   
     var imgSchrodinger = new Image();
     var imgCat = new Image();
     var imgSchrodingerOk = false;
     var imgCatOk = false;
     imgSchrodinger.onload = function () { imgSchrodingerOk = true; };
     imgCat.onload = function () { imgCatOk = true; };
     imgSchrodinger.onerror = function () { imgSchrodingerOk = false; };
     imgCat.onerror = function () { imgCatOk = false; };
     imgSchrodinger.src = 'assets/schrodinger.png';
     imgCat.src = 'assets/cat.png';
   
     // ---------------------------------------------------
     // Utility
     // ---------------------------------------------------
     function rand(a, b) { return a + Math.random() * (b - a); }
     function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
     function dist(x1, y1, x2, y2) { return Math.hypot(x1 - x2, y1 - y2); }
   
     function circleRectOverlap(cx, cy, r, rect) {
       var closestX = clamp(cx, rect.x, rect.x + rect.w);
       var closestY = clamp(cy, rect.y, rect.y + rect.h);
       return dist(cx, cy, closestX, closestY) < r;
     }
   
     function isFreeOfObstacles(x, y, r, padding) {
       for (var i = 0; i < obstacles.length; i++) {
         var o = obstacles[i];
         var inflated = { x: o.x - padding, y: o.y - padding, w: o.w + padding * 2, h: o.h + padding * 2 };
         if (circleRectOverlap(x, y, r, inflated)) return false;
       }
       return true;
     }
   
     function findSafeSpot(minDistFromPoints, avoidPoints) {
       for (var attempt = 0; attempt < 300; attempt++) {
         var x = rand(SPAWN_MARGIN, W - SPAWN_MARGIN);
         var y = rand(SPAWN_MARGIN, H - SPAWN_MARGIN);
         if (!isFreeOfObstacles(x, y, PLAYER_RADIUS, 14)) continue;
         var ok = true;
         if (avoidPoints) {
           for (var i = 0; i < avoidPoints.length; i++) {
             if (dist(x, y, avoidPoints[i].x, avoidPoints[i].y) < minDistFromPoints) { ok = false; break; }
           }
         }
         if (ok) return { x: x, y: y };
       }
       return { x: W / 2, y: H / 2 };
     }
   
     // ---------------------------------------------------
     // Setup: obstacles, entities, hazards
     // ---------------------------------------------------
     function generateObstacles() {
       obstacles = [];
       var tries = 0;
       while (obstacles.length < OBSTACLE_COUNT && tries < 500) {
         tries++;
         var w = rand(50, 100);
         var h = rand(36, 70);
         var x = rand(90, W - 90 - w);
         var y = rand(90, H - 90 - h);
         var rect = { x: x, y: y, w: w, h: h };
   
         var overlaps = false;
         for (var i = 0; i < obstacles.length; i++) {
           var o = obstacles[i];
           if (x < o.x + o.w + 40 && x + w + 40 > o.x && y < o.y + o.h + 40 && y + h + 40 > o.y) {
             overlaps = true; break;
           }
         }
         // keep a clear channel down the middle so a straight box throw is always possible
         if (x < W / 2 + 30 && x + w > W / 2 - 30 && h > 50) overlaps = true;
   
         if (!overlaps) obstacles.push(rect);
       }
     }
   
     function createEntity(role, controls, isAI) {
       return {
         role: role,
         controls: controls,
         isAI: isAI,
         x: 0, y: 0,
         vx: 0, vy: 0,
         facingX: role === 'schrodinger' ? 1 : -1,
         facingY: 0,
         input: { up: false, down: false, left: false, right: false, action: false },
         prevAction: false,
         // schrodinger fields
         charging: false,
         chargeTime: 0,
         standStillTimer: 0,
         powerup: null,
         powerupUses: 0,
         // cat fields
         dashCooldown: 0,
         slowTimer: 0,
         decoys: [],
         aiTimer: 0,
         aiTargetX: 0,
         aiTargetY: 0,
         aiHolding: false,
         aiHoldTarget: 0
       };
     }
   
     function controlsForRole(role) {
       var ARROWS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'Enter' };
       var WASD = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', action: 'Space' };
       var SOLO = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', action: 'ShiftAny' };
   
       if (config.mode === 'solo') {
         return (role === config.soloRole) ? SOLO : null;
       }
       var wasdRole = config.swapRoles ? 'cat' : 'schrodinger';
       return (role === wasdRole) ? WASD : ARROWS;
     }
   
     function setupEntities() {
       var schrodingerControls = controlsForRole('schrodinger');
       var catControls = controlsForRole('cat');
   
       schrodinger = createEntity('schrodinger', schrodingerControls, schrodingerControls === null);
       cat = createEntity('cat', catControls, catControls === null);
   
       var spotA = findSafeSpot(0, []);
       schrodinger.x = spotA.x; schrodinger.y = spotA.y;
   
       var spotB = findSafeSpot(220, [{ x: schrodinger.x, y: schrodinger.y }]);
       cat.x = spotB.x; cat.y = spotB.y;
     }
   
     function spawnHazards() {
       hazards = [];
       for (var i = 0; i < HAZARD_COUNT; i++) {
         relocateHazard(i, true);
       }
     }
   
     function relocateHazard(index, initial) {
       var spot = findSafeSpot(0, []);
       hazards[index] = {
         x: spot.x, y: spot.y,
         baseR: HAZARD_BASE_R,
         phase: rand(0, Math.PI * 2),
         lifeTimer: rand(10, 16)
       };
     }
   
     // ---------------------------------------------------
     // Input handling
     // ---------------------------------------------------
     function onKeyDown(e) {
       if (!running) return;
       pressedCodes[e.code] = true;
       if (e.code === 'Space' || e.code.indexOf('Arrow') === 0) e.preventDefault();
     }
     function onKeyUp(e) {
       pressedCodes[e.code] = false;
     }
   
     function readInputs() {
       [schrodinger, cat].forEach(function (ent) {
         if (ent.isAI || !ent.controls) return;
         var c = ent.controls;
         ent.input.up = !!pressedCodes[c.up];
         ent.input.down = !!pressedCodes[c.down];
         ent.input.left = !!pressedCodes[c.left];
         ent.input.right = !!pressedCodes[c.right];
         ent.input.action = c.action === 'ShiftAny'
           ? (!!pressedCodes['ShiftLeft'] || !!pressedCodes['ShiftRight'])
           : !!pressedCodes[c.action];
       });
     }
   
     // ---------------------------------------------------
     // Movement
     // ---------------------------------------------------
     function moveEntity(ent, dt, speedMultiplier) {
       var dx = (ent.input.right ? 1 : 0) - (ent.input.left ? 1 : 0);
       var dy = (ent.input.down ? 1 : 0) - (ent.input.up ? 1 : 0);
   
       if (dx !== 0 || dy !== 0) {
         var len = Math.hypot(dx, dy);
         dx /= len; dy /= len;
         ent.facingX = dx; ent.facingY = dy;
         ent.standStillTimer = 0;
       } else if (ent.role === 'schrodinger') {
         ent.standStillTimer += dt;
       }
   
       var speed = PLAYER_SPEED * (speedMultiplier || 1);
       var nx = ent.x + dx * speed * dt;
       var ny = ent.y + dy * speed * dt;
   
       nx = clamp(nx, PLAYER_RADIUS, W - PLAYER_RADIUS);
       if (isFreeOfObstacles(nx, ent.y, PLAYER_RADIUS, 0)) ent.x = nx;
   
       ny = clamp(ny, PLAYER_RADIUS, H - PLAYER_RADIUS);
       if (isFreeOfObstacles(ent.x, ny, PLAYER_RADIUS, 0)) ent.y = ny;
     }
   
     // ---------------------------------------------------
     // Schrodinger: charge + throw
     // ---------------------------------------------------
     function updateSchrodingerAction(ent, dt) {
       if (ent.input.action && !ent.prevAction) {
         ent.charging = true;
         ent.chargeTime = 0;
       }
       if (ent.input.action && ent.charging) {
         ent.chargeTime = Math.min(CHARGE_MAX, ent.chargeTime + dt);
         SP.UI.updateChargeMeter((ent.chargeTime / CHARGE_MAX) * 100);
       }
       if (!ent.input.action && ent.prevAction && ent.charging) {
         throwBoxes(ent);
         ent.charging = false;
         ent.chargeTime = 0;
         SP.UI.updateChargeMeter(0);
       }
       ent.prevAction = ent.input.action;
   
       // Observer Effect
       if (ent.standStillTimer >= OBSERVER_STILL_THRESHOLD) {
         triggerObserverEffect();
         ent.standStillTimer = 0;
       }
     }
   
     function triggerObserverEffect() {
       cat.slowTimer = OBSERVER_SLOW_DURATION;
       SP.UI.flashObserver();
       spawnParticles(cat.x, cat.y, COLORS.schrodinger, 10);
     }
   
     function throwBoxes(ent) {
       var chargePct = ent.chargeTime / CHARGE_MAX;
       var speed = BOX_BASE_SPEED + chargePct * BOX_SPEED_PER_CHARGE;
       var range = BOX_BASE_RANGE + chargePct * BOX_RANGE_PER_CHARGE;
   
       var type = ent.powerup;
       var angles = [0];
       if (type === 'multi') angles = [-0.28, 0, 0.28];
   
       angles.forEach(function (offset) {
         var baseAngle = Math.atan2(ent.facingY, ent.facingX);
         var angle = baseAngle + offset;
         var vx = Math.cos(angle) * speed;
         var vy = Math.sin(angle) * speed;
         boxes.push({
           x: ent.x + ent.facingX * (PLAYER_RADIUS + 4),
           y: ent.y + ent.facingY * (PLAYER_RADIUS + 4),
           vx: vx, vy: vy,
           traveled: 0,
           maxRange: range,
           radius: type === 'heavy' ? BOX_RADIUS * 1.7 : BOX_RADIUS,
           tracking: type === 'tracking',
           minDistToCat: 99999,
           nearMissAwarded: false
         });
       });
   
       stats.throwCount++;
   
       if (type) {
         ent.powerupUses--;
         if (ent.powerupUses <= 0) ent.powerup = null;
       }
     }
   
     function updateBoxes(dt) {
       for (var i = boxes.length - 1; i >= 0; i--) {
         var b = boxes[i];
   
         if (b.tracking) {
           var toCatX = cat.x - b.x, toCatY = cat.y - b.y;
           var toCatLen = Math.hypot(toCatX, toCatY) || 1;
           var steer = 2.4;
           b.vx += (toCatX / toCatLen) * steer * 60 * dt;
           b.vy += (toCatY / toCatLen) * steer * 60 * dt;
           var spd = Math.hypot(b.vx, b.vy);
           var maxSpd = BOX_BASE_SPEED + BOX_SPEED_PER_CHARGE;
           if (spd > maxSpd) { b.vx = (b.vx / spd) * maxSpd; b.vy = (b.vy / spd) * maxSpd; }
         }
   
         var stepX = b.vx * dt, stepY = b.vy * dt;
         b.x += stepX; b.y += stepY;
         b.traveled += Math.hypot(stepX, stepY);
   
         var dCat = dist(b.x, b.y, cat.x, cat.y);
         if (dCat < b.minDistToCat) b.minDistToCat = dCat;
   
         var offscreen = b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > H + 20;
         var spent = b.traveled >= b.maxRange;
   
         if (dCat < b.radius + PLAYER_RADIUS - 4) {
           handleCatHit();
           boxes.splice(i, 1);
           continue;
         }
   
         if (offscreen || spent) {
           if (!b.nearMissAwarded && b.minDistToCat < NEAR_MISS_RADIUS) {
             scores.cat += NEAR_MISS_BONUS;
             addFloatingText(cat.x, cat.y - 30, '+' + NEAR_MISS_BONUS + ' NEAR MISS', COLORS.cat);
           }
           boxes.splice(i, 1);
         }
       }
     }
   
     function handleCatHit() {
       var now = performance.now();
       comboCount = (now - lastHitTime <= COMBO_WINDOW) ? comboCount + 1 : 1;
       lastHitTime = now;
       stats.maxCombo = Math.max(stats.maxCombo, comboCount);
       stats.hitCount++;
       stats.catWasHit = true;
   
       var points = 100 * comboCount;
       scores.schrodinger += points;
       scores.cat = Math.max(0, scores.cat - CAT_HIT_PENALTY);
   
       addFloatingText(schrodinger.x, schrodinger.y - 34, '+' + points + (comboCount > 1 ? ' x' + comboCount : ''), COLORS.schrodinger);
       spawnParticles(cat.x, cat.y, COLORS.cat, 22);
       triggerShake(9, 0.28);
   
       var spot = findSafeSpot(180, [{ x: schrodinger.x, y: schrodinger.y }]);
       cat.x = spot.x; cat.y = spot.y;
     }
   
     // ---------------------------------------------------
     // Cat: dash
     // ---------------------------------------------------
     function updateCatAction(ent, dt) {
       if (ent.dashCooldown > 0) ent.dashCooldown -= dt;
   
       if (ent.input.action && !ent.prevAction && ent.dashCooldown <= 0) {
         performDash(ent);
       }
       ent.prevAction = ent.input.action;
   
       if (ent.slowTimer > 0) ent.slowTimer -= dt;
   
       for (var i = ent.decoys.length - 1; i >= 0; i--) {
         ent.decoys[i].life -= dt;
         if (ent.decoys[i].life <= 0) ent.decoys.splice(i, 1);
       }
     }
   
     function performDash(ent) {
       ent.decoys.push({ x: ent.x, y: ent.y, life: 0.45, maxLife: 0.45 });
   
       var dx = ent.facingX, dy = ent.facingY;
       var len = Math.hypot(dx, dy) || 1;
       dx /= len; dy /= len;
   
       var nx = clamp(ent.x + dx * DASH_DISTANCE, PLAYER_RADIUS, W - PLAYER_RADIUS);
       var ny = clamp(ent.y + dy * DASH_DISTANCE, PLAYER_RADIUS, H - PLAYER_RADIUS);
   
       // step back toward the origin until the landing spot is clear of obstacles
       var steps = 12;
       for (var s = steps; s >= 0; s--) {
         var t = s / steps;
         var tx = ent.x + (nx - ent.x) * t;
         var ty = ent.y + (ny - ent.y) * t;
         if (isFreeOfObstacles(tx, ty, PLAYER_RADIUS, 2)) { ent.x = tx; ent.y = ty; break; }
       }
   
       ent.dashCooldown = DASH_COOLDOWN;
       stats.dashCount++;
       spawnParticles(ent.x, ent.y, COLORS.cat, 12);
     }
   
     // ---------------------------------------------------
     // Orbs (power-ups)
     // ---------------------------------------------------
     function updateOrbs(dt) {
       orbSpawnTimer -= dt;
       if (orbs.length < ORB_MAX_ACTIVE && orbSpawnTimer <= 0) {
         spawnOrb();
         orbSpawnTimer = ORB_SPAWN_COOLDOWN;
       }
   
       for (var i = orbs.length - 1; i >= 0; i--) {
         var orb = orbs[i];
         orb.bobPhase += dt * 3;
   
         var targetEnt = orb.type === 'wormhole' ? cat : schrodinger;
         if (dist(orb.x, orb.y, targetEnt.x, targetEnt.y) < ORB_RADIUS + PLAYER_RADIUS) {
           applyOrb(orb, targetEnt);
           orbs.splice(i, 1);
         }
       }
     }
   
     function spawnOrb() {
       var types = ['multi', 'tracking', 'heavy', 'wormhole'];
       var type = types[Math.floor(rand(0, types.length))];
       var spot = findSafeSpot(0, []);
       orbs.push({ x: spot.x, y: spot.y, type: type, bobPhase: rand(0, 6) });
     }
   
     function applyOrb(orb, ent) {
       spawnParticles(orb.x, orb.y, COLORS[orb.type], 16);
       if (orb.type === 'wormhole') {
         var spot = findSafeSpot(160, [{ x: schrodinger.x, y: schrodinger.y }]);
         ent.x = spot.x; ent.y = spot.y;
         addFloatingText(ent.x, ent.y - 30, 'WORMHOLE', COLORS.wormhole);
       } else {
         ent.powerup = orb.type;
         ent.powerupUses = POWERUP_USES;
         addFloatingText(ent.x, ent.y - 30, orb.type.toUpperCase() + ' BOX x' + POWERUP_USES, COLORS[orb.type]);
       }
     }
   
     // ---------------------------------------------------
     // Hazards (radioactive zones)
     // ---------------------------------------------------
     var hazardTickTimer = 0;
   
     function updateHazards(dt) {
       hazardTickTimer -= dt;
       var drainThisTick = hazardTickTimer <= 0;
       if (drainThisTick) hazardTickTimer = HAZARD_TICK;
   
       for (var i = 0; i < hazards.length; i++) {
         var hz = hazards[i];
         hz.phase += dt * 1.6;
         hz.lifeTimer -= dt;
         var r = hz.baseR + Math.sin(hz.phase) * HAZARD_AMPLITUDE;
   
         [schrodinger, cat].forEach(function (ent) {
           if (dist(ent.x, ent.y, hz.x, hz.y) < r) {
             if (drainThisTick) {
               scores[ent.role] = Math.max(0, scores[ent.role] - HAZARD_DRAIN);
               stats.hazardTouches++;
               spawnParticles(ent.x, ent.y, COLORS.hazard, 2);
             }
           }
         });
   
         if (hz.lifeTimer <= 0) relocateHazard(i, false);
       }
     }
   
     // ---------------------------------------------------
     // Particles & floating text & shake
     // ---------------------------------------------------
     function spawnParticles(x, y, color, count) {
       for (var i = 0; i < count; i++) {
         var angle = rand(0, Math.PI * 2);
         var speed = rand(40, 180);
         particles.push({
           x: x, y: y,
           vx: Math.cos(angle) * speed,
           vy: Math.sin(angle) * speed,
           life: rand(0.3, 0.6),
           maxLife: 0.6,
           color: color,
           size: rand(2, 4)
         });
       }
     }
   
     function addFloatingText(x, y, text, color) {
       floatingTexts.push({ x: x, y: y, text: text, life: 1.1, maxLife: 1.1, color: color });
     }
   
     function triggerShake(mag, time) {
       shakeMag = mag; shakeTime = time;
     }
   
     function updateJuice(dt) {
       for (var i = particles.length - 1; i >= 0; i--) {
         var p = particles[i];
         p.x += p.vx * dt; p.y += p.vy * dt;
         p.vx *= 0.94; p.vy *= 0.94;
         p.life -= dt;
         if (p.life <= 0) particles.splice(i, 1);
       }
       for (var j = floatingTexts.length - 1; j >= 0; j--) {
         var t = floatingTexts[j];
         t.y -= 26 * dt;
         t.life -= dt;
         if (t.life <= 0) floatingTexts.splice(j, 1);
       }
       if (shakeTime > 0) shakeTime -= dt;
     }
   
     // ---------------------------------------------------
     // AI opponent (solo mode)
     // ---------------------------------------------------
     function updateAI(ent, dt) {
       ent.aiTimer -= dt;
   
       if (ent.role === 'schrodinger') {
         aiSchrodinger(ent, dt);
       } else {
         aiCat(ent, dt);
       }
     }
   
     // AI functions only steer movement and set a *virtual* input.action key —
     // exactly like a human's keypress. The shared updateSchrodingerAction /
     // updateCatAction functions (called once per frame for every entity) own
     // all the actual timers, so nothing is ever advanced twice.
     function aiSchrodinger(ent, dt) {
       var target = cat;
       var d = dist(ent.x, ent.y, target.x, target.y);
   
       if (ent.aiTimer <= 0) {
         ent.aiTimer = rand(0.6, 1.3);
         var idealDist = 260;
         if (d < idealDist - 40) {
           ent.aiTargetX = ent.x - (target.x - ent.x);
           ent.aiTargetY = ent.y - (target.y - ent.y);
         } else if (d > idealDist + 60) {
           ent.aiTargetX = target.x;
           ent.aiTargetY = target.y;
         } else {
           ent.aiTargetX = ent.x + rand(-100, 100);
           ent.aiTargetY = ent.y + rand(-100, 100);
         }
         ent.aiTargetX = clamp(ent.aiTargetX, 60, W - 60);
         ent.aiTargetY = clamp(ent.aiTargetY, 60, H - 60);
       }
   
       steerTowards(ent, ent.aiTargetX, ent.aiTargetY);
   
       // aim toward the cat
       var dx = target.x - ent.x, dy = target.y - ent.y;
       var len = Math.hypot(dx, dy) || 1;
       ent.facingX = dx / len; ent.facingY = dy / len;
   
       // decide whether to hold the virtual action key this frame
       if (!ent.aiHolding) {
         if (d < 480 && Math.random() < dt * 0.6) {
           ent.aiHolding = true;
           ent.aiHoldTarget = rand(0.3, CHARGE_MAX);
         }
       } else if (ent.chargeTime >= ent.aiHoldTarget) {
         ent.aiHolding = false; // release -> throw handled by updateSchrodingerAction
       }
       ent.input.action = ent.aiHolding;
     }
   
     function aiCat(ent, dt) {
       var threat = null, threatDist = 9999;
       for (var i = 0; i < boxes.length; i++) {
         var b = boxes[i];
         var d = dist(b.x, b.y, ent.x, ent.y);
         var approaching = ((ent.x - b.x) * b.vx + (ent.y - b.y) * b.vy) > 0;
         if (approaching && d < threatDist) { threatDist = d; threat = b; }
       }
   
       var wantDash = false;
       if (threat && threatDist < 220) {
         var perpX = -threat.vy, perpY = threat.vx;
         var len = Math.hypot(perpX, perpY) || 1;
         perpX /= len; perpY /= len;
         if (Math.random() < 0.5) { perpX *= -1; perpY *= -1; }
         ent.aiTargetX = clamp(ent.x + perpX * 140, 50, W - 50);
         ent.aiTargetY = clamp(ent.y + perpY * 140, 50, H - 50);
         wantDash = ent.dashCooldown <= 0 && threatDist < 110;
       } else if (ent.aiTimer <= 0) {
         ent.aiTimer = rand(1, 2);
         ent.aiTargetX = clamp(rand(80, W - 80), 80, W - 80);
         ent.aiTargetY = clamp(rand(80, H - 80), 80, H - 80);
       }
   
       steerTowards(ent, ent.aiTargetX, ent.aiTargetY);
   
       // virtual tap: true for exactly one frame so updateCatAction's edge
       // detection (press == !prevAction) triggers a single dash, then we
       // immediately drop it back to false.
       ent.input.action = wantDash;
     }
   
     function steerTowards(ent, tx, ty) {
       var dx = tx - ent.x, dy = ty - ent.y;
       var len = Math.hypot(dx, dy);
       ent.input.up = ent.input.down = ent.input.left = ent.input.right = false;
       if (len < 8) return;
       dx /= len; dy /= len;
       if (dx > 0.3) ent.input.right = true;
       if (dx < -0.3) ent.input.left = true;
       if (dy > 0.3) ent.input.down = true;
       if (dy < -0.3) ent.input.up = true;
       if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) { ent.facingX = dx; ent.facingY = dy; }
     }
   
     // ---------------------------------------------------
     // Main update
     // ---------------------------------------------------
     function update(dt) {
       gridTime += dt;
       readInputs();
   
       var schSpeedMul = 1;
       var catSpeedMul = cat.slowTimer > 0 ? OBSERVER_SLOW_FACTOR : 1;
   
       if (schrodinger.isAI) updateAI(schrodinger, dt); 
       if (cat.isAI) updateAI(cat, dt);
   
       moveEntity(schrodinger, dt, schSpeedMul);
       moveEntity(cat, dt, catSpeedMul);
   
       updateSchrodingerAction(schrodinger, dt);
       updateCatAction(cat, dt);
   
       updateBoxes(dt);
       updateOrbs(dt);
       updateHazards(dt);
       updateJuice(dt);
   
       scores.cat += CAT_SURVIVAL_RATE * dt;
   
       SP.UI.updateScoreDisplay(scores.schrodinger, scores.cat);
     }
   
     // ---------------------------------------------------
     // Rendering
     // ---------------------------------------------------
     function render() {
       ctx.save();
       ctx.clearRect(0, 0, W, H);
   
       if (shakeTime > 0) {
         ctx.translate(rand(-shakeMag, shakeMag), rand(-shakeMag, shakeMag));
       }
   
       drawGrid();
       drawHazards();
       drawObstacles();
       drawOrbs();
       drawDecoys(cat);
       drawBoxes();
       drawEntity(schrodinger, COLORS.schrodinger, imgSchrodingerOk ? imgSchrodinger : null);
       drawEntity(cat, COLORS.cat, imgCatOk ? imgCat : null);
       drawParticles();
       drawFloatingTexts();
   
       ctx.restore();
     }
   
     function drawGrid() {
       ctx.strokeStyle = 'rgba(76, 243, 255, 0.06)';
       ctx.lineWidth = 1;
       var offset = (gridTime * 12) % 42;
       for (var x = -42 + offset; x < W; x += 42) {
         ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
       }
       for (var y = 0; y < H; y += 42) {
         ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
       }
     }
   
     function drawObstacles() {
       obstacles.forEach(function (o) {
         ctx.fillStyle = 'rgba(28, 109, 120, 0.22)';
         ctx.strokeStyle = COLORS.obstacle;
         ctx.lineWidth = 2;
         ctx.shadowColor = COLORS.obstacle;
         ctx.shadowBlur = 10;
         ctx.fillRect(o.x, o.y, o.w, o.h);
         ctx.strokeRect(o.x, o.y, o.w, o.h);
         ctx.shadowBlur = 0;
       });
     }
   
     function drawHazards() {
       hazards.forEach(function (hz) {
         var r = hz.baseR + Math.sin(hz.phase) * HAZARD_AMPLITUDE;
         var grad = ctx.createRadialGradient(hz.x, hz.y, 0, hz.x, hz.y, r);
         grad.addColorStop(0, 'rgba(255, 77, 94, 0.28)');
         grad.addColorStop(1, 'rgba(255, 77, 94, 0)');
         ctx.fillStyle = grad;
         ctx.beginPath(); ctx.arc(hz.x, hz.y, r, 0, Math.PI * 2); ctx.fill();
         ctx.strokeStyle = 'rgba(255, 77, 94, 0.5)';
         ctx.lineWidth = 1.5;
         ctx.beginPath(); ctx.arc(hz.x, hz.y, r, 0, Math.PI * 2); ctx.stroke();
       });
     }
   
     function drawOrbs() {
       orbs.forEach(function (orb) {
         var bob = Math.sin(orb.bobPhase) * 4;
         ctx.shadowColor = COLORS[orb.type];
         ctx.shadowBlur = 16;
         ctx.fillStyle = COLORS[orb.type];
         ctx.beginPath();
         ctx.arc(orb.x, orb.y + bob, ORB_RADIUS, 0, Math.PI * 2);
         ctx.fill();
         ctx.shadowBlur = 0;
         ctx.strokeStyle = 'rgba(255,255,255,0.6)';
         ctx.lineWidth = 1;
         ctx.beginPath();
         ctx.arc(orb.x, orb.y + bob, ORB_RADIUS + 3, 0, Math.PI * 2);
         ctx.stroke();
       });
     }
   
     function drawDecoys(ent) {
       ent.decoys.forEach(function (d) {
         var a = d.life / d.maxLife;
         ctx.globalAlpha = a * 0.5;
         ctx.strokeStyle = COLORS.cat;
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(d.x, d.y, PLAYER_RADIUS, 0, Math.PI * 2);
         ctx.stroke();
         ctx.globalAlpha = 1;
       });
     }
   
     function drawBoxes() {
       boxes.forEach(function (b) {
         // ground shadow to sell the "flies above the wall" read
         ctx.fillStyle = 'rgba(0,0,0,0.35)';
         ctx.beginPath();
         ctx.ellipse(b.x, b.y + 10, b.radius * 0.9, b.radius * 0.4, 0, 0, Math.PI * 2);
         ctx.fill();
   
         var color = b.tracking ? COLORS.tracking : (b.radius > BOX_RADIUS ? COLORS.heavy : COLORS.multi);
         ctx.shadowColor = color;
         ctx.shadowBlur = 12;
         ctx.fillStyle = color;
         ctx.save();
         ctx.translate(b.x, b.y);
         ctx.rotate(gridTime * 4 + b.traveled * 0.01);
         ctx.fillRect(-b.radius, -b.radius, b.radius * 2, b.radius * 2);
         ctx.restore();
         ctx.shadowBlur = 0;
       });
     }
   
     function drawEntity(ent, color, img) {
       ctx.save();
       ctx.shadowColor = color;
       ctx.shadowBlur = ent.role === 'schrodinger' && ent.charging ? 26 : 14;
   
       if (img) {
         ctx.drawImage(img, ent.x - PLAYER_RADIUS, ent.y - PLAYER_RADIUS, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
       } else {
         ctx.fillStyle = 'rgba(5,7,13,0.9)';
         ctx.strokeStyle = color;
         ctx.lineWidth = 2.5;
         ctx.beginPath();
         ctx.arc(ent.x, ent.y, PLAYER_RADIUS, 0, Math.PI * 2);
         ctx.fill();
         ctx.stroke();
   
         if (ent.role === 'cat') {
           ctx.beginPath();
           ctx.moveTo(ent.x - 9, ent.y - 14);
           ctx.lineTo(ent.x - 15, ent.y - 26);
           ctx.lineTo(ent.x - 2, ent.y - 16);
           ctx.moveTo(ent.x + 9, ent.y - 14);
           ctx.lineTo(ent.x + 15, ent.y - 26);
           ctx.lineTo(ent.x + 2, ent.y - 16);
           ctx.stroke();
         }
       }
       ctx.shadowBlur = 0;
   
       // facing indicator
       ctx.fillStyle = color;
       ctx.beginPath();
       ctx.arc(ent.x + ent.facingX * (PLAYER_RADIUS + 6), ent.y + ent.facingY * (PLAYER_RADIUS + 6), 3, 0, Math.PI * 2);
       ctx.fill();
   
       if (ent.role === 'cat' && ent.slowTimer > 0) {
         ctx.strokeStyle = 'rgba(76,243,255,0.7)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         ctx.arc(ent.x, ent.y, PLAYER_RADIUS + 6, 0, Math.PI * 2);
         ctx.stroke();
       }
   
       ctx.restore();
     }
   
     function drawParticles() {
       particles.forEach(function (p) {
         ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
         ctx.fillStyle = p.color;
         ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
         ctx.globalAlpha = 1;
       });
     }
   
     function drawFloatingTexts() {
       ctx.font = '13px Consolas, monospace';
       ctx.textAlign = 'center';
       floatingTexts.forEach(function (t) {
         ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
         ctx.fillStyle = t.color;
         ctx.shadowColor = t.color;
         ctx.shadowBlur = 8;
         ctx.fillText(t.text, t.x, t.y);
         ctx.shadowBlur = 0;
         ctx.globalAlpha = 1;
       });
     }
   
     // ---------------------------------------------------
     // Loop
     // ---------------------------------------------------
     function loop(now) {
       if (!running) return;
       var dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
       lastTime = now;
   
       update(dt);
       render();
   
       rafId = requestAnimationFrame(loop);
     }
   
     // ---------------------------------------------------
     // Achievements
     // ---------------------------------------------------
     function computeAchievements() {
       var list = [];
       if (!stats.catWasHit) list.push('UNTOUCHABLE — the cat was never observed');
       if (stats.maxCombo >= 3) list.push('SPEED BOXER — ' + stats.maxCombo + 'x hit combo');
       if (stats.dashCount >= 5) list.push('GHOST — ' + stats.dashCount + ' superposition dashes');
       if (stats.throwCount > 0 && stats.hitCount / stats.throwCount >= 0.5) list.push('SHARP SHOOTER — 50%+ accuracy');
       if (stats.hazardTouches === 0) list.push('CLEAN RUN — avoided all radiation');
       if (list.length === 0) list.push('PARTICLE PHYSICIST — simulation completed');
       return list;
     }
   
     // ---------------------------------------------------
     // Lifecycle: start / end
     // ---------------------------------------------------
     function resetState() {
       boxes = []; orbs = []; particles = []; floatingTexts = [];
       scores = { schrodinger: 0, cat: 0 };
       stats = { throwCount: 0, hitCount: 0, dashCount: 0, maxCombo: 0, catWasHit: false, hazardTouches: 0 };
       comboCount = 0; lastHitTime = -99999;
       orbSpawnTimer = ORB_SPAWN_COOLDOWN * 0.4;
       shakeTime = 0; gridTime = 0;
       hazardTickTimer = 0;
       pressedCodes = {};
     }
   
     function start(runConfig) {
       config = runConfig;
       if (!canvas) {
         canvas = document.getElementById('game-canvas');
         ctx = canvas.getContext('2d');
         document.addEventListener('keydown', onKeyDown);
         document.addEventListener('keyup', onKeyUp);
       }
   
       resetState();
       generateObstacles();
       setupEntities();
       spawnHazards();
   
       running = true;
       lastTime = performance.now();
       cancelAnimationFrame(rafId);
       rafId = requestAnimationFrame(loop);
   
       SP.Timer.start(60, function (remaining) {
         SP.UI.updateTimerDisplay(remaining);
       }, function () {
         endGame();
       });
     }
   
     function endGame() {
       running = false;
       cancelAnimationFrame(rafId);
       SP.UI.updateChargeMeter(0);
   
       SP.UI.onGameOver({
         schrodingerScore: scores.schrodinger,
         catScore: scores.cat,
         achievements: computeAchievements()
       });
     }
   
     return { start: start };
   })();