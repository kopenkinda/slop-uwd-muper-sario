// Sfx: every sound in the game, synthesised with WebAudio. Nothing is created until unlock().
const Sfx = (() => {
  let ctx = null, master, bus, noise
  let muted = false
  let theme = null, song, out = null, step, nextT, timer

  // Effect voices: [wave, start s, length s, level, from Hz, to Hz = from, hold = 0].
  // wave is an oscillator type, or a filter type for filtered noise (Hz is then the cutoff).
  // A string in place of "from Hz" is a phrase with one token per length, see parse().
  // The tables have no prototype, so any unknown name looks up as undefined.
  const FX = {
    __proto__: null,
    jump: [['square', 0, 0.13, 0.09, 330, 700, 0.3]],
    heroJump: [['triangle', 0, 0.18, 0.16, 140, 330], ['square', 0, 0.12, 0.035, 140, 280]],
    stomp: [
      ['triangle', 0, 0.2, 0.36, 240, 45], ['lowpass', 0, 0.08, 0.42, 3000, 200], // thud and slap
      ['square', 0.05, 0.07, 0.08, 600, 1700, 0.5], ['square', 0.12, 0.11, 0.07, 1700, 1000], // squeak up and back
    ],
    squish: [['lowpass', 0, 0.2, 0.5, 1500, 120], ['sawtooth', 0, 0.32, 0.1, 230, 50], ['triangle', 0.1, 0.34, 0.2, 311, 139]],
    kick: [['bandpass', 0, 0.07, 0.4, 2200, 900], ['square', 0, 0.08, 0.09, 320, 110]],
    bump: [['triangle', 0, 0.1, 0.27, 160, 70], ['lowpass', 0, 0.04, 0.3, 700, 300]],
    brickBreak: [['lowpass', 0, 0.25, 0.28, 6000, 500, 0.15], ['bandpass', 0.04, 0.2, 0.3, 1400, 500], ['square', 0, 0.1, 0.06, 200, 60]],
    coin: [['square', 0, 0.07, 0.07, 1175, 1175, 0.6], ['square', 0.07, 0.3, 0.06, 1976], ['triangle', 0.07, 0.3, 0.1, 1976]],
    heroCoin: [['triangle', 0, 0.07, 0.15, 494, 494, 0.6], ['triangle', 0.07, 0.25, 0.15, 370], ['square', 0.07, 0.2, 0.03, 370]],
    pipeIn: [['bandpass', 0, 0.5, 0.4, 2600, 250, 0.4], ['triangle', 0, 0.5, 0.13, 520, 110, 0.4]],
    pipeOut: [['bandpass', 0, 0.45, 0.4, 250, 2600, 0.4], ['triangle', 0, 0.45, 0.13, 110, 520, 0.4]],
    heroPit: [['triangle', 0, 0.9, 0.2, 1500, 160, 0.5], ['square', 0, 0.9, 0.03, 1500, 160, 0.5]],
    playerPit: [['square', 0, 0.4, 0.1, 620, 110, 0.3]],
    heroHeart: [['sawtooth', 0, 0.09, 0.07, 'e3 e3 g3 . a#3 . . .'], ['triangle', 0, 0.09, 0.16, 'e2 . . . a#2 . . .']],
    life: [['square', 0, 0.065, 0.08, 'a5 c#6 e6 a6 . e6 a6 . .'], ['triangle', 0, 0.065, 0.15, 'a4 . . . . c#5 e5 . .']],
    respawn: [['triangle', 0, 0.09, 0.24, 180, 900], ['highpass', 0, 0.03, 0.1, 5000]],
    countdown: [['square', 0, 0.12, 0.09, 523, 523, 0.7]],
    go: [['square', 0, 0.4, 0.09, 1047, 1047, 0.5], ['triangle', 0, 0.4, 0.12, 1568, 1568, 0.5]],
    win: [
      ['square', 0, 0.1, 0.08, 'd5 f#5 . d5 a5 . f#5 b5 . a5 d6 . . . .'],
      ['square', 1, 0.1, 0.05, 'a5 . . . .'], ['square', 1, 0.1, 0.05, 'f#5 . . . .'],
      ['triangle', 0, 0.1, 0.16, 'd3 . . f#3 . . b2 . . a2 d3 . . . .'],
      ['highpass', 1, 0.5, 0.08, 6000],
    ],
    lose: [
      ['square', 0, 0.12, 0.1, 392, 392, 0.6], ['square', 0.14, 0.12, 0.1, 311, 311, 0.6],
      ['square', 0.28, 0.9, 0.08, 262, 82, 0.2], ['triangle', 0.28, 0.9, 0.16, 131, 41, 0.2], // the long sag
      ['bandpass', 0.28, 0.9, 0.2, 1800, 300, 0.2], // air going out
    ],
    ui: [['square', 0, 0.06, 0.07, 660, 990]],
    star: [['triangle', 0, 0.18, 0.15, 1397, 2093], ['square', 0.03, 0.12, 0.04, 2794]],
    pause: [['square', 0, 0.05, 0.07, 587], ['square', 0.06, 0.08, 0.07, 440]],
  }

  // Percussion by pattern letter: [wave, length s, level, from Hz, to Hz].
  const DRUMS = { k: ['triangle', 0.11, 0.16, 150, 48], s: ['bandpass', 0.1, 0.2, 2600, 1500], h: ['highpass', 0.04, 0.05, 7000] }

  // Tunes: one token (or drum letter) per eighth note. Each voice loops on its own length.
  // swing delays the off-beats, bend starts every lead note flat and slides it up to pitch.
  const TUNES = {
    __proto__: null,
    // D minor, 8 tokens to the bar
    title: {
      bpm: 104, swing: 0.33, wave: 'square', vol: 0.05, bend: 1, drums: 'k--h--h-k--h-hs-',
      bass: `
        d3 - f3 - a3 - f3 -     d3 - f3 - a3 - f3 -
        g2 - a#2 - d3 - a#2 -   a2 - c#3 - e3 - c#3 -
        d3 - f3 - a3 - f3 -     a#2 - d3 - f3 - d3 -
        g2 - a#2 - a2 - c#3 -   d3 - a2 - d2 - - -`,
      lead: `
        d5 - - a4 - d5 f5 -       e5 - d5 - - - - -
        g5 - - d5 - g5 a#5 -      a5 - g5 - e5 - c#5 -
        d5 - - a4 - d5 f5 -       f5 - d5 - a#4 - - -
        g4 a4 a#4 - a4 - c#5 e5   d5 - - - - - - -
        - - - - - - a5 -          - - - - - a5 - a5
        - - a#5 - g5 - d5 -       e5 - c#5 - a4 - - -
        d5 f5 a5 - - f5 d5 -      a#4 d5 f5 - - d5 a#4 -
        g4 a#4 d5 - c#5 - e5 -    d5 - - d5 - - - -`,
    },
    // G major, 8 tokens to the bar
    grove: {
      bpm: 132, swing: 0, wave: 'square', vol: 0.05, bend: 1, drums: 'k-h-s-h-k-hks-hh',
      bass: `
        g2 - g3 - d3 - g3 -   g2 - g3 - d3 - g3 -
        c3 - c4 - g3 - c4 -   g2 - g3 - d3 - g3 -
        e2 - e3 - b2 - e3 -   c3 - c4 - g3 - c4 -
        d3 - d4 - a3 - d4 -   g2 - g3 - d3 - b2 -
        c3 - c4 - g3 - c4 -   g2 - g3 - d3 - g3 -
        a2 - a3 - e3 - a3 -   d3 - d4 - a3 - d4 -
        c3 - c4 - g3 - c4 -   g2 - g3 - d3 - g3 -
        d3 - d4 - a3 - c4 -   g2 - d3 - g3 - - -`,
      lead: `
        d5 - b4 d5 - g5 - -      e5 - d5 b4 - a4 - -
        g4 - c5 e5 - g5 - e5     d5 - - b4 - - - -
        e5 - g5 e5 - b4 - -      c5 - e5 c5 - g4 - -
        a4 - d5 f#5 - a5 - f#5   g5 - - d5 g5 - - -
        e5 - - c5 - e5 g5 -      d5 - - b4 - d5 g5 -
        c5 - - a4 - c5 e5 -      d5 - f#5 - a5 - - -
        g5 - e5 c5 - e5 - -      g5 - d5 b4 - d5 - -
        f#5 - e5 d5 - c5 - a4    g4 - b4 d5 g5 - - -`,
    },
    // C minor waltz, 6 tokens to the bar
    swamp: {
      bpm: 80, swing: 0, wave: 'sawtooth', vol: 0.045, bend: 0.985, drums: 'k-h-h-k--hh-',
      bass: `
        c3 . . . g2 -     c3 . . . d#3 -
        g#2 . . . d#3 -   g2 . . . d3 -
        c3 . . . g2 -     f2 . . . c3 -
        c#3 . . . g#2 -   g2 . . . b2 -`,
      lead: `
        g4 . g#4 g4 . -      d#4 . . c4 . -
        g#4 . c5 a#4 . g#4   g4 . . d4 . b3
        c4 . d#4 g4 . -      g#4 . g4 f4 . -
        f4 . g#4 c#5 . -     b4 . . . g4 -
        - - - c5 . -         - - - d#5 . d5
        c5 . . . g#4 -       d5 . . b4 . -
        d#5 . d5 c5 . -      c5 . g#4 f4 . -
        c#4 . f4 g#4 . f4    g4 . f#4 g4 . -`,
    },
    // F sharp minor, 8 tokens to the bar
    night: {
      bpm: 96, swing: 0, wave: 'triangle', vol: 0.16, bend: 1, drums: '--h---h---h--hh-',
      bass: `
        f#2 - - - - - c#3 -   f#2 - - - - - - -
        d3 - - - - - a2 -     c#3 - - - - - g#2 -
        f#2 - - - - - c#3 -   b2 - - - - - f#2 -
        g2 - - - - - d3 -     c#3 - - - g#2 - c#3 -`,
      lead: `
        f#4 a4 - - c#5 - - -   - - f#4 a4 - - c#5 -
        d5 - - a4 f#4 - - -    f4 g#4 - - c#5 - - -
        f#5 - - c#5 a4 - - -   b4 d5 - - f#5 - - -
        g5 - d5 - b4 - - -     g#4 - - - f4 - c#4 -
        - - - - f#4 a4 - -     - - - - c#5 - - -
        - - f#4 a4 d5 - - -    c#5 - - - - - - -
        a4 c#5 - - f#5 - - -   - - b4 d5 - - f#5 -
        g5 - - - d5 b4 - -     c#5 - b4 - g#4 - f4 -`,
    },
    // E minor, 8 tokens to the bar
    sunset: {
      bpm: 168, swing: 0, wave: 'square', vol: 0.05, bend: 1, drums: 'k-hk-hs-k-hk-hsh',
      bass: `
        e2 e2 e3 e2 e2 e3 e2 e3   e2 e2 e3 e2 e2 e3 e2 e3
        c3 c3 c4 c3 c3 c4 c3 c4   d3 d3 d4 d3 d3 d4 d3 d4
        e2 e2 e3 e2 e2 e3 e2 e3   e2 e2 e3 e2 e2 e3 e2 e3
        c3 c3 c4 c3 c3 c4 c3 c4   b2 b2 b3 b2 b2 b3 d#3 f#3
        a2 a2 a3 a2 a2 a3 a2 a3   e2 e2 e3 e2 e2 e3 e2 e3
        a2 a2 a3 a2 a2 a3 a2 a3   b2 b2 b3 b2 b2 b3 d#3 f#3
        c3 c3 c4 c3 c3 c4 c3 c4   d3 d3 d4 d3 d3 d4 d3 d4
        e2 e2 e3 e2 e2 e3 e2 e3   b2 b2 b3 b2 b2 b3 d#3 f#3`,
      lead: `
        e4 - g4 b4 - g4 b4 -     e5 - - d5 - b4 - -
        c5 - e5 c5 - g4 c5 -     d5 - - a4 - f#4 a4 -
        e4 - g4 b4 - g4 b4 -     e5 - - f#5 - g5 - -
        g5 - e5 - c5 - e5 -      f#5 - d#5 - b4 - d#5 f#5
        a4 - c5 e5 - c5 a4 -     g4 - b4 e5 - b4 g4 -
        a4 - c5 e5 - a5 - -      f#5 - - d#5 - b4 - -
        c5 c5 - e5 - g5 - -      d5 d5 - f#5 - a5 - -
        e5 e5 - g5 - b5 - -      b5 - a5 - f#5 - d#5 -`,
    },
  }

  const freq = (n) => 440 * 2 ** (('c d ef g a b'.indexOf(n[0]) + (n[1] === '#') + 12 * n.slice(-1) - 57) / 12)

  // 'a4 . - c#5': a note, '.' holds the note before it one more step, '-' is a rest.
  function parse(notes) {
    let last = null
    return notes.trim().split(/\s+/).map((tok) => {
      if (tok === '.') { if (last) last.len++; return null }
      return last = tok === '-' ? null : { f: freq(tok), len: 1 }
    })
  }

  // One voice into dest: pitch (or noise cutoff) slides f0 to f1 over its length.
  // Level: 5 ms attack, full for hold * dur, then a straight fade to zero, so no voice clicks.
  function tone(dest, t, wave, dur, vol, f0, f1 = f0, hold = 0) {
    const g = ctx.createGain()
    let src, f
    if (wave.endsWith('pass')) {
      src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = wave
      src.connect(filter).connect(g)
      f = filter.frequency
    } else {
      src = ctx.createOscillator()
      src.type = wave
      src.connect(g)
      f = src.frequency
    }
    f.setValueAtTime(f0, t)
    f.exponentialRampToValueAtTime(f1, t + dur)
    g.gain.value = 0 // shut until t: the source can start a sample before the ramp does
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.setValueAtTime(vol, t + Math.max(0.005, hold * dur))
    g.gain.linearRampToValueAtTime(0, t + dur)
    g.connect(dest)
    src.start(t)
    src.stop(t + dur)
  }

  function tick() {
    // A hidden tab gets a timer about once a second: stay quiet there instead of stuttering.
    if (document.hidden) return
    const now = ctx.currentTime
    // Late (tab was hidden, machine slept): skip the missed steps, so the tune keeps its place and old notes never burst out.
    const missed = Math.ceil((now - nextT) / song.dt)
    if (missed > 0) { step += missed; nextT += missed * song.dt }
    while (nextT < now + 0.2) {
      const t = nextT + (step & 1) * song.swing * song.dt
      const lead = song.lead[step % song.lead.length], bass = song.bass[step % song.bass.length]
      const drum = DRUMS[song.drums[step % song.drums.length]]
      if (lead) tone(out, t, song.wave, lead.len * song.dt * 0.9, song.vol, lead.f * song.bend, lead.f, 0.3)
      if (bass) tone(out, t, 'triangle', bass.len * song.dt * 0.9, 0.13, bass.f, bass.f, 0.5)
      if (drum) tone(out, t, ...drum)
      step++
      nextT += song.dt
    }
  }

  // Start the wanted tune from its top. The old tune has its own gain, faded here, so its queued notes die unheard.
  function start() {
    clearInterval(timer)
    if (out) out.gain.setTargetAtTime(0, ctx.currentTime, 0.02)
    out = null
    const tune = TUNES[theme]
    if (!tune) return
    out = ctx.createGain()
    out.connect(bus)
    song = { ...tune, lead: parse(tune.lead), bass: parse(tune.bass), dt: 30 / tune.bpm }
    step = 0
    nextT = ctx.currentTime + 0.05
    timer = setInterval(tick, 50)
    tick()
  }

  return {
    get muted() { return muted },

    unlock() {
      if (!ctx) {
        try { ctx = new AudioContext() } catch (e) { return }
        master = ctx.createGain()
        master.gain.value = muted ? 0 : 1
        master.connect(ctx.destination)
        bus = ctx.createGain()
        bus.connect(master)
        noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
        const data = noise.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        if (theme) start()
      }
      if (ctx.state !== 'running') ctx.resume()
    },

    play(name) {
      const fx = FX[name]
      if (!ctx || !fx) return
      const t = ctx.currentTime
      for (const [wave, at, dur, vol, f0, f1, hold] of fx) {
        if (typeof f0 === 'string') parse(f0).forEach((n, i) => n && tone(master, t + at + i * dur, wave, n.len * dur, vol, n.f, n.f, 0.7))
        else tone(master, t + at, wave, dur, vol, f0, f1, hold)
      }
      if (name === 'win' || name === 'lose') {
        // The jingle gets the stage: the tune drops out and fades back in after it.
        bus.gain.cancelScheduledValues(t)
        bus.gain.setTargetAtTime(0, t, 0.03)
        bus.gain.setTargetAtTime(1, t + 1.6, 0.3)
      }
    },

    // A tune asked for before unlock() starts as soon as sound is unlocked.
    music(name) {
      if (name === theme) return
      theme = name
      if (ctx) start()
    },

    setMuted(on) {
      muted = !!on
      if (ctx) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.01)
    },
  }
})()
