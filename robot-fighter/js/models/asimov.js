'use strict';
/* Modèle 3D : MENLO RESEARCH ASIMOV v1 — brouillon de placement */
if (typeof RK !== 'undefined' && RK) RK.models.asimov = (function () {
  return function (ctx) {
    const R = ctx.realData('asimov');
    if (!R) return RK.models.default(ctx);
    const { M, L } = ctx, B = R.bodies, P = {};
    const KU = 1.357; const RAW = /raw=1/.test(location.search);
    const C = (c) => ctx.mat({ color: c, roughness: 0.6, metalness: 0.1 });
    const A = C(0x3a4044), Bm = C(0xc9a25a), Cm = C(0x5577aa), Dm = C(0xaa5555);
    const HIP = [-5.2, 58.596, 0], NB = [-5.2, HIP[1] + L.to / KU, 0], HB = [-5.2, NB[1] + L.nk / KU, 0];
    P.torso = ctx.group(ctx.real('asimov', ['pelvis_visual', 'waist_yaw_link_visual'], A, { pivot: HIP, k: KU }));
    P.neck = ctx.real('asimov', 'neck_yaw_link_visual', Cm, { pivot: NB, k: KU });
    P.head = ctx.real('asimov', 'neck_pitch_link_visual', A, { pivot: HB, k: KU });
    for (const [sd, s, z] of [['f', 'right', 1], ['b', 'left', -1]]) {
      const sh = B[s + '_shoulder_roll_link'], el = B[s + '_elbow_link'], wr = B[s + '_wrist_yaw_link'];
      const hp = [-5.2, 58.596, z * 11.4], kn = B[s + '_knee_link'], an = B[s + '_ankle_pitch_link'];
      P[sd + 'sc'] = ctx.real('asimov', s + '_shoulder_pitch_link_visual', Bm, { pivot: [sh[0], sh[1], sh[2]], k: KU });
      P[sd + 'ua'] = ctx.real('asimov', [s + '_shoulder_roll_link_visual', s + '_shoulder_yaw_link_visual'], Cm, { pivot: sh, to: el, frame: 'limb', k: KU, len: RAW ? 0 : L.ua });
      P[sd + 'fa'] = ctx.real('asimov', [s + '_elbow_link_visual', s + '_wrist_yaw_link_visual'], Dm, { pivot: el, to: wr, frame: 'limb', k: KU, len: RAW ? 0 : L.fa });
      P[sd + 'hi'] = ctx.real('asimov', [s + '_hip_pitch_link_visual', s + '_hip_roll_link_visual'], Bm, { pivot: hp, frame: 'limb', k: KU });
      P[sd + 'th'] = ctx.real('asimov', s + '_hip_yaw_link_visual', Cm, { pivot: hp, to: kn, frame: 'limb', k: KU, len: RAW ? 0 : L.th });
      P[sd + 'sh'] = ctx.real('asimov', s + '_knee_link_visual', Dm, { pivot: kn, to: an, frame: 'limb', k: KU, len: RAW ? 0 : L.sh });
      P[sd + 'fo'] = ctx.real('asimov', [s + '_ankle_pitch_link_visual', s + '_ankle_roll_link_visual'], A, { pivot: an, k: KU, s: [1, 7 / (4.465 * KU), 1] });
      P[sd + 'ha'] = RK.hand(ctx, { side: z });
    }
    return { parts: P, shZ: 16.185 * KU, hpZ: 11.4 * KU };
  };
})();
