// The whole simulation. No DOM, no timers, no randomness except the seeded PRNG kept in the state.
const Game = (() => {
  const TILE = 16, VIEW_W = 384, VIEW_H = 224;
  const GRAV = 0.26, MAX_FALL = 6;
  const CUT = 2.2;                           // upward speed left when a jump is released early
  const P_SPEED = 110 / 60, P_JUMP = 5.72;   // mushroom: apex about 3.75 tiles
  const H_JUMP = 6.25, H_ACC = 0.25;         // hero: apex about 4.5 tiles
  // What the hero weighs up on the ground: [direction, ticks of jump held, ticks committed, ticks of dash].
  // Run, four jumps, and two dodges (dash ahead, back off) that only count when he has seen the mushroom coming.
  const PLANS = [[1, 0], [1, 3], [1, 8], [1, 14], [1, 30], [1, 0, 8, 30], [-1, 0, 24]];
  const LINES = {
    start: ['СПИДРАН! НЕ МЕШАТЬ!', 'ИДУ НА РЕКОРД.', 'ГРИБ, С ДОРОГИ!'],
    stomp: ['ГРИБЫ НЕ ПРЫГАЮТ!', 'ЭТО БАГ!', 'ЛАГАЕТ!', 'ТАК НЕЧЕСТНО!'],
    bump: ['ПОЛ КУСАЕТСЯ?!', 'КТО ТАМ СНИЗУ?', 'ЭТО БАГ!'],
    squish: ['ЗНАЙ СВОЕ МЕСТО, ГРИБ.', 'КЛАССИКА.', 'ВОТ ТАК ЭТО ДЕЛАЕТСЯ.'],
    playerPit: ['ГРИБЫ НЕ ЛЕТАЮТ.', 'САМ УПАЛ. Я НЕ ТРОГАЛ.'],
    heart: ['ЕЩЕ СЕРДЕЧКО. ИЗИ.', 'МОНЕТЫ РЕШАЮТ.'],
    pit: ['ЯМЫ ТУТ НЕ БЫЛО!', 'ЭТО ГЕЙМПАД!', 'Я ТАК И ХОТЕЛ.'],
    ragequit: ['ДА НУ ЭТУ ИГРУ!', 'ВСЕ. УДАЛЯЮ.', 'ИГРА СЛОМАНА!'],
    finish: ['ИЗИ. СЛЕДУЮЩИЙ УРОВЕНЬ.', 'ДАЖЕ НЕ ВСПОТЕЛ.'],
    lives: ['ГРИБЫ КОНЧИЛИСЬ.', 'ИЗИ.'],
  };

  const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const grabs = (e, coin) => coin.x > e.x - 5 && coin.x < e.x + e.w + 5 && coin.y > e.y - 5 && coin.y < e.y + e.h + 5;
  const setState = (e, state) => { e.state = state; e.stateT = 0; };
  // `at` is a body (the event lands on its centre) or a plain point
  const emit = (s, type, at, more) => s.events.push({ type, x: at.x + (at.w || 0) / 2, y: at.y + (at.h || 0) / 2, ...more });

  function rnd(s) {   // mulberry32
    s.rng = s.rng + 0x6D2B79F5 | 0;
    let t = Math.imul(s.rng ^ s.rng >>> 15, 1 | s.rng);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  function say(s, key) {
    const lines = LINES[key];
    s.hero.say = { text: lines[rnd(s) * lines.length | 0], t: 120 };
  }

  function create(levelIndex, seed) {
    const L = LEVELS[levelIndex], rows = [];
    for (const section of L.map) section.trim().split('\n').forEach((row, i) => rows[i] = (rows[i] || '') + row.trim());
    const w = rows[0].length;
    if (rows.length !== 14 || rows.some(row => row.length !== w)) throw new Error(`level ${levelIndex + 1}: every section needs 14 rows of equal width`);
    const level = {
      name: L.name, theme: L.theme, hint: L.hint, w, h: rows.length, pipes: [], finishX: 0, finishY: 0,
      hints: L.hints.map(([tx, text]) => ({ x: tx * TILE, text })),
    };
    const coins = [], feet = {};
    const tiles = rows.map((row, ty) => [...row].map((c, tx) => {
      const x = tx * TILE + 8, y = ty * TILE + 8;
      if (c === 'o') coins.push({ x, y, taken: false });
      if (c === 'S' || c === 'H') feet[c] = { x, y: y + 8 };
      if (c === 'F') { level.finishX = x; level.finishY = y + 8; }
      if (c >= '1' && c <= '9') {
        if (row[tx - 1] !== c && (rows[ty - 1] || '')[tx] !== c) {   // top-left tile of a mouth
          let h = 1;
          while ((rows[ty + h] || '')[tx] === c) h++;
          level.pipes.push({ tx, ty, h, to: -1, id: c });
        }
        return 'P';
      }
      return '#BC'.includes(c) ? c : '.';
    }));
    level.pipes.forEach((pipe, i) => pipe.to = level.pipes.findIndex((other, j) => j !== i && other.id === pipe.id));
    if (level.pipes.some(pipe => level.pipes.filter(other => other.id === pipe.id).length !== 2)) {
      throw new Error(`level ${levelIndex + 1}: every pipe digit needs exactly two pipes`);
    }

    const s = {
      levelIndex, tick: 0, phase: 'countdown', lostReason: null, stars: 0, level, tiles, bumps: [], coins, events: [],
      rng: seed | 0,
      player: {
        x: feet.S.x - 6, y: feet.S.y - 12, w: 12, h: 12, vx: 0, vy: 0, facing: -1, onGround: false,
        state: 'normal', stateT: 0, invuln: 0, lives: 3, coins: 0,
        coyote: 0, jumpBuf: 0, downBuf: 0, heldJump: false, heldDown: false, rising: false, kickCd: 0, pipe: 0,
      },
      hero: {
        x: feet.H.x - 6, y: feet.H.y - 26, w: 12, h: 26, vx: 0, vy: 0, facing: 1, onGround: false,
        state: 'wait', stateT: 0, invuln: 0, angry: 0, hearts: L.heroHearts, maxHearts: L.heroHearts, coins: 0,
        progress: 0, maxProgress: 0, say: null,
        speed: L.heroSpeed / 60, skill: L.heroSkill, startHearts: L.heroHearts, startX: feet.H.x - 6,
        safeX: feet.H.x - 6, safeY: feet.H.y - 26, dash: 0, rising: false,
        ai: { dir: 1, hold: 0, lock: 0, bestX: 0, stuck: 0, threat: 0, reactAt: 0, sees: false, atkCd: 0 },
      },
    };
    say(s, 'start');
    return s;
  }

  const solid = (s, tx, ty) => tx < 0 || tx >= s.level.w || ty >= 0 && ty < s.level.h && s.tiles[ty][tx] !== '.';

  // Gravity, then one axis at a time against the tiles. Speeds stay well under a tile per tick, so nothing tunnels.
  // Returns the tile the body hit with its head, if any.
  function move(s, e) {
    e.vy = Math.min(e.vy + GRAV, MAX_FALL);
    e.x += e.vx;
    const top = Math.floor(e.y / TILE), bottom = Math.floor((e.y + e.h - 0.01) / TILE);
    const side = Math.floor((e.vx > 0 ? e.x + e.w - 0.01 : e.x) / TILE);
    for (let ty = top; ty <= bottom; ty++) {
      if (solid(s, side, ty)) { e.x = e.vx > 0 ? side * TILE - e.w : (side + 1) * TILE; e.vx = 0; break; }
    }
    e.y += e.vy;
    e.onGround = false;
    const left = Math.floor(e.x / TILE), right = Math.floor((e.x + e.w - 0.01) / TILE);
    const mid = Math.floor((e.x + e.w / 2) / TILE);
    const ty = Math.floor((e.vy > 0 ? e.y + e.h - 0.01 : e.y) / TILE);
    // the tile over the middle of the body takes the hit when there is a choice
    const tx = solid(s, mid, ty) ? mid : solid(s, left, ty) ? left : solid(s, right, ty) ? right : null;
    if (tx === null) return null;
    if (e.vy > 0) { e.y = ty * TILE - e.h; e.vy = 0; e.onGround = true; return null; }
    e.y = (ty + 1) * TILE;
    e.vy = 0;
    return { tx, ty };
  }

  function addCoin(s, who, at) {
    const h = s.hero;
    emit(s, 'coin', at, { who: who === h ? 'hero' : 'player' });
    if (++who.coins % 10) return;
    if (who !== h) { if (who.lives < 5) { who.lives++; emit(s, 'life', who); } return; }
    if (h.hearts >= h.startHearts + 2) return;
    h.hearts++;
    h.maxHearts = Math.max(h.maxHearts, h.hearts);
    emit(s, 'heroHeart', h);
    say(s, 'heart');
  }

  // Any hero damage. True while he still has hearts left.
  function hurt(s) {
    const h = s.hero;
    h.hearts--;
    h.invuln = 90;
    h.angry = 180;
    emit(s, 'heroHurt', h, { hearts: h.hearts });
    if (h.hearts > 0) return true;
    s.phase = 'won';
    s.stars = h.maxProgress < 0.4 ? 3 : h.maxProgress < 0.7 ? 2 : 1;
    setState(h, 'ragequit');
    say(s, 'ragequit');
    emit(s, 'win', h);
    return false;
  }

  function lose(s, reason) {
    s.phase = 'lost';
    s.lostReason = reason;
    setState(s.hero, 'cheer');
    say(s, reason);
    emit(s, 'lose', s.hero, { reason });
  }

  // The mushroom is flattened ('squish') or fell ('playerPit'). Once the level is decided it costs nothing.
  function kill(s, type) {
    const p = s.player;
    emit(s, type, p);
    p.vx = p.vy = 0;
    if (s.phase === 'won' || s.phase === 'lost') return setState(p, 'squished');
    say(s, type);
    if (--p.lives > 0) return setState(p, 'squished');
    setState(p, 'dead');
    lose(s, 'lives');
  }

  // The mushroom sprouts on top of the ground about 11 tiles ahead of the hero, never past the finish
  function respawn(s) {
    const p = s.player, L = s.level;
    const want = Math.floor(Math.min(s.hero.x + 11 * TILE, L.finishX - 2 * TILE) / TILE);
    for (let d = 0; d < L.w; d++) {
      for (const tx of [want - d, want + d]) {
        const ty = s.tiles.findIndex((row, y) => y > 0 && row[tx] === '#' && s.tiles[y - 1][tx] === '.');
        if (ty < 0 || tx * TILE > L.finishX) continue;
        p.x = tx * TILE + 2;
        p.y = ty * TILE - p.h;
        setState(p, 'sprout');
        return emit(s, 'respawn', p);
      }
    }
  }

  // A block hit from below. A crate pays out once and coins lying on top go to whoever hit it.
  // The hero is big and breaks bricks; the mushroom only bumps them, which hurts a hero standing on top.
  function knock(s, hit, who) {
    const { tx, ty } = hit, c = s.tiles[ty][tx], at = { x: tx * TILE + 8, y: ty * TILE + 8 }, h = s.hero;
    if (c === '#' || c === 'P') return;
    if (c === 'C') { s.tiles[ty][tx] = 'U'; addCoin(s, who, at); }
    for (const coin of s.coins) {
      if (!coin.taken && coin.x === at.x && coin.y === at.y - TILE) { coin.taken = true; addCoin(s, who, coin); }
    }
    if (who === h && c === 'B') { s.tiles[ty][tx] = '.'; return emit(s, 'brickBreak', at, hit); }
    s.bumps.push({ tx, ty, t: 0 });
    if (who === h) return;
    emit(s, 'bump', at, hit);
    const onTop = h.onGround && h.y + h.h === ty * TILE && h.x < at.x + 8 && h.x + h.w > at.x - 8;
    if (onTop && h.state === 'run' && !h.invuln) {
      h.vy = -4.5;
      h.onGround = false;
      if (hurt(s)) say(s, 'bump');
    }
  }

  function stepPlayer(s, input) {
    const p = s.player, L = s.level;
    p.stateT++;
    if (p.invuln > 0) p.invuln--;
    if (p.kickCd > 0) p.kickCd--;
    p.jumpBuf = input.jump && !p.heldJump ? 7 : Math.max(0, p.jumpBuf - 1);   // the press tick plus 6 of buffering
    p.downBuf = input.down && !p.heldDown ? 8 : Math.max(0, p.downBuf - 1);
    p.heldJump = input.jump;
    p.heldDown = input.down;
    if (p.state === 'dead' || p.state === 'squished') {   // flattened in mid-air, the pancake still drops to the ground
      move(s, p);
      if (p.state === 'squished' && p.stateT >= 72) respawn(s);
      return;
    }
    if (p.state === 'sprout') { if (p.stateT >= 30) { setState(p, 'normal'); p.invuln = 90; } return; }
    if (p.state === 'pipe') {   // 12 ticks sinking in, 12 hidden, 12 rising out of the paired mouth
      const t = p.stateT, to = L.pipes[p.pipe];
      if (t <= 12) p.y++;
      else if (t === 24) { p.x = to.tx * TILE + 10; p.y = to.ty * TILE; emit(s, 'pipeOut', p); }
      else if (t > 24) { p.y--; if (t === 36) { setState(p, 'normal'); p.invuln = 30; } }
      return;
    }
    if (p.state === 'stunned' && p.stateT >= 24) setState(p, 'normal');
    const free = p.state === 'normal', dir = free ? (input.right ? 1 : 0) - (input.left ? 1 : 0) : 0;
    if (dir) { p.facing = dir; p.vx = clamp(p.vx + dir * (p.onGround ? 0.25 : 0.18), -P_SPEED, P_SPEED); }
    else if (p.onGround) p.vx -= clamp(p.vx, -0.12, 0.12);
    p.coyote = p.onGround ? 7 : Math.max(0, p.coyote - 1);   // 6 ticks of air in which a jump still counts
    if (free && p.onGround && p.downBuf) {
      const mid = p.x + p.w / 2;
      const from = L.pipes.find(pipe => pipe.ty * TILE === p.y + p.h && mid > pipe.tx * TILE + 3 && mid < pipe.tx * TILE + 29);
      if (from) {
        setState(p, 'pipe');
        p.pipe = from.to;
        p.x = from.tx * TILE + 10;
        p.vx = p.vy = p.downBuf = 0;
        return emit(s, 'pipeIn', p);
      }
    }
    if (free && p.jumpBuf && p.coyote) {
      p.vy = -P_JUMP;
      p.jumpBuf = p.coyote = 0;
      p.rising = true;
      emit(s, 'jump', p);
    }
    if (p.rising && (!input.jump || p.vy >= 0)) { p.rising = false; p.vy = Math.max(p.vy, -CUT); }
    const hit = move(s, p);
    if (hit) knock(s, hit, p);
    if (p.y > L.h * TILE + 16) kill(s, 'playerPit');
  }

  // One tick of the hero's body. Shared by the real hero and his lookahead ghost, so his predictions are exact.
  function heroTick(s, h, dir, jump) {
    const top = h.speed * (h.angry > 0 || h.dash > 0 ? 1.25 : 1);
    if (h.angry > 0) h.angry--;
    if (h.dash > 0) h.dash--;
    h.vx += clamp(dir * top - h.vx, -H_ACC, H_ACC);
    if (jump && h.onGround && !h.rising) { h.vy = -H_JUMP; h.rising = true; }   // one jump per press
    if (!jump && h.rising) { h.rising = false; h.vy = Math.max(h.vy, -CUT); }
    return move(s, h);
  }

  // How two overlapping bodies met: whoever comes down onto the other's top wins, anything else is a kick.
  // The hero has to be really falling to squish, so headbutting his boots on his way up is only a kick.
  function contact(p, h) {
    const v = p.vy - h.vy;
    if (v > 0 && p.y + p.h - h.y <= 8 + v) return 'stomp';
    if (v < 0 && h.vy > 0 && h.y + h.h - p.y <= 8 - v) return 'squish';
    return 'kick';
  }

  // Lookahead: play one plan about a second ahead on a copy of the hero. He keeps `dir` and the jump button until
  // he lands (or for `lock` ticks if he stays on the ground), then simply runs right.
  // `gain` is how many pixels the plan wins or loses against plain running, taken the last time his feet were
  // on the ground. `dead` means the committed part ends in a pit or never lands; later he would think again.
  function roll(s, dir, hold, lock = 8, dash = 0) {
    const g = { ...s.hero, dash: Math.max(s.hero.dash, dash) }, p = s.player;
    // the mushroom as he pictures it: staying put on the ground, steering to come down on his head in the air
    let q = p.state === 'normal' && !p.invuln && Math.abs(p.x - g.x) < 128 ? { ...p } : null;
    const coins = s.coins.filter(coin => !coin.taken && Math.abs(coin.x - g.x) < 128);
    const out = { dead: false, gain: 0, coins: 0, squish: false, stomped: false };
    let committed = true;
    for (let t = 0; t < 72; t++) {
      const was = g.onGround, hit = heroTick(s, g, committed ? dir : 1, hold-- > 0);
      if (g.y > s.level.h * TILE) break;
      if (g.onGround) { out.gain = g.x - s.hero.x - g.speed * (t + 1); if (!was || t >= lock) committed = false; }
      if (hit && s.tiles[hit.ty][hit.tx] === 'C') out.coins++;
      for (let i = coins.length; i--;) if (grabs(g, coins[i])) { coins.splice(i, 1); out.coins++; }
      if (!q) continue;
      if (!q.onGround) {
        const drop = g.y - q.y - q.h, eta = drop > 0 ? (Math.sqrt(q.vy * q.vy + 2 * GRAV * drop) - q.vy) / GRAV : 1;
        q.vx += clamp(clamp((g.x + g.vx * eta - q.x) / eta, -P_SPEED, P_SPEED) - q.vx, -0.18, 0.18);
        move(s, q);
      }
      if (overlap(q, g)) {
        const kind = contact(q, g);
        out.squish = kind === 'squish';
        out.stomped = kind === 'stomp' && g.invuln <= t;
        q = null;
      }
    }
    out.dead = committed;
    return out;
  }

  // The hero's brain: sets ai.dir and ai.hold for this tick
  function think(s) {
    const h = s.hero, ai = h.ai, skill = h.skill;
    if (!h.onGround) {
      // In the air he sticks to his plan and steers only to stay alive. That is why a baited jump can be punished.
      if (roll(s, ai.dir, ai.hold).dead) ai.dir = [1, 0, -1].find(dir => !roll(s, dir, ai.hold).dead) ?? ai.dir;
      return;
    }
    if (h.x > ai.bestX) { ai.bestX = h.x; ai.stuck = 0; }
    else if (++ai.stuck > 90) {
      // Going nowhere: jump on the spot (it may break a brick overhead) or back up for another go,
      // usually a few steps, now and then a long way, far enough to find a route he ran past
      ai.stuck = 30;
      ai.lock = 0;
      if (rnd(s) < 0.5) { ai.dir = 1; ai.hold = 30; return; }
      ai.dir = -1;
      ai.lock = 15 + rnd(s) ** 2 * 240 | 0;
    }
    if (ai.lock > 0) {   // committed to backing off, as long as that does not end in a pit
      ai.lock--;
      if (roll(s, ai.dir, 0, Math.min(ai.lock, 40)).dead) ai.dir = 0;
      return;
    }
    const res = PLANS.map(plan => roll(s, ...plan)), run = res[0];
    // A mushroom about to land on his head. He needs time to notice, sometimes never does, and after a dodge
    // he stops looking up for a moment, so a second try gets through.
    if (ai.threat < 0) ai.threat++;
    else if (!run.stomped) ai.threat = Math.max(0, ai.threat - 1);
    else if (ai.threat++ === 0) { ai.reactAt = 2 + (1 - skill) * 30 + rnd(s) * 10; ai.sees = rnd(s) < 0.25 + 0.65 * skill; }
    const alert = run.stomped && ai.sees && ai.threat >= ai.reactAt;
    // Now and then he decides to flatten a mushroom he could land on
    let attack = false;
    if (ai.atkCd > 0) ai.atkCd--;
    else if (res.some(r => r.squish)) { ai.atkCd = 50; attack = rnd(s) < 0.1 + 0.7 * skill; }
    // Pixels gained, a coin is worth a detour of 24, landing on the mushroom or not being landed on beats both
    const value = (r, i) => r.dead || i > 4 && !alert ? -1e9
      : r.gain + 24 * r.coins + (attack && r.squish ? 200 : 0) - (alert && r.stomped ? 200 : 0);
    let best = 0;
    res.forEach((r, i) => { if (value(r, i) > value(res[best], best) + 2) best = i; });
    if (alert && best > 0) ai.threat = -45;
    [ai.dir, ai.hold] = PLANS[best];
    if (best === 5) h.dash = 30;
    if (best === 6) ai.lock = 24;
    // every plan ends in a pit: stop at the edge, the stuck timer will shake him loose
    if (res[best].dead) ai.dir = ai.hold = 0;
  }

  function stepHero(s) {
    const h = s.hero, ai = h.ai, L = s.level;
    h.stateT++;
    if (h.invuln > 0) h.invuln--;
    if (h.say && --h.say.t <= 0) h.say = null;
    if (h.state === 'pit') {   // out of sight below the level, then back on the last safe ground
      if (h.stateT < 60) return;
      h.x = h.safeX; h.y = h.safeY; h.vx = h.vy = 0;
      setState(h, 'run');
      h.invuln = 60;
    }
    if (h.state === 'stunned' && h.stateT >= 42) setState(h, 'run');
    const running = h.state === 'run';
    if (running) think(s);
    const jump = running && ai.hold > 0;
    if (jump && h.onGround && !h.rising) emit(s, 'heroJump', h);
    const hit = heroTick(s, h, running ? ai.dir : 0, jump);
    if (ai.hold > 0) ai.hold--;
    if (hit) knock(s, hit, h);
    if (running && h.vx) h.facing = h.vx < 0 ? -1 : 1;
    if (h.y > L.h * TILE + 16) {
      if (s.phase === 'play') {
        emit(s, 'heroPit', h);
        if (hurt(s)) { setState(h, 'pit'); say(s, 'pit'); }
      }
      if (h.state !== 'pit') { h.x = h.safeX; h.y = h.safeY; h.vx = h.vy = 0; }
    }
    // remember where to come back to after a pit: ground with a little room on both sides
    const under = (h.y + h.h) / TILE;
    if (running && h.onGround && solid(s, Math.floor((h.x - 4) / TILE), under) && solid(s, Math.floor((h.x + h.w + 4) / TILE), under)) {
      h.safeX = h.x;
      h.safeY = h.y;
    }
    h.progress = clamp((h.x - h.startX) / (L.finishX - h.w / 2 - h.startX), 0, 1);
    h.maxProgress = Math.max(h.maxProgress, h.progress);
    if (s.phase === 'play' && h.progress >= 1) lose(s, 'finish');
  }

  function touch(s, input) {
    const p = s.player, h = s.hero, dizzy = h.state === 'stunned';
    if (s.phase !== 'play' || !overlap(p, h)) return;
    if (p.state !== 'normal' && p.state !== 'stunned' || h.state !== 'run' && !dizzy) return;
    const kind = contact(p, h);
    if (kind === 'stomp' && p.state === 'normal') {
      p.vy = input.jump ? -P_JUMP : -3.8;
      p.rising = !!input.jump;
      p.kickCd = 15;
      if (h.invuln > 0) return emit(s, 'jump', p);   // a blinking hero is only a springboard
      emit(s, 'stomp', p);
      if (hurt(s)) {
        setState(h, 'stunned');
        h.vx = h.onGround ? -2 : 0;   // slides back on the ground, drops like a stone in the air (into the pit, ideally)
        h.vy = Math.max(h.vy, 0);
        h.invuln = 132;
        h.angry = 222;
        say(s, 'stomp');
      }
    } else if (dizzy || p.invuln > 0) {
      return;
    } else if (kind === 'squish') {
      h.vy = -4;
      h.onGround = false;
      kill(s, 'squish');
    } else if (!p.kickCd) {
      p.vx = p.x + p.w / 2 < h.x + h.w / 2 ? -3 : 3;
      p.vy = -3.6;
      p.kickCd = 45;
      setState(p, 'stunned');
      emit(s, 'kick', p);
    }
  }

  function step(s, input) {
    const p = s.player, h = s.hero;
    s.events = [];
    if (s.phase === 'countdown') {
      if (s.tick === 180) { s.phase = 'play'; setState(h, 'run'); h.invuln = 60; emit(s, 'go', h); }   // no free stomp for camping on the start line
      else if (s.tick % 60 === 0) emit(s, 'countdown', h, { n: 3 - s.tick / 60 });
    }
    stepPlayer(s, input);
    stepHero(s);
    touch(s, input);
    for (const coin of s.coins) {
      if (coin.taken) continue;
      const who = (p.state === 'normal' || p.state === 'stunned') && grabs(p, coin) ? p
        : s.phase === 'play' && grabs(h, coin) ? h : null;
      if (who) { coin.taken = true; addCoin(s, who, coin); }
    }
    s.bumps = s.bumps.filter(bump => ++bump.t < 10);
    s.tick++;
  }

  return { TILE, VIEW_W, VIEW_H, clamp, create, step };
})();
