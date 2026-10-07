'use strict';
/* Unitree H1 — prototype sur maillages officiels (js/meshes/h1.js) */
if (typeof RK !== 'undefined' && RK) RK.models.h1 = function (ctx) {
  const R = ctx.realData('h1');
  if (!R) return RK.models.default(ctx);
  const L = ctx.L, M = ctx.M, B = R.bodies, k = 0.9;
  const mat = gm => gm.rgba[0] > 0.5 ? M.white : M.shell;
  const hip = [B.right_hip_pitch_link[0], B.right_hip_pitch_link[1], 0];
  const ty = 0.86 * L.to / (k * (B.right_shoulder_roll_link[1] - hip[1]));
  const P = {};
  P.torso = ctx.real('h1', ['pelvis', 'torso_link', 'logo_link'], mat, { pivot: hip, k, s: [1, ty, 1] });
  P.torso = ctx.group(P.torso, ctx.real('h1', /hip_(yaw|roll)_link/, mat, { pivot: hip, k, s: [1, ty, 1] }));
  P.neck = new THREE.Group(); P.head = new THREE.Group();
  for (const [sd, s] of [['f', 'right'], ['b', 'left']]) {
    const sh = B[s + '_shoulder_roll_link'], el = B[s + '_elbow_link'], hp = B[s + '_hip_pitch_link'], kn = B[s + '_knee_link'], an = B[s + '_ankle_link'];
    P[sd + 'sc'] = ctx.real('h1', s + '_shoulder_pitch_link', mat, { pivot: sh, k });
    P[sd + 'ua'] = ctx.real('h1', [s + '_shoulder_roll_link', s + '_shoulder_yaw_link'], mat, { pivot: sh, to: el, len: L.ua, frame: 'limb', k });
    P[sd + 'fa'] = ctx.real('h1', s + '_elbow_link', mat, { pivot: el, to: [el[0] + 30, el[1] - 1, el[2]], len: L.fa, frame: 'limb', k });
    P[sd + 'th'] = ctx.real('h1', s + '_hip_pitch_link', mat, { pivot: hp, to: kn, len: L.th, frame: 'limb', k });
    P[sd + 'sh'] = ctx.real('h1', s + '_knee_link', mat, { pivot: kn, to: an, len: L.sh, frame: 'limb', k });
    P[sd + 'fo'] = ctx.real('h1', s + '_ankle_link', mat, { pivot: an, k });
    P[sd + 'ha'] = new THREE.Group();
  }
  return { parts: P, shZ: B.right_shoulder_roll_link[2] * k, hpZ: B.right_hip_pitch_link[2] * k };
};
