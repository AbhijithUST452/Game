from pathlib import Path
import re

path = Path('js/game.js')
if not path.exists():
    raise SystemExit('Could not find js/game.js. Run this script from the game project root folder, next to index.html.')

s = path.read_text(encoding='utf-8')

# 1) Replace AI Schrödinger behavior with tactical movement.
new_ai = '''  function aiSchroMove() {
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
    if (usefulPowerup && Math.hypot(usefulPowerup.x - schro.x, usefulPowerup.y - schro.y) < 420) {
      aiMoveWithPath(schro, usefulPowerup);
      return;
    }

    // Move to a clean firing lane around the Cat. This solves the wall-camping case:
    // the AI goes around the obstacle, then fires only when line of sight is clear.
    const firingSpot = findFiringPosition();
    if (firingSpot) {
      aiMoveWithPath(schro, firingSpot);
      return;
    }

    // Last resort: keep chasing the Cat through the normal BFS pathfinder.
    aiMoveWithPath(schro, cat);
  }'''

pattern = r'  function aiSchroMove\(\) \{.*?\n  \}\n  function aiCatMove\('
s2, count = re.subn(pattern, new_ai + '\n  function aiCatMove(', s, flags=re.S)
if count == 0:
    raise SystemExit('Could not locate aiSchroMove automatically. Please edit manually using README.md.')
s = s2

# 2) Insert helper functions if missing.
helpers = r'''
  function hasLineOfSight(from, to) {
    // Sample the segment between Schrödinger and the Cat. A sampled point inside
    // any obstacle means the obstacle blocks the firing lane.
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(distance / 8));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      if (mapObstacles.some(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h)) return false;
    }
    return true;
  }

  function isPointSafeForEntity(x, y, size = 40) {
    const test = { x, y, size };
    if (x < size / 2 || x > W - size / 2 || y < size / 2 || y > H - size / 2) return false;
    return !mapObstacles.some(o => rectEntityHit(test, o));
  }

  function nearestPowerupFor(side, origin) {
    const options = powerups.filter(p => p.side === side);
    if (!options.length) return null;
    options.sort((a, b) => Math.hypot(a.x - origin.x, a.y - origin.y) - Math.hypot(b.x - origin.x, b.y - origin.y));
    return options[0];
  }

  function findFiringPosition() {
    const candidates = [];
    const radii = [150, 200, 260, 315];
    for (const r of radii) {
      for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2;
        const p = { x: cat.x + Math.cos(a) * r, y: cat.y + Math.sin(a) * r, size: schro.size };
        if (!isPointSafeForEntity(p.x, p.y, schro.size)) continue;
        if (!hasLineOfSight(p, cat)) continue;
        const path = bfsPath(schro, p);
        if (!path.length && Math.hypot(p.x - schro.x, p.y - schro.y) > CELL) continue;
        candidates.push({ p, score: path.length * CELL + Math.hypot(p.x - schro.x, p.y - schro.y) + Math.abs(r - 220) });
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.score - b.score);
    return candidates[0].p;
  }
'''

if 'function hasLineOfSight' not in s:
    marker = '  function rectEntityHit(e, o) { return e.x + e.size / 2 > o.x && e.x - e.size / 2 < o.x + o.w && e.y + e.size / 2 > o.y && e.y - e.size / 2 < o.y + o.h; }'
    if marker not in s:
        raise SystemExit('Could not find rectEntityHit insertion point. Please edit manually using README.md.')
    s = s.replace(marker, marker + '\n' + helpers)
else:
    # If the previous LOS patch already added hasLineOfSight, add only the new tactical helpers.
    tactical_helpers = re.sub(r'\n  function hasLineOfSight\(from, to\) \{.*?\n  \}\n', '\n', helpers, flags=re.S)
    if 'function findFiringPosition' not in s:
        insert_after = re.search(r'  function hasLineOfSight\(from, to\) \{.*?\n  \}\n', s, flags=re.S)
        if insert_after:
            pos = insert_after.end()
            s = s[:pos] + tactical_helpers + s[pos:]
        else:
            marker = '  function rectEntityHit(e, o)'
            idx = s.find(marker)
            if idx == -1:
                raise SystemExit('Could not insert tactical helpers. Please edit manually using README.md.')

# 3) Make pathfinding less likely to freeze forever by forcing recalculation when no path exists.
s = s.replace('    const n = e.aiPath[0]; if (!n) return;\n', '    const n = e.aiPath[0]; if (!n) { e.aiRecalc = 0; return; }\n')

path.write_text(s, encoding='utf-8')
print('AI behavior fix applied to js/game.js')
