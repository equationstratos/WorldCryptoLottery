'use strict';
/* Animations personnelles : ameca — voir le contrat en tête de js/motions.js
   intro   : « Ameca se réveille » (la vidéo virale d'Engineered Arts) : en veille, tête basse ; sursaut, regard
             circulaire, elle découvre ses propres mains avec émerveillement, puis se tourne vers la caméra
             et penche la tête, sourcil levé… avant de reprendre la garde
   victory : numéro de théâtre sarcastique : petit pas vers le public, haussement d'épaules « Too easy. »,
             éclat de rire tête en arrière, grande révérence avec moulinet du bras ; en boucle : applaudissements
             lents et ironiques, levée des yeux au ciel, soupir, haussement d'épaules */
(() => {
  const ch = ROSTER.find(r => r.id === 'ameca'), s = ch.scale, Lg = 44 * s * ch.leg, HO = 1.8 * s, TAU = Math.PI * 2;
  const HZ = 10.4 * s, SZ = 21.2 * s; // demi-écart des hanches / des épaules du modèle 3D
  const leg = (x, y) => { const d = Math.min(Math.hypot(x, y), 2 * Lg * 0.9999), dir = Math.atan2(x, y) / D2R, a = Math.acos(d / (2 * Lg)) / D2R; return [dir + a, 2 * a]; };
  const st = (o, F, B, hF, hB = hF) => { const p = mkPose({ ...o }); [p.fh, p.fk] = leg(F - HO, hF); [p.bh, p.bk] = leg(B + HO, hB); return p; };
  const G = skeleton(ch, POSES.idle, 1), F0 = G.ffo.x, B0 = G.bfo.x, H0 = G.ffo.y, HB0 = G.bfo.y;
  const gd = (o, d = 0) => st(o, F0, B0, H0 + d, HB0 + d); // pieds de la garde, genoux plus ou moins fléchis

  // ---- points du corps vus à l'écran (unités de jeu : x vers l'avant de l'écran du robot, y = hauteur) ----
  const proj = (p, yaw, S, x, y, z) => {
    if (p.twist) { const c = Math.cos(p.twist), sn = Math.sin(p.twist), nx = x * c + z * sn; z = -x * sn + z * c; x = nx; }
    const th = yaw + (p.spin || 0);
    return { x: x * Math.cos(th) + z * Math.sin(th), y: S._low + y };
  };
  function hand(p, yaw, sd) {
    const S = skeleton(ch, p, 1), sh = S[sd + 'sh'], h = S[sd + 'ha'], zz = sd === 'f' ? 1 : -1;
    let x = h.x, y = -h.y, z = zz * SZ;
    const ax = p['ax' + sd];
    if (ax) { // abduction : rotation autour de l'axe avant du buste passant par l'épaule (comme RK.pose)
      const tl = Math.hypot(S.neck.x - S.hip.x, S.neck.y - S.hip.y) || 1, k = [(S.hip.y - S.neck.y) / tl, (S.hip.x - S.neck.x) / tl, 0];
      const a = -zz * ax, c = Math.cos(a), sn = Math.sin(a), v = [x - sh.x, y + sh.y, z - zz * SZ];
      const dt = k[0] * v[0] + k[1] * v[1], cr = [k[1] * v[2], -k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
      const r = [0, 1, 2].map(i => v[i] * c + cr[i] * sn + k[i] * dt * (1 - c));
      x = sh.x + r[0]; y = -sh.y + r[1]; z = zz * SZ + r[2];
    }
    return proj(p, yaw, S, x, y, z);
  }
  const head = (p, yaw) => { const S = skeleton(ch, p, 1); return proj(p, yaw, S, S.head.x, -S.head.y, 0); };
  // effet accroché à un point d'une pose clé ; menus : x/pied ne tiennent pas compte de dx/dy, le combat si
  const atP = (pt, dx, fn) => (c, x, footY, sc, face) => { const menu = sc !== 1; fn(c, x + face * ((menu ? dx : 0) + pt.x) * sc, footY - pt.y * sc, sc, face); };
  const VIO = ['#b26bff', '#d6a8ff', '#f3e8ff'];

  // ======================= INTRO : le réveil =======================
  const slump = gd({ lean: 15, hd: 40, fs: 5, fe: 14, bs: 4, be: 12, axf: 0.08, axb: 0.08, grip: 0.35 }, -5);
  const slump2 = gd({ lean: 17, hd: 44, fs: 3, fe: 16, bs: 2, be: 14, axf: 0.06, axb: 0.06, grip: 0.4 }, -5.5);
  const jolt = gd({ lean: -5, hd: -16, fs: 16, fe: 28, axf: 0.32, bs: 14, be: 28, axb: 0.32, grip: 0 }, 1);
  const alert = gd({ lean: -1, hd: -8, fs: 10, fe: 22, axf: 0.2, bs: 10, be: 22, axb: 0.2, grip: 0.1 }, 0.5);
  const lookA = gd({ lean: 0, hd: -4, headSpin: 0.55, twist: 0.12, fs: 10, fe: 24, axf: 0.18, bs: 10, be: 24, axb: 0.18, grip: 0.1 }, 0.5);
  const lookB = gd({ lean: 0, hd: -6, headSpin: -0.6, twist: -0.22, fs: 10, fe: 24, axf: 0.18, bs: 10, be: 24, axb: 0.18, grip: 0.1 }, 0.5);
  const hands = gd({ lean: 5, hd: 24, headSpin: 0, twist: -0.18, fs: 50, fe: 80, axf: 0.12, bs: 46, be: 84, axb: 0.12, grip: 0.05 }, 0);
  const curl = gd({ lean: 6, hd: 27, headSpin: 0.22, twist: -0.18, fs: 52, fe: 86, axf: 0.12, bs: 46, be: 84, axb: 0.12, grip: 0.8 }, 0);
  const open = gd({ lean: 6, hd: 25, headSpin: -0.24, twist: -0.18, fs: 50, fe: 80, axf: 0.12, bs: 54, be: 76, axb: 0.12, grip: 0 }, 0);
  const cam = gd({ lean: -2, hd: -6, headSpin: -0.72, twist: -0.5, fs: 36, fe: 72, axf: 0.15, bs: 32, be: 72, axb: 0.15, grip: 0.2 }, 0.5);
  const brow = gd({ lean: -4, hd: -13, headSpin: -0.82, twist: -0.52, fs: 34, fe: 74, axf: 0.15, bs: 30, be: 74, axb: 0.15, grip: 0.25 }, 0.5);

  // ======================= VICTOIRE : numéro sarcastique =======================
  const XF = F0 * Math.cos(-0.42) + HZ * Math.sin(-0.42); // pied avant de la garde (x écran), reste planté
  const dxAt = (lx, yaw) => XF - lx * Math.cos(yaw) - HZ * Math.sin(yaw);
  const YM = -0.8, YV = -1.15, lxM = F0 / 2, dxM = dxAt(lxM, YM), dxV = dxAt(0, YV);
  const OV = { yaw: YV, dx: dxV };
  const up = o => st(o, 0, 0, 85.6);
  const stepMid = st({ lean: 4, hd: -4, fs: 30, fe: 60, bs: 22, be: 60, grip: 0.5 }, lxM, B0 * 0.35, H0 + 1, H0 - 13);
  const stand = up({ lean: 0, hd: -6, fs: 8, fe: 18, axf: 0.12, bs: 8, be: 18, axb: 0.12, grip: 0.4 });
  const shrug = up({ lean: -4, hd: 6, headSpin: 0.22, fs: 14, fe: 88, axf: 0.6, bs: 14, be: 88, axb: 0.6, grip: 0 });
  const shrug2 = up({ lean: -5, hd: 9, headSpin: 0.28, fs: 16, fe: 90, axf: 0.72, bs: 16, be: 90, axb: 0.72, grip: 0 });
  const laugh = (k, o) => up({ lean: -5 - 5 * k, hd: -13 - 11 * k, fs: 40, fe: 104, axf: -0.22, bs: 18, be: 40, axb: 0.5, grip: 0.3, ...o });
  const flourish = up({ lean: -4, hd: -8, headSpin: 0.1, fs: 12, fe: 24, axf: 2.15, bs: 10, be: 14, axb: 0.9, grip: 0 });
  const bow = up({ lean: 46, hd: 20, fs: 55, fe: 115, axf: -0.35, bs: -28, be: 10, axb: 0.7, grip: 0.3 });
  const bow2 = { ...bow, lean: 48, hd: 23 };
  const clapO = up({ lean: 0, hd: 3, headSpin: 0.12, fs: 58, fe: 55, axf: 0.55, bs: 58, be: 55, axb: 0.55, grip: 0 });
  const clapS = up({ lean: 1, hd: 4, headSpin: 0.12, fs: 60, fe: 60, axf: -0.5, bs: 60, be: 60, axb: -0.5, grip: 0 });
  const roll1 = up({ lean: -3, hd: -22, headSpin: 0.35, fs: 12, fe: 22, axf: 0.2, bs: 12, be: 22, axb: 0.2, grip: 0.2 });
  const roll2 = up({ lean: -3, hd: -20, headSpin: -0.35, fs: 12, fe: 22, axf: 0.2, bs: 12, be: 22, axb: 0.2, grip: 0.2 });
  const sigh = up({ lean: 7, hd: 12, headSpin: 0, fs: 4, fe: 12, axf: 0.1, bs: 4, be: 12, axb: 0.1, grip: 0.3 });

  const fx = {
    // mise en veille : lueur qui s'éteint, son qui descend
    off(c, x, footY, sc, face) {
      AU.tone(520, 0.5, 'sine', 0.1, 90);
      const h = head(slump, -0.42);
      FX.add({ type: 'glow', x: x + face * h.x * sc, y: footY - h.y * sc, size: 26 * sc, life: 22, max: 22, col: c.accent, core: '#fff' });
    },
    // réveil : éclair dans les yeux + onde
    wake(c, x, footY, sc, face) {
      AU.tone(160, 0.28, 'sine', 0.13, 1100); AU.tone(1300, 0.08, 'triangle', 0.06, null, 0.22);
      const h = head(jolt, -0.42), hx = x + face * (h.x + 4) * sc, hy = footY - (h.y + 2) * sc;
      FX.add({ type: 'star', x: hx, y: hy, size: 16 * sc, life: 14, max: 14, col: '#ffffff', rot: 0.3 });
      FX.add({ type: 'ring', x: hx, y: hy, size: 60 * sc, life: 16, max: 16, col: c.accent, lw: 4 });
      FX.add({ type: 'glow', x: hx, y: hy, size: 30 * sc, life: 12, max: 12, col: c.accent, core: '#fff' });
    },
    // petit éclat dans le regard face caméra
    glint(c, x, footY, sc, face) {
      AU.tone(1500, 0.07, 'triangle', 0.06); AU.tone(2000, 0.09, 'triangle', 0.05, null, 0.07);
      const h = head(brow, -0.42);
      FX.add({ type: 'star', x: x + face * (h.x - 4) * sc, y: footY - (h.y + 3) * sc, size: 11 * sc, life: 16, max: 16, col: '#f3e8ff', rot: 0.4 });
    },
    // rire : bulles violettes qui montent de la tête
    ha: atP(head(laugh(1), YV), dxV, (c, x, y, sc, face) => {
      AU.tone(700, 0.05, 'square', 0.04); AU.tone(560, 0.06, 'square', 0.04, null, 0.06);
      for (let i = 0; i < 3; i++) FX.add({ type: 'glow', x: x + rand(-14, 14) * sc, y: y - rand(8, 18) * sc, vx: rand(-0.6, 0.6) * sc, vy: -rand(0.9, 1.6) * sc, size: rand(5, 8) * sc, life: 22, max: 22, col: pick(VIO), core: '#fff' });
    }),
    // moulinet : étoiles qui suivent la main
    swirl: atP(hand(flourish, YV, 'f'), dxV, (c, x, y, sc) => {
      AU.sfx('whiff');
      FX.add({ type: 'star', x, y, size: 12 * sc, life: 16, max: 16, col: '#f3e8ff', rot: 0.2 });
      for (let i = 0; i < 8; i++) FX.add({ type: 'glow', x: x + rand(-10, 10) * sc, y: y + rand(-10, 10) * sc, vy: rand(0.5, 2) * sc, size: rand(4, 7) * sc, life: 20, max: 20, col: pick(VIO) });
    }),
    bowing(c, x, footY, sc, face) { AU.sfx('confirm'); },
    // applaudissement lent
    clap: atP((() => { const a = hand(clapS, YV, 'f'), b = hand(clapS, YV, 'b'); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; })(), dxV, (c, x, y, sc) => {
      AU.noise(0.07, 2200, 0.4, 'bandpass', null, 0, 1.2); AU.noise(0.03, 5000, 0.2, 'highpass');
      for (let i = 0; i < 6; i++) { const a = rand(0, TAU), v = rand(1.5, 3.5); FX.add({ type: 'spark', x, y, vx: Math.cos(a) * v * sc, vy: Math.sin(a) * v * sc, drag: 0.88, size: 2, len: 2, life: 10, max: 10, col: pick(VIO) }); }
    })
  };

  MOTIONS.ameca = {
    intro: [
      ['idle', 1],
      [slump, 16, { fx: 'off' }],                        // mise en veille : tête basse, bras ballants
      [slump2, 18],
      [jolt, 5, { fx: 'wake' }],                         // sursaut : réveil !
      [alert, 9],
      [lookA, 12],                                       // regard circulaire
      [lookB, 13],
      [hands, 16],                                       // elle découvre ses mains…
      [curl, 12],                                        // … referme les doigts
      [open, 12],                                        // … les rouvre, regarde l'autre main
      [cam, 15, { fx: 'glint' }],                        // se tourne vers la caméra
      [brow, 10],                                        // tête penchée, « sourcil levé »
      [{ ...brow, hd: -14 }, 12],
      ['idle', 18],
      ['idle', 6]
    ],
    victory: [
      ['idle', 1],
      [stepMid, 9, { yaw: YM, dx: dxM }],                // pivote sur le pied avant vers le public
      [stand, 7, OV],
      [shrug, 12, { ...OV, say: 'Too easy.' }],          // haussement d'épaules
      [shrug2, 14, OV],
      [laugh(1), 6, { ...OV, fx: 'ha' }],                // éclat de rire, tête en arrière
      [laugh(0.3), 5, OV],
      [laugh(1.1), 5, { ...OV, fx: 'ha' }],
      [laugh(0.3), 5, OV],
      [laugh(0.9), 5, { ...OV, fx: 'ha' }],
      [flourish, 10, { ...OV, fx: 'swirl' }],            // moulinet du bras…
      [bow, 15, { ...OV, fx: 'bowing' }],                // … grande révérence
      [bow2, 16, OV],
      [clapO, 14, OV],                                   // ---- boucle : applaudissements lents et ironiques
      [clapS, 7, { ...OV, fx: 'clap' }],
      [clapO, 13, OV],
      [clapS, 7, { ...OV, fx: 'clap' }],
      [clapO, 13, OV],
      [clapS, 7, { ...OV, fx: 'clap' }],
      [clapO, 12, OV],
      [roll1, 14, OV],                                   // yeux au ciel
      [roll2, 14, OV],
      [sigh, 12, OV],                                    // soupir
      [shrug, 12, OV],
      [shrug2, 14, OV],
      [clapO, 14, OV]
    ],
    victoryLoop: 14,
    fx
  };
})();
