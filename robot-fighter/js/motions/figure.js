'use strict';
/* Animations personnelles : figure — voir le contrat en tête de js/motions.js
   intro   : « vérification des systèmes » façon démos Helix : un petit pas précis, il lève la main ouverte devant
             son visage, l'inspecte, la referme doigt après doigt (trois crans), regarde le public, hoche la tête, garde
   victory : le professionnel discret : il se tourne vers le public, main sur le cœur, légère révérence
             (« Task complete. »), se redresse, mains dans le dos ; en boucle : un coup d'œil précis à son poignet
             (l'heure, le prochain travail…), petit hochement de tête satisfait, mains dans le dos */
(() => {
  const ch = ROSTER.find(r => r.id === 'figure'), s = ch.scale, Lg = 44 * s * ch.leg, HO = 1.8 * s, HZ = 12.5 * s;
  const PI = Math.PI;
  // jambe : pied à (x, y) de l'articulation de hanche (y vers le bas) → [hanche, genou]
  const leg = (x, y) => { const d = Math.min(Math.hypot(x, y), 2 * Lg * 0.9999), dir = Math.atan2(x, y) / D2R, a = Math.acos(d / (2 * Lg)) / D2R; return [dir + a, 2 * a]; };
  // pose aux pieds placés en F / B (x depuis le centre des hanches) à la profondeur hF / hB sous la hanche
  const st = (o, F, B, hF, hB = hF) => { const p = mkPose({ ...POSES.idle, ...o }); [p.fh, p.fk] = leg(F - HO, hF); [p.bh, p.bk] = leg(B + HO, hB); return p; };
  const G = skeleton(ch, POSES.idle, 1), F0 = G.ffo.x, B0 = G.bfo.x, H0 = G.ffo.y, HB = G.bfo.y;
  // courbes : suite d'images-clés d'une image, fn(u) → [pose, options], u ∈ ]0, 1]
  const track = (n, fn, o0) => Array.from({ length: n }, (_, i) => { const [p, o] = fn((i + 1) / n); return [p, 1, i === 0 && o0 ? { ...o, ...o0 } : o]; });
  const mixO = (a, b, u) => { const o = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = lerp(a[k] ?? POSES.idle[k] ?? 0, b[k] ?? POSES.idle[k] ?? 0, u); return o; };
  const ss = u => u * u * (3 - 2 * u), eOut = u => 1 - (1 - u) * (1 - u);
  // le pied avant reste planté pendant que le corps pivote : décalage dx qui garde son x écran
  const Y0 = -0.42, CAM = -PI / 2;
  const fX = (lx, lz, yaw, dx) => dx + lx * Math.cos(yaw) + lz * Math.sin(yaw);
  const XF0 = fX(F0, HZ, Y0, 0), anchor = (lx, yaw) => XF0 - lx * Math.cos(yaw) - HZ * Math.sin(yaw);

  // ---- sons et effets ----
  const tick = (f, v = 0.06) => { AU.tone(f, 0.05, 'square', v); AU.tone(f * 1.5, 0.04, 'sine', v * 0.6, null, 0.03); };
  const handAt = (x, footY, sc, face, hx, hy, dx = 0) => ({ x: x + face * ((sc !== 1 ? dx : 0) + hx) * sc, y: footY - hy * sc });

  // ======================= INTRO : vérification des systèmes =======================
  const YI = -0.78, BS = B0 + 22, DS = 85; // orientation 3/4 public, pied arrière rapproché, hanches hautes
  const DXI = anchor(F0, YI);
  const uRelax = { lean: 2, hd: 0, fs: 8, fe: 20, bs: 8, be: 22, axf: 0.12, axb: 0.12, grip: 0.35 };
  const uGuard = { lean: POSES.idle.lean, hd: POSES.idle.hd, fs: 50, fe: 100, bs: 28, be: 118, grip: 1 };
  const uHand = { ...uRelax, lean: -1, hd: 8, fs: 55, fe: 100, axf: 0.45, grip: 0, headSpin: 0.15 };
  const hand = o => st({ ...uHand, ...o }, F0, BS, DS);
  const hsCam = CAM - YI; // tête vers le public
  const intro = [
    ['idle', 4],
    // petit pas précis : le pied arrière se rapproche, le corps se redresse et se tourne de 3/4
    ...track(18, u => {
      const e = ss(u), y = lerp(Y0, YI, e), lift = 9 * Math.sin(PI * clamp(u * 1.15, 0, 1));
      return [st(mixO(uGuard, uRelax, e), F0, lerp(B0, BS, ss(clamp(u * 1.15, 0, 1))), lerp(H0, DS, e), lerp(HB, DS, e) - lift), { yaw: y, dx: anchor(F0, y) }];
    }),
    // la main ouverte monte devant le visage, le regard la suit
    ...track(20, u => [hand(mixO(uRelax, uHand, ss(u))), { yaw: YI, dx: DXI }], { fx: 'scan' }),
    [hand({ axf: 0.25, headSpin: 0.1, hd: 9 }), 12, { yaw: YI, dx: DXI }],
    [hand({ axf: 0.5, headSpin: 0.18, hd: 7 }), 12, { yaw: YI, dx: DXI }],
    // elle se referme en trois crans précis
    [hand({ grip: 0.38 }), 5, { yaw: YI, dx: DXI, fx: 'tick1' }],
    [hand({ grip: 0.38 }), 6, { yaw: YI, dx: DXI }],
    [hand({ grip: 0.7 }), 5, { yaw: YI, dx: DXI, fx: 'tick2' }],
    [hand({ grip: 0.7 }), 6, { yaw: YI, dx: DXI }],
    [hand({ grip: 1, fe: 104 }), 5, { yaw: YI, dx: DXI, fx: 'fist' }],
    [hand({ grip: 1, fe: 104 }), 10, { yaw: YI, dx: DXI }],
    // regard vers le public, hochement de tête
    [hand({ grip: 1, fs: 48, fe: 106, hd: 0, headSpin: hsCam }), 12, { yaw: YI, dx: DXI }],
    [hand({ grip: 1, fs: 48, fe: 106, hd: 14, headSpin: hsCam }), 7, { yaw: YI, dx: DXI }],
    [hand({ grip: 1, fs: 48, fe: 106, hd: -1, headSpin: hsCam }), 9, { yaw: YI, dx: DXI }],
    // retour en garde : le pied arrière recule, le corps se remet de profil
    ...track(20, u => {
      const e = ss(u), y = lerp(YI, Y0, e), lift = 9 * Math.sin(PI * clamp(u * 1.15, 0, 1));
      const o = mixO({ ...uHand, grip: 1, fs: 48, fe: 106, hd: -1, headSpin: hsCam }, uGuard, e);
      return [st(o, F0, lerp(BS, B0, ss(clamp(u * 1.15, 0, 1))), lerp(DS, H0, e), lerp(DS, HB, e) - lift), { yaw: y, dx: anchor(F0, y) }];
    }),
    ['idle', 14]
  ];

  // ======================= VICTOIRE : révérence, mains dans le dos =======================
  const YV = -1.2, FT = 1.5, DT = 87; // face au public, pieds joints sous les hanches, debout
  const DXV = anchor(FT, YV);
  const uStand = { lean: 0, hd: 0, fs: 4, fe: 14, bs: 4, be: 14, axf: 0.12, axb: 0.12, grip: 0.3 };
  const uHeart = { ...uStand, fs: 38, fe: 122, axf: 1.1, grip: 0.08, hd: 6 };
  const bowO = (k, o) => ({ ...uHeart, lean: 18 * k, hd: 6 + 12 * k, fs: 38 + 16 * k, fe: 122 - 4 * k, bs: 4 + 6 * k, ...o });
  const uBehind = { lean: -1, hd: -3, fs: -18, fe: 22, bs: -18, be: 22, axf: -0.2, axb: -0.2, grip: 0.5 };
  const hsV = CAM - YV;
  const uWatch = { ...uBehind, fs: 40, fe: 95, axf: 0.9, grip: 0.4, hd: 26, headSpin: 0.22 };
  const up = o => st(o, FT, FT, DT);
  const opt = { yaw: YV, dx: DXV };
  const main = [
    ['idle', 4],
    // il ramène le pied arrière à côté du pied avant en se tournant vers le public
    ...track(20, u => {
      const e = ss(u), y = lerp(Y0, YV, e), lift = 10 * Math.sin(PI * clamp(u * 1.1, 0, 1)), F = lerp(F0, FT, e);
      return [st(mixO(uGuard, uStand, e), F, lerp(B0, FT, ss(clamp(u * 1.1, 0, 1))), lerp(H0, DT, e), lerp(HB, DT, e) - lift), { yaw: y, dx: anchor(F, y) }];
    }),
    // main sur le cœur…
    [up(uHeart), 14, opt],
    // …légère révérence
    ...track(18, u => [up(bowO(ss(u))), opt], { say: 'Task complete.' }),
    [up(bowO(1, { lean: 19, hd: 19 })), 12, opt],
    ...track(16, u => [up(bowO(1 - ss(u), { hd: lerp(18, -2, ss(u)) })), opt]),
    [up({ ...uHeart, hd: -3 }), 8, opt],
    // mains dans le dos, menton haut
    ...track(18, u => [up(mixO({ ...uHeart, hd: -3 }, uBehind, ss(u))), opt], { fx: 'poise' }),
    [up(uBehind), 12, opt]
  ];
  const loop = [
    [up({ ...uBehind, lean: 0, hd: -2 }), 34, opt],
    // coup d'œil au poignet
    ...track(16, u => [up(mixO(uBehind, uWatch, ss(u))), opt]),
    [up({ ...uWatch, hd: 28 }), 10, { ...opt, fx: 'glint' }],
    [up({ ...uWatch, hd: 27, headSpin: 0.2 }), 14, opt],
    // relève la tête vers le public, petit hochement satisfait
    [up({ ...uWatch, fs: 34, fe: 98, hd: 0, headSpin: hsV }), 12, opt],
    [up({ ...uWatch, fs: 34, fe: 98, hd: 12, headSpin: hsV }), 6, opt],
    [up({ ...uWatch, fs: 34, fe: 98, hd: -2, headSpin: hsV }), 8, opt],
    // la main repart dans le dos, regard droit devant
    ...track(18, u => [up(mixO({ ...uWatch, fs: 34, fe: 98, hd: -2, headSpin: hsV }, uBehind, ss(u))), opt]),
    [up(uBehind), 24, opt] // = dernière clé de main
  ];

  MOTIONS.figure = {
    intro,
    victory: [...main, ...loop],
    victoryLoop: main.length,
    fx: {
      // le regard s'allume : fin balayage lumineux devant la visière
      scan(ch, x, footY, sc, face) { AU.tone(1300, 0.25, 'sine', 0.05, 2100); },
      // la main se referme cran par cran
      tick1(ch, x, footY, sc, face) { tick(1500); },
      tick2(ch, x, footY, sc, face) { tick(1800); },
      fist(ch, x, footY, sc, face) {
        tick(2200, 0.07); AU.sfx('block');
        const h = handAt(x, footY, sc, face, 22, 160, DXI);
        FX.add({ type: 'glow', x: h.x, y: h.y, size: 16 * sc, life: 18, max: 18, col: ch.accent, core: '#fff' });
        FX.add({ type: 'ring', x: h.x, y: h.y, size: 22 * sc, life: 14, max: 14, col: ch.proj.color, lw: 2 });
      },
      poise(ch, x, footY, sc, face) { AU.tone(660, 0.18, 'sine', 0.04, 990); },
      // reflet sur le poignet
      glint(ch, x, footY, sc, face) {
        AU.tone(2400, 0.12, 'sine', 0.04);
        const h = handAt(x, footY, sc, face, -2, 128, DXV);
        FX.add({ type: 'star', x: h.x, y: h.y, size: 9 * sc, life: 16, max: 16, col: '#e8f4ff', rot: 0.4 });
      }
    }
  };
})();
