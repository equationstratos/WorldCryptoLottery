'use strict';
/* Modèle 3D : APPTRONIK APOLLO — prototype (maillages officiels js/meshes/apollo.js) */
if (typeof RK !== 'undefined' && RK) RK.models.apollo = function (ctx) {
  const R = ctx.realData('apollo');
  if (!R) return RK.models.default(ctx);
  const { L, M } = ctx, B = R.bodies, k = 1.03;
  const mat = gm => gm.rgba[0] > 0.5 ? M.white : M.dark;
  const HIP = [-2, 91.255, 0];
  const P = {};
  const tsy = 0.86 * L.to / (k * (143.255 - HIP[1]));
  P.torso = ctx.real('apollo', /pelvis_link|torso_roll_link|torso_pitch_link|^torso_link|neck_mount_fix_link|battery_mount_fix/, mat, { pivot: HIP, k, s: [1, tsy, 1] });
  const neckY = HIP[1] + L.to / (k * tsy);
  P.neck = ctx.real('apollo', 'neck_yaw_link', mat, { pivot: [HIP[0], neckY, 0], k, p: [0, 2, 0] });
  P.head = ctx.real('apollo', 'afh_2_1_link', mat, { pivot: [HIP[0], neckY + L.nk / k, 0], k });
  for (const [sd, s, z] of [['f', 'r', 1], ['b', 'l', -1]]) {
    const sh = B[s + '_shoulder_fe_link'], el = B[s + '_elbow_fe_link'], hp = B[s + '_hip_fe_link'], kn = B[s + '_knee_fe_link'], an = B[s + '_foot_link'];
    const wr = [-2.5, 81.5, z * 23.5];
    P[sd + 'sc'] = ctx.real('apollo', [s + '_shoulder_aa_link', s + '_shoulder_ie_link'], mat, { pivot: sh, k });
    P[sd + 'ua'] = ctx.real('apollo', s + '_shoulder_fe_link', mat, { pivot: sh, to: el, len: L.ua, frame: 'limb', k });
    P[sd + 'fa'] = ctx.real('apollo', gm => gm.body === s + '_elbow_fe_link' || gm.body === s + '_wrist_roll_link' || gm.body === s + '_wrist_yaw_link' || (gm.body === s + '_wrist_pitch_link' && /wrist/i.test(gm.name)), mat, { pivot: el, to: wr, len: L.fa, frame: 'limb', k });
    const dir = [wr[0] - el[0], wr[1] - el[1]];
    P[sd + 'ha'] = ctx.real('apollo', gm => gm.body === s + '_wrist_pitch_link' && !/wrist/i.test(gm.name), mat, { pivot: wr, to: [wr[0] + dir[0], wr[1] + dir[1], wr[2]], frame: 'hand', k, r: [-z * Math.PI / 2, 0, 0] });
    P[sd + 'hi'] = ctx.real('apollo', [s + '_hip_ie_link', s + '_hip_aa_link'], mat, { pivot: hp, to: kn, frame: 'limb', k });
    P[sd + 'th'] = ctx.real('apollo', s + '_hip_fe_link', mat, { pivot: hp, to: kn, len: L.th, frame: 'limb', k });
    P[sd + 'sh'] = ctx.real('apollo', s + '_knee_fe_link', mat, { pivot: kn, to: an, len: L.sh, frame: 'limb', k });
    P[sd + 'fo'] = ctx.real('apollo', [s + '_ankle_ie_link', s + '_foot_link'], mat, { pivot: an, k });
  }
  return { parts: P, shZ: 23.912 * k, hpZ: 11 * k };
};
