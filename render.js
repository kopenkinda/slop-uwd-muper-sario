// Draws one frame from App and the sim state. It only reads them.
const Render = (() => {
  const { VIEW_W: W, VIEW_H: H, TILE: T, clamp } = Game;
  const INK = '#1a1423', PAPER = '#f6ecd4', ORANGE = '#e8772e', TEAL = '#2a9d8f', GOLD = '#f2c14e', RED = '#d1495b';
  const DIM = '#4d3346', GREY = '#a79fb0';   // quiet lines and secondary text on INK
  const TILES = { B: 'brick', C: 'crate', U: 'crate_used' };
  const PAUSE = ['ПРОДОЛЖИТЬ', 'ЗАНОВО (R)', 'В МЕНЮ'];   // same order as the actions in main.js
  let g;   // the context of the frame being drawn

  const rect = (color, x, y, w, h) => { g.fillStyle = color; g.fillRect(x, y, w, h); };
  const text = (str, x, y, opts) => Font.draw(g, str, x, y, opts);
  const centre = (str, y, opts) => text(str, W / 2, y, { align: 'center', ...opts });
  const over = s => s.phase === 'won' || s.phase === 'lost';
  // Text that has to read over any background: an INK outline all round
  function bold(str, x, y, opts = {}) {
    const k = opts.scale > 2 ? 2 : 1;
    for (let i = 0; i < 9; i++) if (i !== 4) text(str, x + (i % 3 - 1) * k, y + ((i / 3 | 0) - 1) * k, { ...opts, color: INK });
    text(str, x, y, opts);
  }
  const boldCentre = (str, y, opts) => bold(str, W / 2, y, { align: 'center', ...opts });

  // Top-left at x, y. flip mirrors it, w and h stretch it.
  function spr(name, x, y, flip, theme, w, h) {
    const img = Sprites.get(name, theme);
    w = w || img.width;
    h = h || img.height;
    if (!flip) return g.drawImage(img, x, y, w, h);
    g.save();
    g.translate(x + w, y);
    g.scale(-1, 1);
    g.drawImage(img, 0, 0, w, h);
    g.restore();
  }

  function box(x, y, w, h, fill = INK, edge = PAPER) {
    rect(edge, x + 1, y, w - 2, h);
    rect(edge, x, y + 1, w, h - 2);
    rect(fill, x + 1, y + 1, w - 2, h - 2);
  }

  function dim(alpha) {
    g.globalAlpha = alpha;
    rect(INK, 0, 0, W, H);
    g.globalAlpha = 1;
  }

  function backdrop(theme, cam) {
    for (const layer of Sprites.background(theme)) {
      const w = layer.canvas.width;
      for (let x = -(Math.round(cam * layer.parallax) % w); x < W; x += w) g.drawImage(layer.canvas, x, layer.y);
    }
  }

  // The arch, with the banner between the posts rippling one pixel column at a time
  function finish(x, y, clock) {
    const img = Sprites.get('finish');
    g.drawImage(img, 0, 0, 8, 64, x, y, 8, 64);
    g.drawImage(img, 40, 0, 8, 64, x + 40, y, 8, 64);
    for (let i = 8; i < 40; i++) {
      const wave = Math.round(Math.sin(clock * 0.12 - i * 0.4) * 2 * Math.sin((i - 8) / 31 * Math.PI));
      g.drawImage(img, i, 0, 1, 64, x + i, y + wave, 1, 64);
    }
  }

  function heroSprite(s, clock) {
    const h = s.hero;
    if (h.state === 'stunned') return 'hero_stunned';
    if (h.state === 'ragequit' || h.state === 'cheer') return `hero_${h.state}_${h.stateT / 10 & 1}`;
    if (h.state === 'wait') return 'hero_idle_' + (clock / 24 & 1);
    if (!h.onGround) return h.vy < 0 ? 'hero_jump' : 'hero_fall';
    if (Math.abs(h.vx) < 0.2) return 'hero_idle_0';
    const i = Math.floor(h.x / 6) & 3;   // the stride follows the distance covered
    return (h.angry > 0 ? 'hero_angry_' : 'hero_run_') + (h.vx < 0 ? 3 - i : i);
  }

  function shroomSprite(app) {
    const s = app.sim, p = s.player;
    if (p.state === 'stunned') return 'shroom_stunned';
    if (p.state === 'squished' || p.state === 'dead') return 'shroom_squished';
    if (p.state === 'sprout') return 'shroom_sprout_' + Math.min(2, p.stateT / 10 | 0);
    if (p.state === 'pipe') return p.stateT < 24 ? 'shroom_duck' : 'shroom_jump';
    if (!p.onGround && s.tick) return p.vy < 0 ? 'shroom_jump' : 'shroom_fall';   // a fresh sim has not landed anyone yet
    if (Math.abs(p.vx) > 0.3) {
      const i = Math.floor(p.x / 8) & 3;
      return 'shroom_run_' + (p.vx < 0 ? 3 - i : i);
    }
    if (app.input.down) return 'shroom_duck';
    return 'shroom_idle_' + (app.clock % 170 < 7 ? 1 : 0);
  }

  // Invulnerable bodies flicker, but never vanish: the eye has to be able to follow them
  const flicker = (e, state) => e.state === state && e.invuln % 6 > 2 ? 0.35 : 1;

  function shroom(app) {
    const p = app.sim.player;
    if (p.state === 'pipe' && p.stateT > 11 && p.stateT < 24) return;   // inside the pipe
    // squash and stretch around the feet
    const q = p.state === 'normal' ? app.squash : 0;
    const w = Math.round(16 * (1 + 0.3 * q)), h = Math.round(16 * (1 - 0.3 * q));
    g.globalAlpha = flicker(p, 'normal');
    spr(shroomSprite(app), Math.round(p.x) + 6 - (w >> 1), Math.round(p.y) + 12 - h, p.facing < 0, null, w, h);
    g.globalAlpha = 1;
  }

  function world(app) {
    const s = app.sim, L = s.level, theme = L.theme, cam = app.cam, p = s.player, h = s.hero, c = app.clock;
    backdrop(theme, cam);
    g.save();
    g.translate(-cam + Math.round(Math.sin(c * 2.3) * app.shake / 2), Math.round(Math.cos(c * 3.1) * app.shake / 2));
    finish(L.finishX - 24, L.finishY - 64, c);
    if (p.state === 'pipe') shroom(app);   // behind the pipe it is travelling through
    // One spare column each side and one spare row below for the shake: past the level's edges its last tiles repeat
    const tx0 = (cam >> 4) - 1, tx1 = (cam + W >> 4) + 1;
    for (let ty = 0; ty <= L.h; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const col = clamp(tx, 0, L.w - 1), t = s.tiles[Math.min(ty, L.h - 1)][col];
        if (t === '.' || t === 'P') continue;
        const name = TILES[t] || (ty && s.tiles[ty - 1][col] === '#' ? 'ground_fill' : 'ground_top');
        const bump = s.bumps.find(b => b.tx === tx && b.ty === ty);
        spr(name, tx * T, ty * T - (bump ? Math.round(Math.sin(bump.t / 10 * Math.PI) * 5) : 0), false, theme);
      }
    }
    for (const pipe of L.pipes) {
      if (pipe.tx < tx0 - 1 || pipe.tx > tx1) continue;
      for (let i = 0; i < pipe.h; i++) {
        const part = i ? 'pipe_body_' : 'pipe_mouth_', y = (pipe.ty + i) * T;
        spr(part + 'l', pipe.tx * T, y);
        spr(part + 'r', pipe.tx * T + T, y);
      }
    }
    for (const coin of s.coins) {
      if (!coin.taken && coin.x > cam - 8 && coin.x < cam + W + 8) spr('coin_' + ((c >> 3) + (coin.x >> 4) & 3), coin.x - 6, coin.y - 6);
    }
    heroMarks(app);   // under the characters: a bubble must never hide the mushroom
    g.globalAlpha = flicker(h, 'run');
    spr(heroSprite(s, c), Math.round(h.x) - 2, Math.round(h.y) - 6, h.facing < 0);
    g.globalAlpha = 1;
    if (p.state !== 'pipe') shroom(app);
    for (const f of app.fx) {
      const x = Math.round(f.x), y = Math.round(f.y), left = f.life - f.t;
      if (f.text) bold(f.text, x, y, { color: f.color, align: 'center' });
      else if (f.sprite) { if (left > 8 || f.t & 1) spr(f.sprite, x, y, false, theme); }
      else {   // a puff: an outlined square that shrinks away
        const size = Math.ceil(f.size * left / f.life);
        if (size > 1) rect(INK, x - 1, y - 1, size + 2, size + 2);
        rect(f.color, x, y, size, size);
      }
    }
    g.restore();
  }

  // The hero's speech bubble, and an arrow at the screen edge when he is out of sight. World coordinates.
  function heroMarks(app) {
    const h = app.sim.hero, cam = app.cam, x = Math.round(h.x) + 6, side = x < cam - 6 ? -1 : x > cam + W + 6 ? 1 : 0;
    const ay = clamp(Math.round(h.y) + 9, 20, H - 34);
    if (side) {
      const nudge = app.clock >> 3 & 1;
      spr('arrow', cam + (side < 0 ? 2 - nudge : W - 10 + nudge), ay, side < 0);
      spr('icon_hero', cam + (side < 0 ? 12 : W - 20), ay);
    }
    if (!h.say) return;
    const w = Font.measure(h.say.text) + 9;
    // behind his head, out of the way of what is coming at him and of a mushroom bouncing off it
    const bx = side < 0 ? cam + 23 : side > 0 ? cam + W - 23 - w : clamp(h.facing > 0 ? x - 8 - w : x + 8, cam + 2, cam + W - w - 2);
    const by = side ? ay - 3 : clamp(Math.round(h.y) - 25, 18, H - 30);
    box(bx, by, w, 13, PAPER, INK);
    if (!side) {   // the tail points at his head
      const tx = clamp(x - h.facing * 11, bx + 4, bx + w - 5);
      rect(INK, tx - 2, by + 12, 5, 1); rect(INK, tx - 1, by + 13, 3, 1); rect(INK, tx, by + 14, 1, 1);
      rect(PAPER, tx - 1, by + 12, 3, 1); rect(PAPER, tx, by + 13, 1, 1);
    }
    text(h.say.text, bx + 5, by + 3, { color: INK });
  }

  function hud(app) {
    const s = app.sim, h = s.hero, p = s.player;
    rect(INK, 0, 0, W, 15);
    rect(DIM, 0, 14, W, 1);   // an edge, or the bar melts into a night sky
    // the hero: hearts, and coins toward his next heart
    spr('icon_hero', 3, 3);
    for (let i = 0; i < h.maxHearts; i++) spr(i < h.hearts ? 'heart' : 'heart_empty', 13 + i * 8, 3);
    const cx = 16 + h.maxHearts * 8;
    spr('icon_coin', cx, 3);
    text(h.coins % 10 + '/10', cx + 10, 4);
    // the mushroom: lives, and coins toward the next life
    spr('icon_shroom', 320, 3);
    text('×' + p.lives, 330, 4);
    spr('icon_coin', 348, 3);
    text(p.coins % 10 + '/10', W - 3, 4, { align: 'right' });
    // the race: how far he has got, where the stars run out, where the two of them are now
    const x0 = 126, len = 172, at = k => x0 + Math.round(len * k);
    rect(DIM, x0, 7, len, 2);
    rect(TEAL, x0, 7, at(h.maxProgress) - x0, 2);
    rect(GOLD, at(0.4), 5, 1, 6);
    rect(GOLD, at(0.7), 5, 1, 6);
    spr('icon_finish', x0 + len + 2, 3);
    let hx = at(h.progress) - 4, px = at(clamp(p.x / s.level.finishX, 0, 1)) - 4;
    if (Math.abs(px - hx) < 8) {   // side by side instead of one hiding the other
      const mid = (hx + px) >> 1, d = px < hx ? -4 : 4;
      hx = mid - d;
      px = mid + d;
    }
    spr('icon_hero', hx, 3);
    spr('icon_shroom', px, 3);
    if (p.y < 12 && p.state === 'normal') bold('↑', Math.round(p.x) + 6 - app.cam, 17, { color: ORANGE, align: 'center' });   // jumped out of view
  }

  function hint(s) {
    const near = s.level.hints.find(tip => Math.abs(s.player.x - tip.x) < 96);
    if (!near || over(s)) return;
    const w = Font.measure(near.text) + 13;
    box(W - w >> 1, 203, w, 15);
    centre(near.text, 207);
  }

  function countdown(s) {
    const f = s.tick % 60, big = f < 4;
    if (s.phase === 'countdown') {
      if (f < 45) boldCentre(3 - (s.tick / 60 | 0), big ? 44 : 48, { scale: big ? 7 : 6, color: GOLD });
    } else if (s.phase === 'play' && s.tick < 225) {
      boldCentre('ПОШЕЛ!', 56, { scale: 4, color: ORANGE });
    }
  }

  function intro(app) {
    const L = app.sim.level;
    rect(INK, 0, 36, W, 58);
    rect(ORANGE, 0, 38, W, 1);
    rect(ORANGE, 0, 91, W, 1);
    centre(`УРОВЕНЬ ${app.level + 1}. ${L.name}`, 50, { scale: 2, color: ORANGE });
    centre(L.hint, 74);
  }

  function pause(app) {
    dim(0.6);
    box(126, 58, 132, 100);
    centre('ПАУЗА', 68, { scale: 2, color: GOLD });
    PAUSE.forEach((item, i) => {
      const on = i === app.menu, y = 94 + i * 13;
      if (on) text('→', 150, y, { color: ORANGE });
      text(item, 162, y, { color: on ? ORANGE : PAPER });
    });
    centre('↑ ↓ ВЫБОР   ENTER ОК', 142, { color: GREY });
  }

  // Above or below the hero, whichever leaves his tantrum or victory dance in view
  function result(app) {
    const s = app.sim, h = s.hero, t = app.t, y = h.y + h.h > 136 ? 20 : 136;
    dim(0.35);
    box(48, y, 288, 84);
    if (s.phase === 'won') {
      centre('ГЕРОЙ СДАЛСЯ', y + 8, { scale: 2, color: GOLD });
      for (let i = 0; i < 3; i++) {   // the stars arrive one by one, each with a pop
        const since = t - 24 - i * 18, got = i < s.stars && since >= 0, size = got && since < 5 ? 24 : 16;
        spr(got ? 'star' : 'star_empty', 160 + i * 32 - (size >> 1), y + 36 - (size >> 1), false, null, size, size);
      }
      centre(`ОН ПРОШЕЛ ${Math.floor(h.maxProgress * 100)}% УРОВНЯ. МОНЕТ УКРАДЕНО: ${s.player.coins}`, y + 53);
    } else {
      centre(s.lostReason === 'finish' ? 'ГЕРОЙ ПРОШЕЛ УРОВЕНЬ.\nКАК ОБЫЧНО.' : 'ГРИБЫ КОНЧИЛИСЬ.\nВЫРАСТУТ НОВЫЕ.', y + 8, { scale: 2, color: RED });
      const label = 'У НЕГО ОСТАЛОСЬ', lw = Font.measure(label), x = W - lw - 4 - h.hearts * 8 >> 1;
      text(label, x, y + 53);
      for (let i = 0; i < h.hearts; i++) spr('heart', x + lw + 5 + i * 8, y + 52);
    }
    if (t > 40) centre(s.phase === 'won' ? 'ENTER ДАЛЬШЕ   R ЕЩЕ РАЗ   ESC МЕНЮ' : 'ENTER ЕЩЕ РАЗ   ESC МЕНЮ', y + 69, { color: GREY });
  }

  function ending(app) {
    const hop = Math.round(Math.abs(Math.sin(app.clock * 0.1)) * 10);
    dim(0.6);
    box(40, 24, 304, 176);
    spr(hop > 5 ? 'shroom_jump' : 'shroom_idle_0', 176, 46 - hop, false, null, 32, 32);
    centre('ИГРА ПРОЙДЕНА', 84, { scale: 3, color: GOLD });
    centre('КАПИТАН СКОК УШЕЛ В ШАХМАТЫ.\nТАМ ГРИБОВ НЕТ.', 118);
    const stars = app.save.stars.reduce((sum, n) => sum + (n || 0), 0);
    centre(`★ ${stars} ИЗ ${LEVELS.length * 3}`, 150, { color: GOLD });
    centre('ENTER В МЕНЮ', 178, { color: GREY });
  }

  function title(app) {
    const c = app.clock, cam = c >> 1, save = app.save, n = LEVELS.length;
    backdrop('grove', cam);
    for (let x = -(cam % T); x < W; x += T) {
      spr('ground_top', x, 192);
      spr('ground_fill', x, 208);
    }
    // the hero jogs past again and again, the mushroom hops along
    spr('hero_run_' + (c / 6 & 3), Math.round((c * 0.9 + 140) % 640) - 80, 160);
    const hop = c % 44 / 44;
    spr(hop < 0.1 ? 'shroom_run_3' : hop < 0.55 ? 'shroom_jump' : 'shroom_fall', 150, 176 - Math.round(Math.sin(hop * Math.PI) * 20));

    boldCentre('ГРИБНАЯ МЕСТЬ', 14, { scale: 4, color: ORANGE });
    boldCentre('ПЛАТФОРМЕР, О КОТОРОМ НИКТО НЕ ПРОСИЛ', 51);
    const x0 = W - n * 48 + 8 >> 1;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 48, on = i === app.level, locked = i >= save.unlocked;
      box(x, 68, 40, 36, INK, on ? ORANGE : DIM);
      if (locked) {
        rect(DIM, x + 15, 86, 10, 8);
        rect(DIM, x + 17, 80, 6, 2);
        rect(DIM, x + 16, 81, 2, 5);
        rect(DIM, x + 22, 81, 2, 5);
        continue;
      }
      text(i + 1, x + 20, 73, { scale: 2, align: 'center', color: on ? ORANGE : PAPER });
      for (let j = 0; j < 3; j++) spr(j < (save.stars[i] || 0) ? 'star' : 'star_empty', x + 7 + j * 9, 92);
    }
    // arrows only where there is another open level to go to
    boldCentre(`${app.level ? '←' : ' '} УРОВЕНЬ ${app.level + 1}. ${LEVELS[app.level].name} ${app.level < save.unlocked - 1 ? '→' : ' '}`, 111);
    if (c % 60 < 40) boldCentre('ENTER: ИГРАТЬ', 124, { color: GOLD });
    centre('← → БЕЖАТЬ   ПРОБЕЛ ПРЫГАТЬ   ↓ В ТРУБУ', 199, { shadow: INK });
    centre(`P ПАУЗА   R ЗАНОВО   M ЗВУК: ${Sfx.muted ? 'ВЫКЛ' : 'ВКЛ'}`, 210, { shadow: INK });
  }

  function draw(ctx, app) {
    g = ctx;
    if (app.screen === 'title') {
      title(app);
    } else {
      world(app);
      hud(app);
      if (app.screen === 'intro') intro(app);
      else if (app.screen === 'result') result(app);
      else if (app.screen === 'ending') ending(app);
      else {
        hint(app.sim);
        countdown(app.sim);
        if (app.paused) pause(app);
      }
    }
    if (app.toast && app.screen !== 'title') {   // the title shows the sound setting itself
      const w = Font.measure(app.toast.text) + 13;
      box(W - w >> 1, 20, w, 15);
      centre(app.toast.text, 24);
    }
  }

  return { draw, PAPER, ORANGE, TEAL, GOLD, RED };
})();
