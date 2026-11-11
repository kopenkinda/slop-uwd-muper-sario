// The loop, the keyboard, the screens, saved progress, and the feel: sim events become sound, shake and particles.
const App = (() => {
  const STEP = 1000 / 60, SAVE = 'gribnaya-mest';
  const { VIEW_W: W, VIEW_H: H, TILE, clamp } = Game, { PAPER, ORANGE, TEAL, GOLD, RED } = Render;
  const KEYS = {
    left: ['ArrowLeft', 'KeyA'], right: ['ArrowRight', 'KeyD'],
    jump: ['Space', 'ArrowUp', 'KeyW', 'KeyZ'], down: ['ArrowDown', 'KeyS'],
  };
  const OURS = new Set([...Object.values(KEYS).flat(), 'Enter', 'Escape', 'KeyP', 'KeyR', 'KeyM']);
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');

  const app = {
    screen: 'title',   // 'title' | 'intro' | 'play' | 'result' | 'ending'
    t: 0,              // ticks on this screen
    clock: 0,          // ticks since the page opened, for idle animation
    sim: null,         // the current Game state
    level: 0,          // the level chosen on the title, then the one being played
    paused: false, menu: 0,
    save: { unlocked: 1, stars: [], muted: false },
    cam: 0, look: 0,   // camera x in whole pixels, and its lead in the mushroom's facing direction
    shake: 0, freeze: 0, squash: 0, endT: 0,
    fx: [],            // particles and floating texts: { x, y, vx, vy, g, t, life } plus text, sprite, or color and size
    toast: null,
    keys: {}, taps: {}, input: {},
  };

  const rand = (a, b) => a + Math.random() * (b - a);
  // a tap shorter than one tick still counts as held for that tick
  const held = name => KEYS[name].some(code => app.keys[code] || app.taps[code]);

  function store() {
    try { localStorage.setItem(SAVE, JSON.stringify(app.save)); } catch (e) {}
  }

  function go(screen) {
    Object.assign(app, { screen, t: 0, paused: false, taps: {} });
    app.keys.Space = false;   // Space also confirms menus: that press must not turn into a jump
    if (screen === 'title' || screen === 'ending') Sfx.music('title');
  }

  function start(level, intro = true, seed = Date.now()) {
    const sim = Game.create(level, seed);
    Object.assign(app, { level, sim, fx: [], look: sim.player.facing * 40, shake: 0, freeze: 0, squash: 0, endT: 0, input: {} });
    camera(true);
    Sfx.music(null);   // every try starts the tune from the top
    Sfx.music(sim.level.theme);
    go(intro ? 'intro' : 'play');
  }

  function pause() {
    if (app.screen !== 'play' || app.paused) return;
    app.paused = true;
    app.menu = 0;
    Sfx.play('pause');
  }

  // Locked to the mushroom (the hero once the level is decided) plus a lead that eases one pixel per tick,
  // so everything stays on whole pixels and nothing shimmers. Far jumps (pipes, respawns) become a quick pan.
  function camera(snap) {
    const s = app.sim, done = s.phase === 'won' || s.phase === 'lost', who = done ? s.hero : s.player;
    app.look += Math.sign((done ? 0 : s.player.facing * 40) - app.look);
    const want = clamp(Math.round(who.x) + 6 - W / 2 + app.look, 0, s.level.w * TILE - W), d = want - app.cam;
    app.cam = snap ? want : app.cam + Math.sign(d) * Math.min(Math.abs(d), Math.max(6, Math.ceil(Math.abs(d) * 0.15)), 32);
  }

  const add = f => app.fx.push({ t: 0, vx: 0, vy: 0, g: 0, ...f });
  const float = (text, x, y, color, vx = 0) => add({ text, x, y, color, vx, vy: -0.5, life: 45 });
  // The hero's own numbers go in front of him (his speech bubble is behind) and keep up while he runs
  const heroFloat = (text, e, color) => {
    const h = app.sim.hero;
    float(text, e.x + h.facing * 24, Math.min(e.y - 30, H - 40), color, h.state === 'run' ? h.vx : 0);
  };
  function dust(x, y, n, color = PAPER) {
    for (let i = 0; i < n; i++) add({ x: x - 1, y: y - 2, vx: rand(-1, 1), vy: rand(-0.7, 0), life: rand(10, 18) | 0, size: 3, color });
  }
  function splash(x) {
    for (let i = 0; i < 8; i++) add({ x: x + rand(-6, 6), y: H - 2, vx: rand(-0.8, 0.8), vy: rand(-4, -2), g: 0.15, life: 30, size: 3, color: PAPER });
  }
  function burst(sprite, x, y, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = (i + Math.random()) / n * Math.PI * 2, v = rand(0.5, 1) * speed;
      add({ sprite, x: x - 4, y: y - 4, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, g: 0.12, life: 28 });
    }
  }

  // What each sim event looks like. x, y is the centre of the body or tile involved.
  const FEEL = {
    jump: () => { app.squash = -0.7; },
    stomp: e => { app.freeze = 4; app.shake = 8; app.squash = 1; burst('star', e.x, e.y + 6, 8, 3); },
    heroHurt: e => {
      heroFloat('-1 ♥', e, RED);
      // hurt through the floor he stands on: that has to land as hard as a stomp
      if (app.sim.events.some(o => o.type === 'bump')) { app.freeze = 4; app.shake = 8; burst('star', e.x, e.y + 13, 8, 3); Sfx.play('stomp'); }
    },
    squish: e => { app.freeze = 3; app.shake = 6; dust(e.x, e.y + 6, 8, ORANGE); },
    kick: e => { app.shake = 3; burst('twinkle', e.x, e.y, 4, 2); },
    bump: e => dust(e.x, e.y - 8, 3),
    brickBreak: e => { app.shake = 3; burst('debris', e.x, e.y, 6, 2.5); },
    coin: e => {
      if (e.who === 'player') float('+1', e.x, e.y - 14, GOLD);
      for (let i = 0; i < 3; i++) add({ sprite: 'twinkle', x: e.x + rand(-8, 5), y: e.y + rand(-8, 5), life: rand(10, 20) | 0 });
      // out of a crate: the coin itself pops up
      if (app.sim.tiles[e.y >> 4][e.x >> 4] === 'U') add({ sprite: 'coin_0', x: e.x - 6, y: e.y - 16, vy: -3, g: 0.2, life: 24 });
    },
    pipeIn: e => dust(e.x, e.y + 6, 4),
    pipeOut: e => dust(e.x, e.y - 6, 4),
    heroPit: e => { app.shake = 5; splash(e.x); },
    playerPit: e => splash(e.x),
    heroHeart: e => heroFloat('+1 ♥', e, TEAL),
    life: e => float('+1 ГРИБ', e.x, e.y - 18, ORANGE),
    respawn: e => dust(e.x, e.y + 6, 6, '#8a5a3c'),
    win: e => {
      const { save, level, sim } = app;
      app.freeze = 12;
      app.shake = 10;
      burst('star', e.x, e.y, 14, 4);
      Sfx.music(null);
      save.stars[level] = Math.max(save.stars[level] || 0, sim.stars);
      save.unlocked = clamp(level + 2, save.unlocked, LEVELS.length);
      store();
    },
    lose: () => Sfx.music(null),
  };

  function stepSim() {
    if (app.freeze > 0) {   // hit-stop: the world holds its breath, then the flattened mushroom springs off
      if (!--app.freeze && app.squash > 0) app.squash *= -0.8;
      return;
    }
    const s = app.sim, p = s.player, h = s.hero, was = { onGround: p.onGround, vy: p.vy, facing: p.facing };
    // behind the result card the mushroom stands still
    app.input = app.screen === 'play' ? { left: held('left'), right: held('right'), jump: held('jump'), down: held('down') } : {};
    app.taps = {};
    Game.step(s, app.input);
    for (const e of s.events) {
      Sfx.play(e.type === 'coin' && e.who === 'hero' ? 'heroCoin' : e.type);
      if (FEEL[e.type]) FEEL[e.type](e);
    }
    const feet = p.y + p.h;
    if (p.onGround && !was.onGround && was.vy > 1.5) { app.squash = Math.min(0.8, was.vy / 6); dust(p.x + 6, feet, 3); }
    if (p.onGround && p.facing !== was.facing && Math.abs(p.vx) > 0.8) dust(p.x + 6, feet, 2);
    if (h.angry > 0 && h.state === 'run' && s.tick % 10 === 0) {   // fuming
      add({ sprite: 'anger', x: h.x + rand(0, 7), y: h.y - 13, vx: h.vx, vy: -0.4, life: 18 });
    }
    app.squash = Math.abs(app.squash) < 0.05 ? 0 : app.squash * 0.8;
    if (app.shake > 0) app.shake--;
    camera();
    // let the ending play out before the card comes up
    if ((s.phase === 'won' || s.phase === 'lost') && ++app.endT === 90) go('result');
  }

  function tick() {
    app.clock++;
    app.t++;
    if (app.toast && --app.toast.t <= 0) app.toast = null;
    if (app.paused) return;
    if (app.screen === 'intro' && app.t >= 150) go('play');
    if (app.screen === 'play' || app.screen === 'result') stepSim();
    const pop = (app.t - 24) / 18;   // the stars on the win card arrive one by one, timed as in render.js
    if (app.screen === 'result' && pop >= 0 && pop < app.sim.stars && pop % 1 === 0) Sfx.play('star');
    for (const f of app.fx) { f.t++; f.x += f.vx; f.y += f.vy; f.vy += f.g; }
    app.fx = app.fx.filter(f => f.t < f.life);
  }

  function press(code) {
    const ok = code === 'Enter' || code === 'Space', esc = code === 'Escape';
    if (code === 'KeyM') {
      app.save.muted = !Sfx.muted;
      Sfx.setMuted(app.save.muted);
      store();
      app.toast = { text: app.save.muted ? 'ЗВУК ВЫКЛ' : 'ЗВУК ВКЛ', t: 70 };
    } else if (app.screen === 'title') {
      const next = clamp(app.level + KEYS.right.includes(code) - KEYS.left.includes(code), 0, app.save.unlocked - 1);
      if (next !== app.level || ok) Sfx.play('ui');
      app.level = next;
      if (ok) start(app.level);
    } else if (app.screen === 'intro') {
      go(esc ? 'title' : 'play');   // any key skips the card
    } else if (app.screen === 'ending') {
      if (ok || esc) go('title');
    } else if (app.screen === 'result') {
      const won = app.sim.phase === 'won';
      if (esc) go('title');
      else if (code === 'KeyR') start(app.level, false);
      else if (ok && app.t > 40) {   // a jump still being mashed must not dismiss the card
        Sfx.play('ui');
        if (!won) start(app.level, false);
        else if (app.level + 1 < LEVELS.length) start(app.level + 1);
        else go('ending');
      }
    } else if (code === 'KeyR') {
      start(app.level, false);
    } else if (!app.paused) {
      if (esc || code === 'KeyP') pause();
    } else if (esc || code === 'KeyP') {
      go('play');
    } else if (ok) {
      Sfx.play('ui');
      [() => go('play'), () => start(app.level, false), () => go('title')][app.menu]();   // same order as PAUSE in render.js
    } else {
      const move = KEYS.down.includes(code) - (code === 'ArrowUp' || code === 'KeyW');
      app.menu = (app.menu + move + 3) % 3;
      if (move) Sfx.play('ui');
    }
  }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;   // leave browser shortcuts alone
    if (OURS.has(e.code)) e.preventDefault();
    Sfx.unlock();
    if (e.repeat) return;
    app.keys[e.code] = app.taps[e.code] = true;
    press(e.code);
  });
  addEventListener('keyup', e => { app.keys[e.code] = false; });
  // Out of focus the key releases never arrive, so drop them and stop the game
  function away() {
    app.keys = {};
    pause();
  }
  addEventListener('blur', away);
  document.addEventListener('visibilitychange', () => { if (document.hidden) away(); });

  // The largest whole number of screen pixels per game pixel that fits the window
  function fit() {
    const dpr = devicePixelRatio || 1;
    const scale = Math.max(1, Math.floor(Math.min(innerWidth * dpr / W, innerHeight * dpr / H)));
    canvas.style.width = W * scale / dpr + 'px';
    canvas.style.height = H * scale / dpr + 'px';
  }
  addEventListener('resize', fit);
  fit();

  let last = performance.now(), acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(now - last, 100);   // a long stall is not replayed
    last = now;
    // On a 60 or 120 Hz screen a tick is a whole number of frames. Timer noise must not turn that into
    // an uneven 2, 0, 1, 2 ticks per frame, which shows as stutter: snap, and tick a hair early rather than late.
    const n = Math.round(STEP / dt);
    if (n && Math.abs(dt * n - STEP) < 1) dt = STEP / n;
    for (acc += dt; acc > STEP - 1; acc -= STEP) tick();
    Render.draw(ctx, app);
  }

  try { Object.assign(app.save, JSON.parse(localStorage.getItem(SAVE))); } catch (e) {}
  if (!Array.isArray(app.save.stars)) app.save.stars = [];
  app.save.unlocked = clamp(app.save.unlocked | 0, 1, LEVELS.length);
  app.level = app.save.unlocked - 1;
  Sfx.setMuted(app.save.muted);
  Sfx.music('title');
  ctx.imageSmoothingEnabled = false;
  requestAnimationFrame(frame);

  return Object.assign(app, { start, go, pause, tick });
})();
