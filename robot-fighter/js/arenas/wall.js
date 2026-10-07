'use strict';
/* Arène 3D : GRANDE MURAILLE — BROUILLON (à remplacer par le décor final). Contrat : voir js/arenas.js. */
ARENA3D.wall = {
  light: { hemi: [0xd0dcff, 0x6a6058, 0.75], key: [0xfff4e8, 1.3], rims: [[0x9fd0ff, 1.0, [1, 0.3, -0.7]], [0xffb070, 0.8, [-1, 0.3, -0.7]], [0xffffff, 0.3, [0, 1, 0.3]]], fog: { color: 0xb8c4d8, near: 2500, far: 14000 }, bg: 0xb8c4d8, refl: 0.05 },
  build(S) {
    const T = S.T, root = S.group();
    const ground = S.mat({ color: 0x8a8580, roughness: 0.6 });
    S.add(root, new T.PlaneGeometry(9000, 9000), ground, { p: [650, 0, -2500], r: [-Math.PI / 2, 0, 0] });
    const r = S.rng(3), box = S.mat({ color: 0x404650, roughness: 0.8 });
    const far = S.group();
    for (let i = 0; i < 40; i++) S.add(far, S.g.box(300 + r() * 500, 600 + r() * 2400, 400), box, { p: [-4000 + i * 230, 0, -4000 - r() * 4000] });
    far.children.forEach(m => m.position.y = m.geometry.parameters.height / 2);
    root.add(S.merge(far));
    root.add(S.particles({ kind: 'snow', count: 1800, box: [-700, 700, 0, 1000, -500, 400], blending: 'normal' }));
    return { root };
  }
};
