window.SFX = (() => {
  let ctx = null, master = null, ambient = null, heartTimer = null;
  const ensure = () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  };

  const noiseBuffer = () => {
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return buf;
  };

  function startAmbient() {
    ensure();
    if (ambient) return;
    const out = ctx.createGain(); out.gain.value = 0; out.connect(master);
    out.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 6);
    const nodes = [];
    [55, 55.4, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator(); o.type = i === 2 ? "sine" : "sawtooth"; o.frequency.value = f;
      const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 180;
      const g = ctx.createGain(); g.gain.value = i === 2 ? 0.05 : 0.06;
      o.connect(lp).connect(g).connect(out); o.start(); nodes.push(o);
    });
    const wind = ctx.createBufferSource(); wind.buffer = noiseBuffer(); wind.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 500; bp.Q.value = 0.8;
    const wg = ctx.createGain(); wg.gain.value = 0.18;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoG = ctx.createGain(); lfoG.gain.value = 300;
    lfo.connect(lfoG).connect(bp.frequency); lfo.start();
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.11;
    const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.12;
    lfo2.connect(lfo2G).connect(wg.gain); lfo2.start();
    wind.connect(bp).connect(wg).connect(out); wind.start();
    nodes.push(wind, lfo, lfo2);
    ambient = { out, nodes };
  }
  function stopAmbient() {
    if (!ambient) return;
    const a = ambient; ambient = null;
    a.out.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
    setTimeout(() => a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }), 1800);
  }

  function bell(freq = 523, dur = 3, vol = 0.25) {
    ensure();
    const t = ctx.currentTime;
    [1, 2.01, 2.76, 4.07].forEach((m, i) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq * m;
      const g = ctx.createGain(); g.gain.setValueAtTime(vol / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (i * 0.6 + 1));
      o.connect(g).connect(master); o.start(t); o.stop(t + dur);
    });
  }
  const found = () => { bell(659, 2.2, 0.22); setTimeout(() => bell(988, 2.5, 0.16), 140); };
  const phase = () => { bell(130, 6, 0.35); setTimeout(() => bell(130, 6, 0.3), 1800); setTimeout(() => bell(130, 6, 0.25), 3600); };
  function wrong() {
    ensure();
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "square"; o.frequency.setValueAtTime(110, t); o.frequency.linearRampToValueAtTime(70, t + 0.5);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.6);
  }
  function thump(t, v) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(35, t + 0.15);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.25);
  }
  function heartbeat(on, fast) {
    if (heartTimer) { clearInterval(heartTimer); heartTimer = null; }
    if (!on) return;
    ensure();
    const period = fast ? 600 : 1000;
    const beat = () => { const t = ctx.currentTime; thump(t, 0.5); thump(t + 0.22, 0.35); };
    beat(); heartTimer = setInterval(beat, period);
  }
  function tick() {
    ensure();
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.value = 1800;
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.06);
  }
  return { ensure, startAmbient, stopAmbient, found, phase, wrong, heartbeat, tick, bell };
})();
