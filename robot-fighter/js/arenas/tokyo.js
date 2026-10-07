'use strict';
/* Arène 3D : TOIT DE NÉO-TOKYO — BROUILLON (à remplacer par le décor final). Contrat : voir js/arenas.js. */
ARENA3D.tokyo = {
  light: { hemi: [0x6f7cff, 0x101018, 0.5], key: [0xd8e2ff, 1.1], rims: [[0xff2fb4, 1.6, [1, 0.3, -0.7]], [0x2fd8ff, 1.6, [-1, 0.3, -0.7]], [0x8a6cff, 0.6, [0, 1, 0.2]]], fog: { color: 0x05070f, near: 2500, far: 14000 }, bg: 0x05070f, refl: 0.45 },
  build(S) {
    const T = S.T, root = S.group();
    const ground = S.mat({ color: 0x1a1d26, roughness: 0.6 });
    S.add(root, new T.PlaneGeometry(9000, 9000), ground, { p: [650, 0, -2500], r: [-Math.PI / 2, 0, 0] });
    const r = S.rng(3), box = S.mat({ color: 0x404650, roughness: 0.8 });
    const far = S.group();
    for (let i = 0; i < 40; i++) S.add(far, S.g.box(300 + r() * 500, 600 + r() * 2400, 400), box, { p: [-4000 + i * 230, 0, -4000 - r() * 4000] });
    far.children.forEach(m => m.position.y = m.geometry.parameters.height / 2);
    root.add(S.merge(far));
    root.add(S.particles({ kind: 'rain', count: 2500, box: [-700, 700, 0, 1000, -500, 400] }));
    return { root };
  }
};
