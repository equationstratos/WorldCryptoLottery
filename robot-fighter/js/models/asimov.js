'use strict';
/* Modèle 3D : MENLO RESEARCH ASIMOV v1 — brouillon de placement (v1 : normales transférées) */
if (typeof RK !== 'undefined' && RK) RK.models.asimov = (function () {
  const T = RK.T, PI = Math.PI, D = PI / 180;
  const GEO = {};
  const b64 = s => { const bin = atob(s), n = bin.length, u = new Uint8Array(n); for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i); return u.buffer; };
  function geoN(data, gi) {
    if (GEO[gi]) return GEO[gi];
    const gm = data.geoms[gi], b = gm.b, q = new Int16Array(b64(gm.v));
    const pos = new Float32Array(q.length);
    for (let i = 0; i < q.length; i += 3) for (let k = 0; k < 3; k++) pos[i + k] = b[k] + (q[i + k] + 32768) / 65535 * (b[k + 3] - b[k]);
    const idx = gm.i32 ? new Uint32Array(b64(gm.i)) : new Uint16Array(b64(gm.i));
    let geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(pos, 3));
    geo.setIndex(new T.BufferAttribute(idx, 1));
    if (gm.n) {
      const n8 = new Int8Array(b64(gm.n)), nf = new Float32Array(n8.length);
      for (let i = 0; i < n8.length; i += 3) { const x = n8[i], y = n8[i + 1], z = n8[i + 2], l = Math.hypot(x, y, z) || 1; nf[i] = x / l; nf[i + 1] = y / l; nf[i + 2] = z / l; }
      geo.setAttribute('normal', new T.BufferAttribute(nf, 3));
    } else geo = T.BufferGeometryUtils.toCreasedNormals(geo, 34 * D);
    geo.computeBoundingSphere();
    return (GEO[gi] = geo);
  }
  return function (ctx) {
    const R = ctx.realData('asimov');
    if (!R) return RK.models.default(ctx);
    const { M, L } = ctx, B = R.bodies, P = {};
    const low = ctx.lod === 'low';
    const KU = 1.357; const RAW = /raw=1/.test(location.search);
    const realN = (sel, mat, o) => {
      const test = typeof sel === 'function' ? sel : (gm) => [].concat(sel).includes(gm.name);
      if (low) return ctx.real('asimov', gm => gm.triLow > 0 && test(gm), mat, o);
      const gr = new T.Group(), M4 = ctx.realMatrix(o);
      R.geoms.forEach((gm, gi) => { if (!test(gm)) return; const m = new T.Mesh(geoN(R, gi), mat); m.matrixAutoUpdate = false; m.matrix.copy(M4); gr.add(m); });
      return gr;
    };
    const C = (c) => ctx.mat({ color: c, roughness: 0.6, metalness: 0.1 });
    const A = C(0x3a4044), Bm = C(0xc9a25a), Cm = C(0x5577aa), Dm = C(0xaa5555), Em = C(0x55aa77);
    const HIP = [-5.2, 58.596, 0], NB = [-5.2, HIP[1] + L.to / KU, 0], HB = [-5.2, NB[1] + L.nk / KU, 0];
    P.torso = ctx.group(realN('waist_yaw_link_visual', A, { pivot: HIP, k: KU }), realN('pelvis_visual', Em, { pivot: HIP, k: KU }));
    P.neck = realN('neck_yaw_link_visual', Cm, { pivot: NB, k: KU });
    P.head = realN('neck_pitch_link_visual', A, { pivot: HB, k: KU });
    for (const [sd, s, z] of [['f', 'right', 1], ['b', 'left', -1]]) {
      const sh = B[s + '_shoulder_roll_link'], el = B[s + '_elbow_link'], wr = B[s + '_wrist_yaw_link'];
      const hp = [-5.2, 58.596, z * 11.4], kn = B[s + '_knee_link'], an = B[s + '_ankle_pitch_link'];
      P[sd + 'sc'] = realN(s + '_shoulder_pitch_link_visual', Bm, { pivot: [sh[0], sh[1], sh[2]], k: KU });
      P[sd + 'ua'] = ctx.group(realN(s + '_shoulder_roll_link_visual', Cm, { pivot: sh, to: el, frame: 'limb', k: KU, len: RAW ? 0 : L.ua }), realN(s + '_shoulder_yaw_link_visual', Em, { pivot: sh, to: el, frame: 'limb', k: KU, len: RAW ? 0 : L.ua }));
      P[sd + 'fa'] = ctx.group(realN(s + '_elbow_link_visual', Dm, { pivot: el, to: wr, frame: 'limb', k: KU, len: RAW ? 0 : L.fa }), realN(s + '_wrist_yaw_link_visual', Bm, { pivot: el, to: wr, frame: 'limb', k: KU, len: RAW ? 0 : L.fa }));
      P[sd + 'hi'] = ctx.group(realN(s + '_hip_pitch_link_visual', Bm, { pivot: hp, frame: 'limb', k: KU }), realN(s + '_hip_roll_link_visual', Em, { pivot: hp, frame: 'limb', k: KU }));
      P[sd + 'th'] = realN(s + '_hip_yaw_link_visual', Cm, { pivot: hp, to: kn, frame: 'limb', k: KU, len: RAW ? 0 : L.th });
      P[sd + 'sh'] = realN(s + '_knee_link_visual', Dm, { pivot: kn, to: an, frame: 'limb', k: KU, len: RAW ? 0 : L.sh });
      P[sd + 'fo'] = ctx.group(realN(s + '_ankle_pitch_link_visual', Bm, { pivot: an, k: KU, s: [1, 7 / (4.465 * KU), 1] }), realN(s + '_ankle_roll_link_visual', A, { pivot: an, k: KU, s: [1, 7 / (4.465 * KU), 1] }));
      P[sd + 'ha'] = RK.hand(ctx, { side: z });
    }
    if (/rigid=1/.test(location.search)) { // debug : robot rigide en pose de repos réelle
      for (const k in P) P[k] = new T.Group();
      const cols = [A, Bm, Cm, Dm, Em];
      const FOC = { elbow: B.right_elbow_link, wrist: B.right_wrist_yaw_link, knee: B.right_knee_link, ankle: B.right_ankle_pitch_link, hip: B.right_hip_roll_link, shoulder: B.right_shoulder_roll_link, neck: B.neck_pitch_link, chest: [0, 95, 0], pelvis: [-5, 60, 0] };
      const fm = /foc=(\w+)/.exec(location.search), fp = fm && FOC[fm[1]];
      R.geoms.forEach((gm, gi) => (fp ? P.head : P.torso).add(realN(gm.name, cols[gi % 5], { pivot: fp || HIP, k: KU })));
    }
    return { parts: P, shZ: 16.185 * KU, hpZ: 11.4 * KU };
  };
})();
