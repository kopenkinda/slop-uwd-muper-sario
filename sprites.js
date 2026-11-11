// All pixel art, authored in code. One character per pixel, '.' is transparent, 'row*3' repeats a row.
// Characters face right and stand on the bottom row of their frame. Light comes from the top left.
const Sprites = (() => {
  // Master palette. The first six are the shared UI colours.
  const PAL = {
    k: '#1a1423', p: '#f6ecd4', o: '#e8772e', t: '#2a9d8f', y: '#f2c14e', r: '#d1495b',
    w: '#ffffff', l: '#c5c1cf', u: '#4d3346', // white, its shade, boot leather
    O: '#f7a653', d: '#b34a22', // cap light and shade
    e: '#ecd9a8', s: '#c8a873', f: '#8c6a4c', // stem, stem shade, flecks and dark wood
    g: '#7cb84a', G: '#3f7d3c', // leaf
    T: '#5fcfbd', D: '#1b6b68', // tracksuit light and shade
    Y: '#fbe38e', b: '#b9812c', // gold light and shade
    R: '#8c2a43', h: '#f4c39a', H: '#d6916a', // dark red, skin, skin shade
    c: '#b86f3f', C: '#e59c66', x: '#7b4129', // copper
    n: '#a36a3a', N: '#cf9756', // wood
  }
  // Tile colours per theme, palette chars 1..9: grass light, mid, dark, soil light, mid, dark, brick light, mid, dark.
  const RAMPS = {
    grove: '#b9cc5e #7fa63d #4e7a33 #b07f52 #8a5a3c #63402f #c97f72 #a2505a #5e2b3c',
    swamp: '#9db36a #6d8a4a #44603a #7a6a58 #5c4e45 #3f3636 #93a05f #667840 #34422a',
    night: '#5f8f7a #3f6d63 #2a4a4c #5a5f8a #40456e #2b2d50 #8a94c4 #5f69a0 #33386a',
    sunset: '#e8b05a #c07a48 #8a4a44 #8f5568 #6c3f5a #4a2a47 #9fb0c2 #6f8199 #3f4a66',
  }

  const ART = {
    // ---- the mushroom, in parts ----
    cap: `
      ..kk............
      .kggkkkkkkk.....
      .kgGgOOOOookk...
      ..kgGOOOoooodk..
      .kOOOoooooooodk.
      .kOOooooooooodk.
      kOoooooooooooddk
      kooooooooodddddk
      .kkkkkkkkkkkkkk.`,
    stem: `
      ...keeeeeeesk...*3
      ...kfeeeeeesk...
      ...kefeeeessk...
      ....kkkkkkkk....`,
    eyes: `
      .wk.wk*2`,
    eyes_up: `
      .wk.wk
      .ww.ww`,
    eyes_down: `
      .ww.ww
      .wk.wk`,
    eyes_ow: `
      k...k.
      .k.k..
      k...k.`,
    boot: `
      kuuk.
      kkkkk`,
    flat: `
      ...........kk...
      ..........kgGk..
      ...........kk...
      ...kkkkkkkkkk...
      .kkOOOoooooodkk.
      kOOooooooooooddk
      kkkkkkkkkkkkkkkk
      .keekekeekekeek.
      .keeekeeeekeeek.
      kukekekrrkekekuk
      kkkkkkkkkkkkkkkk`,
    dirt: `
      ..n..........f..
      .f.........n...f
      n.f..........n..`,

    // ---- the hero, in parts ----
    hair: `
      .....kkkk..
      ...kkYYyyk.
      .kkYYyyyybk
      kYYyyyyybbk
      kyyyyyyybk.
      kOooooook..
      koooooodk..`,
    f_smug: `
      kyhHhhHhk..
      kyHkhhkhhk.
      kbhhhhhhk..
      .kHkwwwkk..
      ..kHhhhk...`,
    f_mad: `
      kyrkkrkkk..
      kyRwrrwrrk.
      kbrrrrrrk..
      .kRkwwwkk..
      ..kRrrrk...`,
    f_yell: `
      kyrrrrrrk..
      kyRkkrkkrk.
      kbrrrrrrk..
      .kRkkkkrk..
      ..kkRRkk...`,
    f_grin: `
      kyhhhhhhk..
      kyHkkhkkhk.
      kbhhhhhhk..
      .kHkwwwkk..
      ..kHhhhk...`,
    f_dizzy: `
      kyhkwhwkk..
      kyHwkhkwhk.
      kbhhhhhhk..
      .kHhkrkhk..
      ..kHhhhk...`,
    tail_hang: `
      ......*2
      ....kk
      ...kok*2
      ..kodk
      ..kok.
      ...k..`,
    tail_fly0: `
      .kk...
      kookk.
      .kkook
      ..kokk
      ..kk..`,
    tail_fly1: `
      ..kk..
      ..kokk
      .kkook
      kookk.
      .kk...`,
    t_idle: `
      .......kHhk.....
      .....kkwwwtkk...
      ....kTTtttttk...
      ....kTwtttttkk..
      ....kTwkkkkkkkk.
      ....ktwwwwwwwhk.
      ....kDtttttthhk.
      .....kkkkkkkkk..
      .....kDttttk....
      .....kDDttDk....`,
    t_runA: `
      .......kHhk.....
      .....kkwwwtkk...
      ..kk.kTTttttk...
      .kDDkkTwttttkkk.
      .kDDDkTwwwwwthk.
      ..kHDkttttttthk.
      ...kkkDtttkkkkk.
      .....kDttttk....*2
      .....kDDttDk....`,
    t_runB: `
      .......kHhk.....
      .....kkwwwtkk...
      .....kTTttttkkk.
      ...kkkTwttttkDDk
      ..kttwwwttttkDHk
      .khhttttttttkkk.
      ..kkkkDtttttk...
      .....kDttttk....*2
      .....kDDttDk....`,
    t_front: `
      .kwttttkHhktttwk
      .kwttttwwwttttwk
      ..kkkTttDtttkkk.
      ....kTttDtttk...*3
      ....kDttDtttk...*3
      ....kDDDDDDDk...`,
    t_fists: `
      .......kHhk.....
      .kkkkTttwwtttkkk
      .kwtkTttDtttktwk*3
      .kwtkDttDtttktwk
      .khhkDttDtttkhhk
      .kkkkDttDtttkkkk
      ....kDttDtttk...
      ....kDDDDDDDk...`,
    arms_up: `
      ..kk.........kk.
      .khhk.......khhk*2
      .kwtk.......ktwk*3
      .kwttt......ttwk`,
    l_stand: `
      .....kDttttk....
      ....kDDttwtk....
      ....kDDktwtk....*6
      ...klllkwwwwk...
      ...klllklllllk..`,
    l_tap: `
      .....kDttttk....
      ....kDDttwtk....
      ....kDDktwtk....*6
      ...klllkwwwwwk..
      ...klllklllk....`,
    l_run0: `
      .....kDttttk....
      ....kDDttwtk....
      ...kDDkkttwtk...
      ..kDDk..kttwtk..
      ..kDDk...kttwtk.
      .kDDk.....ktwtk.
      .kDk......ktwtk.
      klk.......ktwtk.
      kllk......kwwwwk
      .kkk......kllllk`,
    l_run1: `
      .....kDttttk....
      .....ktwtDDk....
      .....ktwtkDDk...*2
      ..kk.ktwtkkk....
      .klllktwtk......
      ..kkkktwtk......
      .....ktwtk......
      .....kwwwwk.....
      .....klllllk....`,
    l_run2: `
      .....kDttttk....
      ....kttwtDDk....
      ...kttwtkkDDk...
      ..kttwtk..kDDk..
      ..ktwtk....kDDk.
      .ktwtk.....kDDk.*2
      kwwk.......kDDk.
      kwwwk......klllk
      .kkk.......klllk`,
    l_run3: `
      .....kDttttk....
      .....kDDttwtk...
      .....kDDkttwtk..*2
      .....kDDk.ktwtk.
      .....kDDk.kwwwk.
      .....kDDk.kwwwwk
      .....kDDk..kkkk.
      .....klllk......
      .....kllllk.....`,
    l_jump: `
      .....kDttttk....
      ....kDDttttwtk..
      ...kDDkkkktwtk..
      ..kDDk....ktwtk.
      .kDDk.....ktwtk.
      .kDk......kwwwk.
      klk.......kwwwwk
      kllk.......kkkk.
      .kk.............`,
    l_fall: `
      .....kDttttk....
      ....kDDkttwtk...
      ....kDDkkttwtk..
      ...kDDk.kttwtk..
      ...kDDk..ktwtk..*2
      ..kllk...kwwwk..
      ..klllk..kwwwwk.
      ...kkk....kkkk..`,
    l_front: `
      ....kDtttttDk...
      ....kwttkttwk...
      ....kwtk.ktwk...*6
      ...kwwwk.kwwwk..
      ...kllllkllllk..`,
    l_stomp: `
      ....kDtttttDk...
      ....kwttkttwk...
      ...kwttk.ktwk...
      ..kwttk..ktwk...
      ..kwtk...ktwk...
      ..kwwwk..ktwk...
      ..kllllk.ktwk...
      ...kkkk..ktwk...
      .........kwwwk..
      .........kllllk.`,
    squash: `
      ..kkkkkkkkkkkk..
      .kTtwttttttwttk.
      khtwttDDDDttwthk
      kkkwwwkkkkkwwwkk
      .kllllk..kllllk.`,
    twinkle: `
      kyk
      yYy
      kyk`,
    anger: `
      .r.r.
      rr.rr
      .....
      rr.rr
      .r.r.`,

    // ---- tiles (digits are theme colours) ----
    ground_top: `
      1111111111111111
      1121111112111121
      2222222222222222
      2232222232222322
      3233323332332333
      3663363663366336
      6556656556655665
      5555555555555555
      5555544555555555
      5555556555555555
      5555555555555555
      5555555555555665
      5565555555555555
      5555555555555555
      5555555554455555
      5555555555655555`,
    ground_fill: `
      5555555555555555
      5555555555445555
      5555555555565555
      5555555555555555
      5665555555555555
      5555555555555555
      5555554455555555
      5555555655555555
      5555555555555555
      5555555555555665
      5555555555555555
      5445555555555555
      5565555555555555
      5555555555555555
      5555555556655555
      5555555555555555`,
    brick: `
      7777777777777779
      7888888888888889*6
      9999999999999999
      7777777977777777
      8888888978888888*6
      9999999999999999`,
    crate: `
      kkkkkkkkkkkkkkkk
      kNNNNNNNNNNNNNnk
      kNnnnnnnnnnnnnfk
      kNnkkkkkkkkkknfk
      kNnkffkkkkffknfk
      kNnkfkYYyykfknfk
      kNnkkYYyyyykknfk
      kNnkkYybbyykknfk
      kNnkkyybbybkknfk
      kNnkkyyyybbkknfk
      kNnkfkybbbkfknfk
      kNnkffkkkkffknfk
      kNnkkkkkkkkkknfk
      kNnnnnnnnnnnnnfk
      knfffffffffffffk
      kkkkkkkkkkkkkkkk`,
    crate_used: `
      kkkkkkkkkkkkkkkk
      knnnnnnnnnnnnnfk
      knffffffffffffuk
      knfkkkkkkkkkkfuk
      knfkuuuuuuuukfuk
      knfkuukkkkuukfuk
      knfkukuuuukukfuk*4
      knfkuukkkkuukfuk
      knfkuuuuuuuukfuk
      knfkkkkkkkkkkfuk
      knffffffffffffuk
      kfuuuuuuuuuuuuuk
      kkkkkkkkkkkkkkkk`,
    pipe_mouth_l: `
      kkkkkkkkkkkkkkkk
      kCCCCCCCCCCCCCCC
      kcCCCCcccccccccc*2
      kcCCCCccCxccccCx
      kcCCCCccxxccccxx
      kcCCCCcccccccccc*2
      kxxxxxxxxxxxxxxx
      kkkkkkkkkkkkkkkk
      ..kuuuuuuuuuuuuu*2
      ..kcCCCccccccccc*4`,
    pipe_mouth_r: `
      kkkkkkkkkkkkkkkk
      CCCCCCCCCCccccck
      cccccccxxxxxxxxk*2
      ccccCxcxxxcxxxxk
      ccccxxcxxxxkxxxk
      cccccccxxxxxxxxk*2
      xxxxxxxxxxxxxxxk
      kkkkkkkkkkkkkkkk
      uuuuuuuuuuuuuk..*2
      cccccxxxxxxxxk..*4`,
    pipe_body_l: `
      ..kcCCCccccccccc*7
      ..kxxxxxxxxxxxxx
      ..kcCCCccccccccc
      ..kcCCCcCxccccCx
      ..kcCCCcxxccccxx
      ..kcCCCccccccccc*5`,
    pipe_body_r: `
      cccccxxxxxxxxk..*7
      xxxxxxxxxxxxxk..
      cccccxxxxxxxxk..
      ccccCxxxxxcxxk..
      ccccxxxxxxxkxk..
      cccccxxxxxxxxk..*5`,
    debris: `
      .78.
      7889
      8899
      .99.`,

    // ---- items and HUD ----
    coin_0: `
      ....kkkk....
      ..kkYYyykk..
      .kYYyyyyyyk.
      .kYyyyyyyyk.
      kYyybbbbyybk
      kYyybyyYyybk
      kyyybyyYyybk
      kyyyYYYYyybk
      .kyyyyyyybk.
      .kyyyyyybbk.
      ..kkybbbkk..
      ....kkkk....`,
    coin_1: `
      ....kkkk....
      ...kYyyyk...
      ..kYYyyyyk..
      ..kYyyyyyk..
      ..kYybbyyk..
      ..kYybYyyk..
      ..kyybYybk..
      ..kyyYYybk..
      ..kyyyyybk..
      ..kyyyybbk..
      ...kybbbk...
      ....kkkk....`,
    coin_2: `
      .....kk.....
      ....kYyk....*4
      ....kYbk....*2
      ....kybk....*4
      .....kk.....`,
    coin_3: `
      ....kkkk....
      ...kyyyYk...
      ..kyyyyYYk..
      ..kyyyyyYk..
      ..kyybbyYk..
      ..kyybYyYk..
      ..kbybYyyk..
      ..kbyYYyyk..
      ..kbyyyyyk..
      ..kbbyyyyk..
      ...kbbbyk...
      ....kkkk....`,
    heart: `
      .kk.kk..
      kwrkrrk.
      krrrrrk.
      krrrrRk.
      .krrRk..
      ..kRk...
      ...k....
      ........`,
    heart_empty: `
      .kk.kk..
      kuukuuk.
      kuuuuuk.*2
      .kuuuk..
      ..kuk...
      ...k....
      ........`,
    icon_shroom: `
      .gkkkk..
      kgGoodk.
      kOoooddk
      kkkkkkkk
      .kwkwkk.
      .keeesk.
      .kkkkkk.
      ........`,
    icon_hero: `
      ...kkk..
      .kkYyyk.
      kYyyybk.
      koooook.
      khkhkhk.
      khhhhk..
      .kkkk...
      ........`,
    icon_coin: `
      ..kkkk..
      .kYYyyk.
      kYyyyybk
      kYybbybk
      kyybYybk
      kyyyybbk
      .kybbbk.
      ..kkkk..`,
    icon_finish: `
      kkkkkkkk
      kppkkppk*2
      kkkppkkk*2
      kppkkppk*2
      kkkkkkkk`,
    arrow: `
      ....k...
      ....kk..
      kkkkkpk.
      kppppppk*2
      kkkkkpk.
      ....kk..
      ....k...`,
    star: `
      ...kk...
      ..kYyk..
      kkkYykkk
      kYyyyybk
      .kyyybk.*2
      kyykkybk
      kkk..kkk`,
    star_empty: `
      ...kk...
      ..kuuk..
      kkkuukkk
      kuuuuuuk
      .kuuuuk.*2
      kuukkuuk
      kkk..kkk`,
  }

  // Frames assembled from parts: [part, x, y], drawn in order.
  const shroom = (cap, stem, ax, ay, bx, by, eyes = 'eyes') => [['stem', 0, stem], [eyes, 5, stem + 2], ['cap', 0, cap], ['boot', ax, ay], ['boot', bx, by]]
  // hx leans the head forward, hy bobs head and torso, tx leans the torso
  const hero = (legs, torso, face, tail, hx = 1, hy = 0, tx = 0) =>
    [[legs, 0, 22], [torso, tx, 12 + hy], [tail, hx - 2, 3 + hy], ['hair', hx + 3, hy], [face, hx + 3, 7 + hy]].filter((p) => p[0])
  const armsUp = (legs, face, dy = 0) => hero(legs, 't_front', face, null, 1, dy).concat([['arms_up', 0, 5 + dy]])
  const run = (face, hx, hy, tx) => [0, 1, 2, 3].map((i) =>
    hero('l_run' + i, i < 2 ? 't_runB' : 't_runA', face, 'tail_fly' + i % 2, hx, hy + 1 - i % 2, tx))
  const FRAMES = {
    shroom_idle_0: shroom(1, 8, 3, 14, 9, 14),
    shroom_idle_1: shroom(2, 8, 3, 14, 9, 14),
    shroom_run_0: shroom(1, 8, 1, 13, 10, 14),
    shroom_run_1: shroom(0, 7, 4, 13, 8, 13),
    shroom_run_2: shroom(1, 8, 2, 14, 11, 13),
    shroom_run_3: shroom(2, 8, 2, 14, 10, 14),
    shroom_jump: shroom(0, 8, 5, 14, 8, 14, 'eyes_up'),
    shroom_fall: shroom(0, 8, 1, 14, 10, 14, 'eyes_down'),
    shroom_stunned: shroom(0, 8, 1, 13, 11, 14, 'eyes_ow'),
    shroom_squished: [['flat', 0, 5]],
    // sprouting: the boots are still underground, below the frame
    shroom_sprout_0: shroom(10, 17, 3, 16, 9, 16).concat([['dirt', 0, 13]]),
    shroom_sprout_1: shroom(6, 13, 3, 16, 9, 16, 'eyes_up').concat([['dirt', 0, 13]]),
    shroom_sprout_2: shroom(3, 10, 3, 16, 9, 16),
    shroom_duck: shroom(3, 10, 2, 14, 10, 14),
    hero_idle_0: hero('l_stand', 't_idle', 'f_smug', 'tail_hang'),
    hero_idle_1: hero('l_tap', 't_idle', 'f_smug', 'tail_hang', 1, 1),
    hero_jump: hero('l_jump', 't_runA', 'f_smug', 'tail_fly1', 2),
    hero_fall: armsUp('l_fall', 'f_smug'),
    hero_stunned: [['squash', 0, 27], ['hair', 4, 15], ['f_dizzy', 4, 22], ['twinkle', 0, 10], ['twinkle', 6, 7], ['twinkle', 12, 10]],
    hero_ragequit_0: armsUp('l_front', 'f_yell').concat([['anger', 0, 0]]),
    hero_ragequit_1: hero('l_stomp', 't_fists', 'f_yell', null, 1, 1).concat([['anger', 0, 1]]),
    hero_cheer_0: armsUp('l_front', 'f_grin'),
    hero_cheer_1: armsUp('l_front', 'f_grin').map(([n, x, y]) => [n, x, y - 2]).concat([['twinkle', 0, 0], ['twinkle', 13, 0]]),
  }
  run('f_smug', 2, 0, 0).forEach((f, i) => { FRAMES['hero_run_' + i] = f })
  run('f_mad', 2, 1, 1).forEach((f, i) => { FRAMES['hero_angry_' + i] = f })

  const cache = {}
  function canvas(w, h) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }
  const rect = (g, color, x, y, w, h) => { g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
  const rows = (part) => ART[part].trim().split(/\s+/).flatMap((r) => { const [row, n] = r.split('*'); return Array(+n || 1).fill(row) })

  function paint(g, pal, part, ox, oy) {
    rows(part).forEach((row, y, all) => {
      if (row.length !== all[0].length) throw new Error(`Sprites: ragged row ${y} in "${part}"`)
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '.') continue
        if (!pal[row[x]]) throw new Error(`Sprites: no colour "${row[x]}" in "${part}"`)
        rect(g, pal[row[x]], ox + x, oy + y, 1, 1)
      }
    })
  }

  // The arch is too regular to be worth 3000 hand-typed pixels.
  function finish(g) {
    const r = (c, x, y, w, h) => rect(g, PAL[c], x, y, w, h)
    for (const x of [2, 40]) {
      r('k', x, 8, 6, 53); r('n', x + 1, 8, 4, 53); r('N', x + 1, 8, 1, 53); r('f', x + 4, 8, 1, 53)
      for (let y = 34; y < 60; y += 10) r('f', x + 1, y, 4, 1)
      r('k', x - 2, 60, 10, 4); r('n', x - 1, 61, 8, 2); r('N', x - 1, 61, 8, 1)
      r('k', x, 2, 6, 6); r('y', x + 1, 3, 4, 4); r('Y', x + 1, 3, 2, 2); r('b', x + 3, 5, 2, 2)
    }
    for (let x = 0; x < 42; x++) { // the banner bows upward in the middle
      const top = 13 - Math.round(5 * (1 - ((x - 20.5) / 21) ** 2))
      r('k', x + 3, top - 1, 1, 17)
      if (x > 0 && x < 41) for (let y = 0; y < 15; y++) r(((x - 1) / 5 | 0) + (y / 5 | 0) & 1 ? 'k' : 'p', x + 3, top + y, 1, 1)
    }
  }

  // The theme only matters to tiles: nothing else uses the digit colours.
  function get(name, theme) {
    theme = theme || 'grove'
    const key = name + '/' + theme
    if (cache[key]) return cache[key]
    const parts = FRAMES[name] || (ART[name] && [[name, 0, 0]])
    if (!parts && name !== 'finish') throw new Error(`Sprites: no sprite named "${name}"`)
    if (!RAMPS[theme]) throw new Error(`Sprites: no theme named "${theme}"`)
    const pal = { ...PAL }
    RAMPS[theme].split(' ').forEach((color, i) => { pal[i + 1] = color })
    const [w, h] = name === 'finish' ? [48, 64] : !FRAMES[name] ? [rows(name)[0].length, rows(name).length] : name.startsWith('hero') ? [16, 32] : [16, 16]
    const c = canvas(w, h), g = c.getContext('2d')
    if (name === 'finish') finish(g)
    else for (const [part, x, y] of parts) paint(g, pal, part, x, y)
    return (cache[key] = c)
  }

  // ---- parallax backgrounds, drawn with hard-edged rectangles only ----
  let seed = 1
  const rnd = (a, b) => a + (seed = seed * 16807 % 2147483647) / 2147483647 * (b - a)
  function blob(g, color, cx, cy, rx, ry) {
    rx = Math.round(rx); ry = Math.round(ry)
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(1 - y * y / ((ry + .5) * (ry + .5))))
      rect(g, color, Math.round(cx) - half, Math.round(cy) + y, half * 2 + 1, 1)
    }
  }
  function line(g, color, x0, y0, x1, y1, t = 1) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) || 1
    for (let i = 0; i <= n; i++) rect(g, color, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, t, t)
  }
  const bands = (g, list) => { for (let i = 0; i < list.length; i += 2) rect(g, list[i], 0, list[i + 1], 384, 224) }
  function pine(g, color, x, base, h) {
    const tier = Math.max(6, h >> 3)
    for (let y = 0; y < h; y++) {
      const half = Math.round(h * .26 * (.12 + .88 * y / h) * (.45 + .55 * (y % tier) / tier))
      rect(g, color, x - half, base - h + y, half * 2 + 1, 1)
    }
  }
  function birch(g, x, base, h, w, [trunk, shade, mark, crown, light, dark]) {
    const top = base - h
    for (let i = 0; i < 5; i++) blob(g, dark, x + rnd(-13, 15), top + rnd(4, 20), rnd(8, 13), rnd(6, 9))
    rect(g, trunk, x, top, w, h); rect(g, shade, x + w - 1, top, 1, h)
    for (let y = top + 16; y < base; y += rnd(5, 13)) rect(g, mark, x + (rnd(0, 2) | 0) * (w - 2), y, 2, 1)
    for (let i = 0; i < 6; i++) blob(g, crown, x + rnd(-14, 14), top + rnd(-8, 10), rnd(7, 12), rnd(5, 8))
    for (let i = 0; i < 3; i++) blob(g, light, x + rnd(-12, 6), top + rnd(-10, 0), rnd(4, 7), rnd(2, 4))
  }
  function snag(g, color, x, base, h) {
    rect(g, color, x, base - h, 2, h); rect(g, color, x - 1, base - h * .45, 4, h * .45)
    for (let i = 0; i < 3; i++) {
      const y = base - h * rnd(.5, .95), dir = i % 2 ? 1 : -1, len = rnd(5, 12)
      line(g, color, x, y, x + dir * len, y - len * rnd(.5, 1))
      line(g, color, x + dir * len * .6, y - len * .5, x + dir * (len + 3), y - len * .4)
    }
  }
  function reeds(g, color, head, x0, x1, base, hmin, hmax) {
    for (let x = x0; x < x1; x += rnd(3, 9)) {
      const h = rnd(hmin, hmax), lean = rnd(-3, 3)
      line(g, color, x, base, x + lean, base - h)
      if (rnd(0, 3) < 1) rect(g, head, x + lean, base - h - 3, 2, 5)
    }
  }
  // Whatever crosses a layer's edge comes back in on the other side, so layers tile.
  function layer(w, h, parallax, y, seed0, draw) {
    const c = canvas(w, h), g = c.getContext('2d')
    for (const dx of [0, -w, w]) { seed = seed0; g.setTransform(1, 0, 0, 1, dx, 0); draw(g, w, h) }
    return { canvas: c, parallax, y }
  }

  const SCENES = {
    grove: () => [
      layer(384, 224, 0, 0, 1, (g) => {
        bands(g, ['#b6d3d1', 0, '#c4dcd2', 44, '#d6e5d1', 84, '#e6ebce', 120, '#f0ecca', 150])
        for (const [x, y, w] of [[40, 30, 70], [210, 54, 96], [150, 18, 40], [320, 96, 60]]) {
          rect(g, '#e9f1e6', x, y, w, 3); rect(g, '#e9f1e6', x + w * .2, y - 2, w * .5, 2); rect(g, '#e9f1e6', x + w * .1, y + 3, w * .6, 1)
        }
      }),
      layer(448, 120, .12, 104, 2, (g, w, h) => {
        for (let x = 0; x < w; x += rnd(7, 12)) blob(g, '#e3dba6', x, rnd(26, 38), rnd(8, 13), rnd(7, 11))
        rect(g, '#e3dba6', 0, 36, w, h)
        for (let x = 0; x < w; x += rnd(8, 14)) blob(g, '#d6cd92', x, rnd(48, 56), rnd(8, 12), rnd(6, 9))
        rect(g, '#d6cd92', 0, 56, w, h)
      }),
      layer(520, 224, .35, 0, 3, (g, w) => {
        rect(g, '#ccc98c', 0, 172, w, 60)
        for (let x = 20; x < w; x += rnd(44, 70)) birch(g, x, 176 + rnd(0, 8), rnd(96, 140), rnd(4, 6), ['#f0ead8', '#d3cbb6', '#8f877a', '#dfbf5a', '#ead17c', '#cfa946'])
        for (let i = 0; i < 16; i++) rect(g, i % 2 ? '#d9a441' : '#cf8f3d', rnd(0, w), rnd(70, 170), 2, 1) // drifting leaves
      }),
      layer(400, 74, .6, 150, 4, (g, w, h) => {
        for (let x = 0; x < w; x += rnd(10, 22)) blob(g, '#b9bf7e', x, rnd(28, 36), rnd(8, 15), rnd(6, 10))
        rect(g, '#b9bf7e', 0, 34, w, h); rect(g, '#99a065', 0, 46, w, h); rect(g, '#6d7449', 0, 56, w, h); rect(g, '#4c5236', 0, 66, w, h)
      }),
    ],
    swamp: () => [
      layer(384, 224, 0, 0, 1, (g) => {
        bands(g, ['#8ea39a', 0, '#9db0a2', 50, '#aebca9', 95, '#c0c9b1', 135, '#cdd2b9', 165])
        blob(g, '#bcc7b0', 290, 58, 20, 20); blob(g, '#dde1c9', 290, 58, 13, 13)
      }),
      layer(448, 120, .12, 104, 2, (g, w, h) => {
        for (let x = 0; x < w; x += rnd(9, 16)) blob(g, '#aab9a6', x, rnd(44, 52), rnd(9, 15), rnd(5, 8))
        rect(g, '#aab9a6', 0, 50, w, h)
        for (let x = 30; x < w; x += rnd(50, 90)) snag(g, '#aab9a6', x, 50, rnd(24, 40))
      }),
      layer(520, 224, .35, 0, 3, (g, w) => {
        for (let x = 30; x < w; x += rnd(60, 110)) snag(g, '#7d9185', x, 190, rnd(60, 110))
        rect(g, '#7d9185', 0, 182, w, 60)
        reeds(g, '#7d9185', '#6f8378', 0, w, 184, 6, 16)
        g.globalAlpha = .45
        rect(g, '#dfe4d0', 0, 150, w, 5); rect(g, '#dfe4d0', 0, 160, w, 9); rect(g, '#dfe4d0', 0, 174, w, 3)
        g.globalAlpha = 1
      }),
      layer(400, 80, .6, 144, 4, (g, w, h) => {
        reeds(g, '#52685b', '#44574b', 0, w, 54, 10, 34)
        rect(g, '#52685b', 0, 50, w, 4); rect(g, '#3b5049', 0, 52, w, h); rect(g, '#2f413c', 0, 64, w, h)
        for (let i = 0; i < 24; i++) rect(g, '#587067', rnd(0, w), 54 + i % 4 * 3, rnd(4, 12), 1)
      }),
    ],
    night: () => [
      layer(384, 224, 0, 0, 1, (g) => {
        bands(g, ['#141a36', 0, '#1a2242', 48, '#212c50', 92, '#29375e', 130, '#31426b', 160])
        for (let i = 0; i < 70; i++) rect(g, i % 3 ? '#8e9ac6' : '#dfe6ff', rnd(0, 384), rnd(0, 124), 1, 1)
        blob(g, '#232f58', 300, 44, 20, 20); blob(g, '#f0ecd0', 300, 44, 13, 13)
        blob(g, '#d6d2b4', 304, 40, 3, 2); blob(g, '#d6d2b4', 295, 49, 2, 2); blob(g, '#d6d2b4', 302, 52, 1, 1)
      }),
      layer(448, 120, .12, 104, 2, (g, w, h) => {
        for (let x = 0; x < w; x += rnd(6, 12)) pine(g, '#2a3962', x, 62, rnd(18, 40))
        rect(g, '#2a3962', 0, 58, w, h)
      }),
      layer(520, 224, .35, 0, 3, (g, w) => {
        for (let x = 10; x < w; x += rnd(22, 46)) pine(g, '#1e2a4b', x, 190, rnd(60, 120))
        rect(g, '#1e2a4b', 0, 184, w, 60)
      }),
      layer(400, 224, .6, 0, 4, (g, w) => {
        for (let x = 30; x < w; x += rnd(90, 150)) { pine(g, '#141b34', x, 200, rnd(130, 170)); rect(g, '#141b34', x - 2, 190, 5, 30) }
        rect(g, '#141b34', 0, 198, w, 40); rect(g, '#0e1326', 0, 208, w, 40)
      }),
    ],
    sunset: () => [
      layer(384, 224, 0, 0, 1, (g) => {
        bands(g, ['#3f305e', 0, '#5b3b6d', 40, '#7f4a74', 78, '#a85c70', 112, '#cf7763', 142, '#e39a5e', 164])
        blob(g, '#b93b4f', 118, 152, 27, 27); blob(g, '#d1495b', 118, 152, 21, 21)
        for (const [x, y, w] of [[70, 150, 100], [200, 60, 80], [20, 92, 60], [260, 124, 90]]) {
          rect(g, '#6d3f6e', x, y, w, 3); rect(g, '#6d3f6e', x + w * .25, y - 2, w * .5, 2)
        }
      }),
      layer(448, 120, .12, 104, 2, (g, w, h) => {
        for (let x = 0; x < w; x += rnd(8, 14)) blob(g, '#93506c', x, rnd(60, 68), rnd(8, 13), rnd(6, 10))
        for (let x = 0; x < w; x += rnd(30, 60)) pine(g, '#93506c', x, 70, rnd(20, 34))
        rect(g, '#93506c', 0, 66, w, h)
      }),
      layer(520, 224, .35, 0, 3, (g, w) => {
        rect(g, '#a35d6b', 0, 174, w, 60)
        for (let x = 20; x < w; x += rnd(50, 90)) {
          const h = rnd(70, 120), base = 178
          for (let i = 0; i < 44; i++) rect(g, '#74405f', x + i * 2, base + i * .4, 7, 2) // long shadow away from the sun
          if (rnd(0, 2) < 1) pine(g, '#5a3158', x, base, h)
          else { // an old pine: bare trunk, flat crown in layers, one low bough
            rect(g, '#5a3158', x, base - h, 3, h)
            for (let i = 0; i < 4; i++) blob(g, '#5a3158', x + 1 + rnd(-4, 4), base - h - 4 + i * 4, [9, 14, 16, 11][i] + rnd(0, 3), 3)
            line(g, '#5a3158', x + 1, base - h * .58, x + 13, base - h * .58 - 9, 2); blob(g, '#5a3158', x + 15, base - h * .58 - 10, 8, 3)
          }
        }
      }),
      layer(400, 34, .6, 190, 4, (g, w, h) => {
        reeds(g, '#3a2344', '#3a2344', 0, w, 8, 3, 9)
        rect(g, '#3a2344', 0, 6, w, h); rect(g, '#2a1936', 0, 18, w, h)
      }),
    ],
  }
  const scenes = {}
  function background(theme) {
    if (!SCENES[theme]) throw new Error(`Sprites: no theme named "${theme}"`)
    return scenes[theme] || (scenes[theme] = SCENES[theme]())
  }

  return { get, background }
})()
