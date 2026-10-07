'use strict';
/* Arène 3D : ARÈNE MONDIALE — BROUILLON (à remplacer par le décor final). Contrat : voir js/arenas.js. */
ARENA3D.stadium = {
  light: { hemi: [0x8090ff, 0x101016, 0.45], key: [0xffffff, 1.5], rims: [[0xff3fd2, 1.4, [1, 0.3, -0.7]], [0x29e6ff, 1.4, [-1, 0.3, -0.7]], [0xffffff, 0.6, [0, 1, 0.2]]], fog: { color: 0x04050a, near: 2500, far: 14000 }, bg: 0x04050a, refl: 0.35 },
  build(S) {
    const T = S.T, root = S.group();
    const ground = S.mat({ color: 0x15171e, roughness: 0.6 });
    S.add(root, new T.PlaneGeometry(9000, 9000), ground, { p: [650, 0, -2500], r: [-Math.PI / 2, 0, 0] });
    const r = S.rng(3), box = S.mat({ color: 0x404650, roughness: 0.8 });
    const far = S.group();
    for (let i = 0; i < 40; i++) S.add(far, S.g.box(300 + r() * 500, 600 + r() * 2400, 400), box, { p: [-4000 + i * 230, 0, -4000 - r() * 4000] });
    far.children.forEach(m => m.position.y = m.geometry.parameters.height / 2);
    root.add(S.merge(far));
    return { root };
  }
};
