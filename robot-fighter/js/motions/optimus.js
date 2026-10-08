'use strict';
/* Animations personnelles : optimus — voir le contrat en tête de js/motions.js
   intro   : courte forme de kung-fu (vidéo d'entraînement Tesla 2025) : position prête, frappes de paume,
             grue sur une jambe, retombée en cavalier avec double poussée, salut tête baissée, garde
   victory : se tourne vers la caméra, grand signe de la main, puis la posture de l'arbre en équilibre
             mains jointes au-dessus de la tête (vidéo « yoga » d'Optimus 2023, « namaste »), respiration en boucle */
(() => {
  const ch = ROSTER.find(r => r.id === 'optimus'), Lg = 44 * ch.scale * ch.leg;
  // jambe : pied à (x, y) de la hanche (unités de jeu, y vers le bas) → [angle de hanche, flexion du genou]
  const leg = (x, y) => { const d = Math.min(Math.hypot(x, y), 2 * Lg * 0.9999), dir = Math.atan2(x, y) / D2R, a = Math.acos(d / (2 * Lg)) / D2R; return [dir + a, 2 * a]; };
  // pose dont les pieds restent aux positions F / B du sol (hanche décalée de dx, hauteur de hanche hF / hB)
  const st = (o, dx, F, B, hF, hB = hF) => { const p = { ...POSES.idle, ...o }; [p.fh, p.fk] = leg(F - dx, hF); [p.bh, p.bk] = leg(B - dx, hB); return p; };
  const F0 = 13.3, B0 = -44.5; // pieds de la garde (idle)

  // ---- intro : forme de kung-fu ----
  const ready = st({ lean: 2, hd: 0, fs: -15, fe: 105, bs: -15, be: 105, grip: 1 }, -12, F0, B0, 78);
  const cock = st({ lean: -1, hd: 0, fs: -28, fe: 95, bs: -12, be: 108, grip: 0.7, twist: -0.22 }, -14, F0, B0, 77);
  const palm1 = st({ lean: 13, hd: -4, fs: 90, fe: 2, bs: -18, be: 108, grip: 0, twist: 0.34 }, 4, F0, B0, 74);
  const palm1s = st({ lean: 10, hd: -3, fs: 86, fe: 8, bs: -16, be: 106, grip: 0, twist: 0.26 }, 2, F0, B0, 75);
  const palm2 = st({ lean: 13, hd: -4, bs: 90, be: 2, fs: -18, fe: 108, grip: 0, twist: -0.34 }, 4, F0, B0, 74);
  const palm2s = st({ lean: 10, hd: -3, bs: 86, be: 8, fs: -16, fe: 106, grip: 0, twist: -0.26 }, 2, F0, B0, 75);
  // poids sur la jambe arrière (pied avant sur la pointe), puis la grue
  const cat = st({ lean: 2, hd: -4, fs: 150, fe: 60, bs: 40, be: 70, grip: 0, twist: 0.1 }, -40, F0 - 4, B0, 80, 80);
  const crane = { ...st({ lean: -2, hd: -6, fs: 25, fe: 25, bs: 25, be: 25, axf: 1.35, axb: 1.35, grip: 0 }, B0, F0, B0, 87, 87), fh: 100, fk: 118 };
  const crane2 = { ...crane, fs: 30, fe: 18, bs: 30, be: 18, axf: 1.55, axb: 1.55, hd: -8, fh: 104, fk: 122 };
  const horse = st({ lean: 9, hd: -3, fs: 90, fe: 2, bs: 88, be: 4, grip: 0 }, -15, F0, B0, 75);
  const horseS = st({ lean: 7, hd: -2, fs: 86, fe: 8, bs: 84, be: 10, grip: 0 }, -15, F0, B0, 76);
  const salute = st({ lean: 8, hd: 26, fs: 38, fe: 108, bs: 46, be: 96, axf: -0.22, axb: -0.22, grip: 0.55 }, -10, F0, B0, 82, 76);
  const salute2 = { ...salute, hd: 30, lean: 10 };

  // ---- victoire : signe de la main puis posture de l'arbre ----
  const up = (o, dx) => st(o, dx, F0, F0, 87.2); // debout, pieds côte à côte sous la hanche
  const step = st({ lean: 2, hd: 0, fs: 12, fe: 35, bs: 12, be: 35, grip: 0.5 }, 6, F0, B0, 85, 74);
  const stepAir = { ...step, bh: -4, bk: 48 };
  const stand = up({ lean: 0, hd: 2, fs: 6, fe: 18, bs: 6, be: 18, axf: 0.12, axb: 0.12, grip: 0.4 }, F0);
  const wave = (ax, fe, hd) => up({ lean: -2, hd, fs: 2, fe, axf: ax, bs: 6, be: 22, axb: 0.15, grip: 0, headSpin: 0.12 }, F0);
  const tree = { ...up({ lean: 0, hd: 0, fs: 176, fe: 4, bs: 176, be: 4, axf: 0.3, axb: 0.3, grip: 0 }, F0), bh: 34, bk: 152, hxb: 0.95, kyb: 0.9 };
  const tree2 = { ...tree, lean: 1, hd: 3, fs: 178, bs: 178, axf: 0.33, axb: 0.33 };
  const open = { ...tree, fs: 6, fe: 10, bs: 6, be: 10, axf: 1.55, axb: 1.55, hd: -6, lean: -1 };

  MOTIONS.optimus = {
    intro: [
      ['idle', 4],
      [ready, 14, { dx: -12 }],
      [cock, 7, { dx: -14 }],
      [palm1, 6, { dx: 4, fx: 'whiff' }],
      [palm1s, 8, { dx: 2 }],
      [palm2, 7, { dx: 4, fx: 'whiff' }],
      [palm2s, 8, { dx: 2 }],
      [cat, 12, { dx: -40, yaw: -0.55 }],
      [crane, 14, { dx: B0, yaw: -0.85 }],
      [crane2, 14, { dx: B0, yaw: -0.6 }],
      [horse, 7, { dx: -15, fx: 'stomp' }],
      [horseS, 10, { dx: -15 }],
      [salute, 14, { dx: -10 }],
      [salute2, 12, { dx: -10 }],
      ['idle', 16]
    ],
    victory: [
      ['idle', 4],
      [stepAir, 10, { dx: 8, yaw: -1.25 }],
      [stand, 9, { dx: F0, yaw: -1.3 }],
      [wave(2.5, 25, 8), 10, { dx: F0, yaw: -1.3 }],
      [wave(2.05, 48, 10), 7, { dx: F0, yaw: -1.3 }],
      [wave(2.6, 20, 8), 7, { dx: F0, yaw: -1.3 }],
      [wave(2.05, 48, 10), 7, { dx: F0, yaw: -1.3 }],
      [wave(2.55, 24, 8), 7, { dx: F0, yaw: -1.3 }],
      [tree, 18, { dx: F0, yaw: -1.3, fx: 'zen' }],
      [tree2, 22, { dx: F0, yaw: -1.3, say: 'Namaste' }],
      [open, 34, { dx: F0, yaw: -1.3 }],
      [tree2, 34, { dx: F0, yaw: -1.3, fx: 'zen' }]
    ],
    victoryLoop: 10,
    fx: {
      // pied qui frappe le sol : poussière + onde au sol
      stomp(ch, x, footY, sc, face) {
        AU.sfx('land'); AU.sfx('whiffH');
        dust(x, footY, 8);
        FX.add({ type: 'ring', x: x + face * 10 * sc, y: footY, size: 70 * sc, life: 16, max: 16, col: ch.accent, flat: 0.25, lw: 5 });
      },
      // posture de l'arbre : halo calme qui monte des mains jointes
      zen(ch, x, footY, sc, face) {
        const hy = footY - 205 * sc;
        FX.add({ type: 'ring', x, y: hy, size: 46 * sc, life: 26, max: 26, col: ch.accent, flat: 1, lw: 4 });
        for (let i = 0; i < 12; i++) FX.add({ type: 'glow', x: x + rand(-40, 40) * sc, y: footY - rand(10, 190) * sc, vy: -rand(0.6, 1.6) * sc, size: rand(4, 8) * sc, life: 40, max: 40, col: ch.accent });
      }
    }
  };
})();
