// node test.js
const fs = require('fs'), assert = require('assert');
const source = ['levels.js', 'game.js'].map(file => fs.readFileSync(__dirname + '/' + file, 'utf8')).join('\n');
const [Game, LEVELS] = new Function(source + '\nreturn [Game, LEVELS];')();
const idle = { left: false, right: false, jump: false, down: false };

// Left alone, the hero finishes every level without falling once, at his normal pace and at his angry sprint
// (jumps carry further when he sprints). The mushroom is taken out of play so it cannot get in his way.
LEVELS.forEach((level, i) => {
  for (const sprint of [false, true]) {
    const s = Game.create(i, 1), where = `level ${i + 1} ${level.name}${sprint ? ', sprinting' : ''}`;
    s.player.state = 'dead';
    while (s.phase === 'countdown' || s.phase === 'play') {
      if (sprint) s.hero.angry = 60;
      Game.step(s, idle);
      assert(s.tick < 60 * 100, `${where}: the hero is stuck near tile ${Math.floor(s.hero.x / 16)}`);
      assert(!s.events.some(e => e.type === 'heroPit'), `${where}: the hero fell into the pit near tile ${Math.floor(s.hero.x / 16)}`);
    }
    assert.equal(s.lostReason, 'finish', `${where}: the hero did not reach the finish`);
  }
});

// Every pipe takes the mushroom to the mouth of its pair, and there is room to stand there
LEVELS.forEach((level, i) => {
  const pipes = Game.create(i, 1).level.pipes;
  pipes.forEach((from, k) => {
    const s = Game.create(i, 1), p = s.player, to = pipes[from.to], where = `level ${i + 1} ${level.name}: pipe at tile ${from.tx},${from.ty}`;
    Object.assign(p, { x: from.tx * 16 + 10, y: from.ty * 16 - p.h, vx: 0, vy: 0 });
    Game.step(s, idle);
    Game.step(s, { ...idle, down: true });
    assert.equal(p.state, 'pipe', `${where} cannot be entered`);
    for (let t = 0; t < 40; t++) Game.step(s, idle);
    assert(p.state === 'normal' && p.onGround && p.y + p.h === to.ty * 16 && p.x >= to.tx * 16 && p.x + p.w <= to.tx * 16 + 32, `${where} does not come out at ${to.tx},${to.ty}`);
    assert(s.tiles[to.ty - 1][to.tx] === '.' && s.tiles[to.ty - 1][to.tx + 1] === '.', `${where}: the other mouth at ${to.tx},${to.ty} is blocked`);
  });
});

// A mushroom landing on his head costs him a heart
{
  const s = Game.create(0, 1), h = s.hero;
  for (let i = 0; i < 250; i++) Game.step(s, idle);   // countdown, then his blinking second at the start
  const hearts = h.hearts;
  Object.assign(s.player, { x: h.x + 8, y: h.y - 30, vx: 0, vy: 0, onGround: false });
  let stomped = false;
  for (let i = 0; i < 40 && !stomped; i++) {
    Game.step(s, idle);
    stomped = s.events.some(e => e.type === 'stomp');
  }
  assert(stomped, 'no stomp event');
  assert.equal(h.hearts, hearts - 1);
}

console.log('ok');
