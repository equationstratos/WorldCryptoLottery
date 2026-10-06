'use strict';
/* =========================================================
   SCÈNES : titre, menu, sélection, VS, combat (HUD), fin + boucle
   ========================================================= */
let scene = null, nextScene = null, fade = 0, gFrame = 0;
function setScene(s) { nextScene = s; }
const GAME = { mode: 'arcade', p1: 0, p2: 1, ladder: [], idx: 0 };

function circleRect(cx, cy, r, b) {
  const x = clamp(cx, b.x0, b.x1), y = clamp(cy, b.y0, b.y1);
  return (cx - x) ** 2 + (cy - y) ** 2 <= r * r ? { x, y } : null;
}
const inRect = (t, x, y, w, h) => t.x >= x && t.x <= x + w && t.y >= y && t.y <= y + h;

/* =================== COMBAT =================== */
class Fight {
  constructor(ch1, ch2, stageIdx, opt) {
    this.opt = opt;
    this.p = [new Fighter(ch1, 0), new Fighter(ch2, 1)];
    this.ai = [opt.cpu0 ? new AI(opt.level || 3) : null, opt.cpu1 ? new AI(opt.level || 3) : null];
    this.stage = STAGES[stageIdx];
    this.round = 1; this.frame = 0; this.camX = (STAGE_W - W) / 2; this.zoom = 1; this.zx = W / 2; this.zy = H / 2;
    this.paused = false; this.pauseSel = 0; this.showMoves = false;
    this.startRound();
  }
  startRound() {
    this.p.forEach(f => f.reset());
    this.projs = []; FX.clear();
    this.timer = 99; this.tf = 0; this.phase = 'intro'; this.phaseT = 0;
    this.hitstop = 0; this.slowmo = 0; this.shake = 0; this.flash = 0; this.flashCol = '#fff';
    this.superFreeze = 0; this.superBy = null; this.combo = [null, null]; this.ann = null;
    this.camX = (STAGE_W - W) / 2;
  }
  other(f) { return this.p[0] === f ? this.p[1] : this.p[0]; }
  clampX(x, f) {
    const o = this.other(f);
    let lo = 40, hi = STAGE_W - 40;
    if (o) { lo = Math.max(lo, o.x - (W - 100)); hi = Math.min(hi, o.x + (W - 100)); }
    return clamp(x, lo, hi);
  }
  announce(text, dur, style = {}) { this.ann = { text, t: 0, dur, ...style }; }
  startSuper(f) {
    f.meter -= 100; f.setSt('super'); f.sp = f.ch.sup; f.inv = 999; f.hitN = 0; f.hitCD = 0; f.connected = false; f.vx = 0; f.beam = null;
    this.superFreeze = 62; this.superBy = f;
    AU.sfx('super'); AU.say(f.ch.supName, 0.5, 1.05);
    explosion(f.x, f.hipY - 40, f.ch.accent, 0.8);
  }
  applyHit(a, d, pt, mv, canBlock = true, src = null) {
    const awayX = Math.sign(d.x - (src ? src.x - src.vx * 3 : a.x)) || -d.face;
    const pad = d.pad, held = pad ? pad.held : {};
    const holdBack = d.cpuHold ? false : (awayX > 0 ? held.r : held.l);
    const crouch = !!held.d;
    const hOk = mv.h === 'low' ? crouch : mv.h === 'high' ? !crouch : true;
    const ch = a.ch;
    if (canBlock && d.canBlock && holdBack && hOk && !d.air) {
      d.crouching = crouch; d.setSt('block'); d.stun = mv.bs || 12;
      d.push = awayX * (mv.kb || 6) * 0.9; d.pushSrc = a;
      const chip = mv.chip ? Math.round(mv.dmg * ch.power * 0.18) : 0;
      d.hp = Math.max(mv.sup ? 0 : 1, d.hp - chip);
      hitSpark(pt.x, pt.y, 1, '#7fd0ff', awayX, true);
      AU.sfx('block'); this.hitstop = Math.max(this.hitstop, 5);
      a.meter = Math.min(100, a.meter + 3); d.meter = Math.min(100, d.meter + 4);
      return 'block';
    }
    const inStun = d.st === 'hit' || d.st === 'fall';
    a.combo = inStun ? a.combo + 1 : 1;
    const scale = mv.sup ? 1 : 1 - Math.min(0.5, (a.combo - 1) * 0.09);
    const dmg = Math.round(mv.dmg * ch.power * scale);
    d.hp = Math.max(0, d.hp - dmg);
    d.flash = 5; d.crouching = crouch && !d.air && d.st !== 'fall';
    d.mv = null; d.amv = null; d.hover = false; d.ghostOn = false; d.beam = null; d.grav = 0.75;
    if (d.st === 'special' || d.st === 'super') d.inv = 0;
    if (mv.drag) {
      d.setSt('fall'); d.t = 3; d.x = this.clampX(a.x + a.face * 42, d); d.y = Math.min(d.y, a.y - 8, GROUND - 1); d.vy = a.vy; d.vx = a.vx;
    } else if (d.air || mv.kd || d.hp <= 0) {
      d.setSt('fall'); d.vy = (mv.launch || -7) - (d.hp <= 0 ? 3 : 0); d.vx = awayX * (3 + (mv.kb || 5) * 0.2) * (d.hp <= 0 ? 1.6 : 1);
      d.y = Math.min(d.y, GROUND - 1);
    } else {
      d.setSt('hit'); d.stun = mv.hs || 16; d.push = awayX * (mv.kb || 6); d.pushSrc = a;
    }
    const lvl = mv.lvl || 1;
    hitSpark(pt.x, pt.y, Math.min(lvl, 3), ch.accent, awayX, false);
    AU.sfx(lvl >= 3 ? 'hitS' : lvl === 2 ? 'hitH' : 'hitL');
    this.hitstop = Math.max(this.hitstop, mv.sup ? 3 : 3 + lvl * 3);
    this.shake = Math.max(this.shake, lvl * 3 + (mv.sup ? 2 : 0));
    if (!mv.sup) a.meter = Math.min(100, a.meter + dmg * 0.14 + 2);
    d.meter = Math.min(100, d.meter + dmg * 0.07);
    if (a.combo >= 2) this.combo[a.side] = { n: a.combo, t: 0 };
    return 'hit';
  }
  checkHits() {
    for (let i = 0; i < 2; i++) {
      const a = this.p[i], d = this.p[1 - i];
      const hb = a.activeHit();
      if (hb) {
        const hr = (d.st === 'fall' && hb.mv.sup) ? d.hurtboxAny() : d.hurtbox();
        const pt = hr && circleRect(hb.x, hb.y, hb.r, hr);
        if (pt) {
          let mv = hb.mv;
          const last = a.hitN + 1 >= (mv.hits || 1);
          if (mv === SPECIAL_MV.storm && last) mv = { ...mv, dmg: 90, kd: true, launch: -12, drag: false, kb: 8 };
          const res = this.applyHit(a, d, pt, mv);
          a.hitN++; a.hitCD = mv.every || 999; a.connected = true;
          if (a.st === 'super' && a.sp === 'rush' && res === 'hit') {
            a.sp = 'barrage'; a.t = 0; a.vx = 0; d.setSt('hit'); d.stun = 999; d.push = 0;
            this.flash = 4; this.shake = 10;
          }
          if (a.st === 'special' && a.sp === 'rush') a.vx *= 0.3;
        }
      }
      // super laser
      if (a.beam && a.beam.t % 5 === 0) {
        const bx0 = a.face > 0 ? a.beam.x : a.beam.x - 1400, bx1 = a.face > 0 ? a.beam.x + 1400 : a.beam.x;
        const hr = d.hurtboxAny();
        if (hr && hr.x1 > bx0 && hr.x0 < bx1 && hr.y1 > a.beam.y - 48 && hr.y0 < a.beam.y + 48 && d.st !== 'down' && d.st !== 'getup') {
          const lastHit = a.beam.t >= 64;
          const mv = lastHit ? { ...SPECIAL_MV.beam, dmg: 70, kd: true, launch: -10, kb: 8 } : SPECIAL_MV.beam;
          if (d.st === 'fall' && !lastHit) { d.vy = Math.min(d.vy, -2); d.vx = a.face * 1.5; d.hp = Math.max(0, d.hp - 18); d.flash = 3; hitSpark(clamp(a.beam.x + a.face * 400, hr.x0, hr.x1), a.beam.y, 2, a.ch.accent, a.face); AU.sfx('hitL'); }
          else this.applyHit(a, d, { x: a.face > 0 ? hr.x0 + 10 : hr.x1 - 10, y: clamp(a.beam.y, hr.y0, hr.y1) }, mv);
        }
        for (const pr of this.projs) if (pr.f !== a && Math.abs(pr.y - a.beam.y) < 60 && pr.x > bx0 && pr.x < bx1) { pr.dead = true; explosion(pr.x, pr.y, pr.col, 0.6); }
      }
    }
  }
  updateProjs() {
    for (const pr of this.projs) {
      if (pr.dead) continue;
      pr.update();
      if (pr.x < this.camX - 150 || pr.x > this.camX + W + 150) pr.dead = true;
      for (const q of this.projs) if (q !== pr && !q.dead && q.f !== pr.f && Math.abs(q.x - pr.x) < 40 && Math.abs(q.y - pr.y) < 50) {
        q.dead = pr.dead = true; explosion((q.x + pr.x) / 2, (q.y + pr.y) / 2, '#ffffff', 0.8); AU.sfx('clash'); this.shake = 8;
      }
      if (pr.dead) continue;
      const d = this.other(pr.f), hr = d.hurtbox();
      const pt = hr && circleRect(pr.x, pr.y, pr.r, hr);
      if (pt) {
        pr.dead = true;
        this.applyHit(pr.f, d, pt, { ...SPECIAL_MV.proj, dmg: SPECIAL_MV.proj.dmg * (pr.vx * pr.vx > 60 ? 1 : 0.9) }, true, pr);
        explosion(pt.x, pt.y, pr.col, 0.6);
      }
    }
    this.projs = this.projs.filter(pr => { if (pr.dead && pr.f.proj === pr) pr.f.proj = null; return !pr.dead; });
  }
  bodyPush() {
    const [a, b] = this.p;
    if (['down', 'getup'].includes(a.st) || ['down', 'getup'].includes(b.st)) return;
    if (a.st === 'super' && a.sp === 'barrage' || b.st === 'super' && b.sp === 'barrage') return;
    const minD = 46 * (a.ch.scale + b.ch.scale) / 2;
    const dx = b.x - a.x, ady = Math.abs(a.y - b.y);
    if (Math.abs(dx) < minD && ady < 110) {
      const ov = (minD - Math.abs(dx)) / 2, s = Math.sign(dx) || (a.side ? -1 : 1);
      const ax = this.clampX(a.x - s * ov, a), bx = this.clampX(b.x + s * ov, b);
      const lost = (a.x - s * ov - ax) + (b.x + s * ov - bx);
      a.x = this.clampX(ax - lost, a); b.x = this.clampX(bx - lost, b);
    }
  }
  update() {
    // pause
    const startP = pads.some(p => p.pressed.start);
    if ((escPressed || startP) && this.phase !== 'done') { this.paused = !this.paused; this.pauseSel = 0; this.showMoves = false; AU.sfx('select'); return; }
    if (this.paused) return this.updatePause();
    this.frame++;
    for (const k in this.combo) if (this.combo[k] && ++this.combo[k].t > 70) this.combo[k] = null;
    if (this.ann) this.ann.t++;
    if (this.flash > 0) this.flash--;
    this.shake *= 0.86; if (this.shake < 0.3) this.shake = 0;
    FX.update();
    if (this.superFreeze > 0) {
      this.superFreeze--;
      const f = this.superBy, c = f.wp('fha');
      for (let i = 0; i < 3; i++) FX.add({ type: 'glow', x: c.x + rand(-160, 160), y: c.y + rand(-160, 160), size: rand(6, 12), life: 16, max: 16, col: f.ch.accent, target: c });
      f.computeSkel();
      return;
    }
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.slowmo > 0) { this.slowmo--; if (this.slowmo % 3) return; }
    this.phaseT++;
    const ctrl = this.phase === 'fight';
    for (let i = 0; i < 2; i++) {
      const f = this.p[i], o = this.p[1 - i];
      let pad = null;
      if (ctrl) pad = this.ai[i] ? this.ai[i].think(f, o, this) : pads[this.opt.versus ? i : 0];
      if (this.ai[i] && pad) f.cpuHold = false;
      f.update(pad, o, this, ctrl);
    }
    this.updateProjs();
    this.bodyPush();
    this.checkHits();
    // caméra
    const tgt = clamp((this.p[0].x + this.p[1].x) / 2 - W / 2, 0, STAGE_W - W);
    this.camX += (tgt - this.camX) * 0.15;
    this.flow();
  }
  flow() {
    const [a, b] = this.p;
    if (this.phase === 'intro') {
      if (this.phaseT === 10) { this.announce(this.round >= 3 && a.wins === 1 && b.wins === 1 ? 'FINAL ROUND' : 'ROUND ' + this.round, 80); AU.say(this.round >= 3 && a.wins === 1 && b.wins === 1 ? 'Final round' : 'Round ' + this.round); }
      if (this.phaseT === 95) { this.announce('FIGHT!', 50, { big: 1 }); AU.say('Fight!', 0.5, 1.1); AU.sfx('hitS'); this.shake = 8; }
      if (this.phaseT >= 120) { this.phase = 'fight'; this.phaseT = 0; }
      return;
    }
    if (this.phase === 'fight') {
      if (++this.tf >= 60) { this.tf = 0; if (this.timer > 0) this.timer--; }
      const ka = a.hp <= 0, kb = b.hp <= 0;
      if (ka || kb) {
        this.phase = 'ko'; this.phaseT = 0; this.slowmo = 75; this.flash = 10; this.flashCol = '#fff'; this.shake = 20;
        [a, b].forEach(f => { if (f.hp <= 0) { f.ko = true; if (f.st !== 'fall') { f.setSt('fall'); f.vy = -11; f.vx = -f.face * 6; f.y = Math.min(f.y, GROUND - 1); } } });
        this.announce(ka && kb ? 'DOUBLE K.O.' : 'K.O.', 140, { big: 1, red: 1 });
        AU.sfx('ko'); AU.say('K.O.', 0.3, 0.7);
        this.winner = ka && kb ? -1 : ka ? 1 : 0;
      } else if (this.timer <= 0) {
        this.phase = 'ko'; this.phaseT = 0; this.announce('TIME OVER', 140, { big: 1 }); AU.say('Time over');
        this.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
        if (this.winner >= 0) this.p[1 - this.winner].ko = true;
      }
      return;
    }
    if (this.phase === 'ko') {
      const settled = this.p.every(f => !f.air && f.st !== 'fall' && (f.st !== 'super' && f.st !== 'special'));
      if (this.phaseT > 90 && settled) {
        this.phase = 'roundEnd'; this.phaseT = 0;
        if (this.winner >= 0) {
          const w = this.p[this.winner], l = this.p[1 - this.winner];
          w.wins++; w.setSt('win'); w.vx = 0; if (l.st !== 'down') l.setSt('lose');
          const perfect = w.hp >= w.maxHp || w.hp >= 1000;
          let txt = this.opt.versus ? `${w.ch.name} GAGNE` : (this.winner === 0 ? 'YOU WIN' : 'YOU LOSE');
          this.announce(txt, 150, { big: 1 });
          if (perfect) setTimeout(() => AU.say('Perfect!'), 50), this.perfect = 60;
          else AU.say(this.opt.versus ? `${w.ch.name} wins` : (this.winner === 0 ? 'You win' : 'You lose'));
          AU.playTrack(this.winner === 0 || this.opt.versus ? TRACKS.win : null);
        } else { this.announce('MATCH NUL', 120, { big: 1 }); }
      }
      return;
    }
    if (this.phase === 'roundEnd') {
      if (this.perfect) this.perfect--;
      if (this.phaseT > 170) {
        const w = this.p.find(f => f.wins >= 2);
        if (w || this.round >= 5) { this.phase = 'done'; this.opt.onEnd(w ? w.side : (a.wins >= b.wins ? 0 : 1)); }
        else { this.round++; this.startRound(); AU.playTrack(TRACKS[this.stage.track]); }
      }
    }
  }
  updatePause() {
    const pd = pads[0];
    if (this.showMoves) { if (confirmPressed(pd) || tapQueue.length) this.showMoves = false; tapQueue = []; return; }
    if (pd.pressed.u) { this.pauseSel = (this.pauseSel + 2) % 3; AU.sfx('move'); }
    if (pd.pressed.d) { this.pauseSel = (this.pauseSel + 1) % 3; AU.sfx('move'); }
    let choose = confirmPressed(pd) ? this.pauseSel : -1;
    for (const t of tapQueue) for (let i = 0; i < 3; i++) if (inRect(t, W / 2 - 170, 230 + i * 56 - 22, 340, 44)) choose = i;
    tapQueue = [];
    if (choose === 0) this.paused = false;
    if (choose === 1) this.showMoves = true;
    if (choose === 2) { this.paused = false; this.phase = 'done'; setScene(new TitleScene(true)); }
  }
  /* ---------- rendu ---------- */
  draw() {
    const c = ctx;
    const sb = this.superFreeze > 0 ? this.superBy : null;
    const tz = sb ? 1.22 : 1;
    this.zoom += (tz - this.zoom) * 0.15;
    if (sb) { this.zx += (sb.x - this.camX - this.zx) * 0.2; this.zy += (sb.hipY - 60 - this.zy) * 0.2; }
    else { this.zx += (W / 2 - this.zx) * 0.2; this.zy += (H / 2 - this.zy) * 0.2; }
    c.save();
    const sx = this.shake ? rand(-this.shake, this.shake) : 0, sy = this.shake ? rand(-this.shake, this.shake) * 0.6 : 0;
    c.translate(this.zx + sx, this.zy + sy); c.scale(this.zoom, this.zoom); c.translate(-this.zx, -this.zy);
    this.stage.draw(c, this.camX, this.frame);
    // assombrissement pendant un super
    if (sb) {
      const k = Math.min(1, (62 - this.superFreeze) / 8);
      c.fillStyle = `rgba(0,0,12,${0.72 * k})`; c.fillRect(-100, -100, W + 200, H + 200);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hexA(sb.ch.accent, 0.35); c.lineWidth = 3;
      const cx = sb.x - this.camX, cy = sb.hipY - 40;
      for (let i = 0; i < 40; i++) { const a = rand(0, Math.PI * 2), r0 = rand(120, 220); c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * 900, cy + Math.sin(a) * 900); c.stroke(); }
      c.restore();
    }
    c.translate(-this.camX, 0);
    // reflets sur sol brillant
    if (this.stage.wet) {
      c.save(); c.beginPath(); c.rect(this.camX - 100, FLOOR_Y, W + 200, H); c.clip();
      c.translate(0, GROUND * 2 + 4); c.scale(1, -1); c.globalAlpha = this.stage.wet;
      for (const f of this.p) drawRobot(c, f.ch, f.pose, f.x, f.hipY, f.face, 1, { skel: f.skel, noExtras: true });
      c.restore();
    }
    // ombres
    for (const f of this.p) {
      const k = clamp(1 - (GROUND - f.y) / 300, 0.3, 1);
      c.fillStyle = `rgba(0,0,0,${0.45 * k})`; c.beginPath(); c.ellipse(f.x, GROUND + 4, 44 * k * f.ch.scale, 9 * k, 0, 0, 7); c.fill();
    }
    // combattants (l'attaquant devant)
    const order = [...this.p].sort((a, b) => (a.st === 'super' || a.st === 'special' || a.st === 'attack' ? 1 : 0) - (b.st === 'super' || b.st === 'special' || b.st === 'attack' ? 1 : 0));
    for (const f of order) f.draw(c, this);
    for (const f of this.p) if (f.beam) this.drawBeam(c, f);
    for (const pr of this.projs) pr.draw(c);
    FX.draw(c);
    c.restore();
    if (this.stage.front) this.stage.front(c, this.camX, this.frame);
    if (this.flash > 0) { c.fillStyle = this.flashCol; c.globalAlpha = this.flash / 12; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    if (sb) this.drawCutIn(c, sb);
    this.drawHUD(c);
    this.drawAnnounce(c);
    if (this.paused) this.drawPause(c);
  }
  drawBeam(c, f) {
    const b = f.beam, dir = f.face, len = 1400, t = b.t;
    const grow = Math.min(1, t / 6) * (t > 60 ? Math.max(0, 1 - (t - 60) / 10) : 1);
    const hgt = (46 + Math.sin(t * 0.9) * 8) * grow;
    c.save(); c.globalCompositeOperation = 'lighter';
    const x0 = b.x, x1 = b.x + dir * len;
    let g = c.createLinearGradient(0, b.y - hgt * 1.6, 0, b.y + hgt * 1.6);
    g.addColorStop(0, hexA(f.ch.accent, 0)); g.addColorStop(0.3, hexA(f.ch.accent, 0.6)); g.addColorStop(0.5, '#ffffff');
    g.addColorStop(0.7, hexA(f.ch.accent, 0.6)); g.addColorStop(1, hexA(f.ch.accent, 0));
    c.fillStyle = g; c.fillRect(Math.min(x0, x1), b.y - hgt * 1.6, len, hgt * 3.2);
    c.fillStyle = '#fff'; c.fillRect(Math.min(x0, x1), b.y - hgt * 0.25, len, hgt * 0.5);
    // ondulations
    c.strokeStyle = hexA(f.ch.proj.core, 0.8); c.lineWidth = 3;
    for (let k = 0; k < 2; k++) {
      c.beginPath();
      for (let i = 0; i <= 60; i++) { const x = x0 + dir * i * (len / 60), y = b.y + Math.sin(i * 0.6 + t * 0.8 + k * 3) * hgt * 0.8; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.stroke();
    }
    // boule à la source
    g = c.createRadialGradient(x0, b.y, 0, x0, b.y, hgt * 2.4);
    g.addColorStop(0, '#fff'); g.addColorStop(0.4, hexA(f.ch.accent, 0.8)); g.addColorStop(1, hexA(f.ch.accent, 0));
    c.fillStyle = g; c.beginPath(); c.arc(x0, b.y, hgt * 2.4, 0, 7); c.fill();
    c.restore();
  }
  drawCutIn(c, f) {
    const t = 62 - this.superFreeze;
    const inK = easeOut(clamp(t / 10, 0, 1)), outK = clamp((this.superFreeze - 0) / 8, 0, 1);
    const k = inK * outK;
    const left = f.side === 0;
    c.save();
    const y = 168, h = 150;
    c.globalAlpha = k;
    c.translate(0, y);
    c.transform(1, -0.08, 0, 1, 0, 0);
    let g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, hexA(f.ch.accent, left ? 0.95 : 0.2)); g.addColorStop(1, hexA(f.ch.accent, left ? 0.2 : 0.95));
    c.fillStyle = '#000'; c.fillRect(0, -6, W, h + 12);
    c.fillStyle = g; c.fillRect(0, 0, W, h);
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 2;
    for (let i = 0; i < 30; i++) { const lx = ((i * 53 + t * 40 * (left ? 1 : -1)) % (W + 200) + W + 200) % (W + 200) - 100; c.beginPath(); c.moveTo(lx, 0); c.lineTo(lx + 60, h); c.stroke(); }
    // portrait géant
    c.save(); c.beginPath(); c.rect(0, 0, W, h); c.clip();
    const px = left ? lerp(-200, 210, inK) : lerp(W + 200, W - 210, inK);
    const pose = mkPose({ ...POSES.idle, lean: 6, fs: 160, fe: 20, hd: -8 });
    drawRobot(c, f.ch, pose, px, h * 1.7, left ? 1 : -1, 2.6);
    c.restore();
    c.restore();
    c.save(); c.globalAlpha = k;
    const tx = left ? lerp(W + 300, W - 60, inK) : lerp(-300, 60, inK);
    txt('SUPER', tx, y + 30, 18, { align: left ? 'right' : 'left', color: '#fff', stroke: '#000', sw: 5 });
    bigTxt(f.ch.supName, tx, y + 82, 40, { align: left ? 'right' : 'left' });
    c.restore();
  }
  drawHUD(c) {
    const [a, b] = this.p;
    const bw = 360, by = 22, bh = 20;
    const bar = (f, x, flip) => {
      c.save();
      c.translate(x, by);
      if (flip) { c.translate(bw, 0); c.scale(-1, 1); }
      c.fillStyle = '#000'; c.beginPath(); c.moveTo(-4, -4); c.lineTo(bw + 14, -4); c.lineTo(bw + 4, bh + 4); c.lineTo(-4, bh + 4); c.fill();
      c.fillStyle = '#3a0a0a'; c.fillRect(0, 0, bw, bh);
      const lag = bw * f.dispHp / 1000, cur = bw * f.hp / 1000;
      c.fillStyle = '#e8261b'; c.fillRect(bw - lag, 0, lag, bh);
      const low = f.hp < 250 && (this.frame % 30 < 15);
      const g = c.createLinearGradient(0, 0, 0, bh);
      if (low) { g.addColorStop(0, '#ffb0a0'); g.addColorStop(1, '#ff3a1a'); }
      else { g.addColorStop(0, '#fff6a0'); g.addColorStop(0.5, '#ffd21a'); g.addColorStop(1, '#ff9a00'); }
      c.fillStyle = g; c.fillRect(bw - cur, 0, cur, bh);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(bw - cur, 2, cur, 3);
      c.strokeStyle = '#ffe7a0'; c.lineWidth = 2; c.strokeRect(0, 0, bw, bh);
      c.restore();
    };
    bar(a, 70, false); bar(b, W - 70 - bw, true);
    // portraits
    c.drawImage(portrait(a.ch, 52), 10, 8); c.strokeStyle = '#ffd23a'; c.lineWidth = 2; c.strokeRect(10, 8, 52, 52);
    c.drawImage(portrait(b.ch, 52, true), W - 62, 8); c.strokeRect(W - 62, 8, 52, 52);
    txt(a.ch.name, 74, 56, 11, { align: 'left', color: '#fff', stroke: '#000', sw: 4 });
    txt(b.ch.name, W - 74, 56, 11, { align: 'right', color: '#fff', stroke: '#000', sw: 4 });
    // victoires
    for (let i = 0; i < 2; i++) {
      const on0 = a.wins > i, on1 = b.wins > i;
      c.fillStyle = on0 ? '#ffd23a' : '#222'; c.beginPath(); c.arc(W / 2 - 54 - i * 18, 62, 6, 0, 7); c.fill(); c.strokeStyle = '#000'; c.stroke();
      c.fillStyle = on1 ? '#ffd23a' : '#222'; c.beginPath(); c.arc(W / 2 + 54 + i * 18, 62, 6, 0, 7); c.fill(); c.stroke();
    }
    // chrono
    c.fillStyle = '#000'; c.beginPath(); c.moveTo(W / 2 - 34, 10); c.lineTo(W / 2 + 34, 10); c.lineTo(W / 2 + 26, 58); c.lineTo(W / 2 - 26, 58); c.fill();
    txt(String(this.timer).padStart(2, '0'), W / 2, 36, 34, { font: FONT_BIG, grad: ['#fff', '#ffd23a', '#ff8a00'], stroke: '#3a0d00', sw: 5 });
    // jauges super
    const meter = (f, x, flip) => {
      const mw = 230, mh = 12, y = H - 30;
      c.save(); c.translate(x, y); if (flip) { c.translate(mw, 0); c.scale(-1, 1); }
      c.fillStyle = '#000'; c.fillRect(-3, -3, mw + 6, mh + 6);
      c.fillStyle = '#10213a'; c.fillRect(0, 0, mw, mh);
      const full = f.meter >= 100;
      const g = c.createLinearGradient(0, 0, mw, 0);
      g.addColorStop(0, '#1a6cff'); g.addColorStop(1, full ? '#ffffff' : '#3ff2ff');
      c.fillStyle = full && this.frame % 16 < 8 ? '#fff' : g; c.fillRect(0, 0, mw * f.meter / 100, mh);
      c.restore();
      if (full) txt('SUPER!', flip ? x - 10 : x + mw + 10, y + 6, 12, { align: flip ? 'right' : 'left', color: this.frame % 16 < 8 ? '#ff3fd2' : '#ffe14a', stroke: '#000', sw: 4 });
      txt(flip ? '2P' : '1P', flip ? x + mw + 10 : x - 10, y + 6, 12, { align: flip ? 'left' : 'right', color: flip ? '#4fb4ff' : '#ff5a5a', stroke: '#000', sw: 4 });
    };
    meter(a, 50, false); meter(b, W - 50 - 230, true);
    // combos
    for (let i = 0; i < 2; i++) {
      const cb = this.combo[i]; if (!cb) continue;
      const x = i === 0 ? 40 : W - 40, k = Math.min(1, cb.t / 5);
      txt(cb.n + '', x, 170, 54 * (1.4 - 0.4 * k), { font: FONT_BIG, italic: true, align: i ? 'right' : 'left', grad: ['#fff', '#ffd23a', '#ff6a00'], stroke: '#000', sw: 6, alpha: cb.t > 55 ? (70 - cb.t) / 15 : 1 });
      txt('HITS', x, 210, 16, { align: i ? 'right' : 'left', color: '#fff', stroke: '#000', sw: 5, alpha: cb.t > 55 ? (70 - cb.t) / 15 : 1 });
    }
  }
  drawAnnounce(c) {
    const A = this.ann; if (!A || A.t > A.dur) return;
    const k = A.t < 8 ? easeOut(A.t / 8) : 1, out = A.t > A.dur - 10 ? (A.dur - A.t) / 10 : 1;
    const size = (A.big ? 92 : 76) * (1.6 - 0.6 * k);
    c.save(); c.globalAlpha = Math.max(0, out);
    if (A.red) bigTxt(A.text, W / 2, H / 2 - 30, size, { grad: ['#fff', '#ffdd55', '#ff3a1a', '#8a0000'], glow: '#ff3a1a', blur: 30 });
    else bigTxt(A.text, W / 2, H / 2 - 30, size, { glow: '#ff9d1c', blur: 20 });
    c.restore();
    if (this.perfect) bigTxt('PERFECT', W / 2, H / 2 + 50, 48, { grad: ['#ffffff', '#9be7ff', '#3fa9ff'], stroke: '#001a3a' });
  }
  drawPause(c) {
    c.fillStyle = 'rgba(0,0,10,.75)'; c.fillRect(0, 0, W, H);
    if (this.showMoves) return drawMoveList(c, this.p[0].ch, this.opt.versus ? this.p[1].ch : null);
    bigTxt('PAUSE', W / 2, 150, 64);
    ['CONTINUER', 'LISTE DES COUPS', 'QUITTER'].forEach((s, i) => {
      const sel = this.pauseSel === i;
      if (sel) { c.fillStyle = 'rgba(255,210,58,.15)'; c.fillRect(W / 2 - 170, 230 + i * 56 - 22, 340, 44); }
      txt((sel ? '▶ ' : '') + s, W / 2, 230 + i * 56, 16, { color: sel ? '#ffd23a' : '#ccc', stroke: '#000', sw: 4 });
    });
  }
}
// hurtbox même en chute / invincible (pour les supers)
Fighter.prototype.hurtboxAny = function () { return this.hurtbox(true); };

function moveRows(ch) {
  const mv = ch.move;
  const motion = mv === 'uppercut' ? '→ ↓ ↘ + P' : mv === 'flip' ? '→ ↓ ↘ + K' : mv === 'rush' ? '↓ ↙ ← + P' : '↓ ↙ ← + K';
  return [
    [ch.proj.name, '↓ ↘ → + P', 'SP1'],
    [ch.moveName, motion, 'SP2'],
    [ch.supName + ' (SUPER)', '↓↘→ ↓↘→ + P', 'SUPER']
  ];
}
function drawMoveList(c, ch1, ch2) {
  const list = ch2 ? [ch1, ch2] : [ch1];
  list.forEach((ch, i) => {
    const x0 = list.length === 1 ? W / 2 - 320 : 30 + i * 470, w = list.length === 1 ? 640 : 440;
    c.fillStyle = 'rgba(10,14,30,.9)'; c.fillRect(x0, 90, w, 330); c.strokeStyle = ch.accent; c.lineWidth = 2; c.strokeRect(x0, 90, w, 330);
    c.drawImage(portrait(ch, 64), x0 + 14, 104);
    txt(ch.name, x0 + 92, 122, 16, { align: 'left', color: ch.accent });
    txt(ch.maker, x0 + 92, 150, 10, { align: 'left', color: '#aaa' });
    moveRows(ch).forEach((r, j) => {
      const y = 205 + j * 64;
      txt(r[0], x0 + 20, y, 12, { align: 'left', color: '#ffd23a' });
      txt(r[1], x0 + 20, y + 24, 14, { align: 'left', color: '#fff', font: FONT_BIG });
      txt('ou ' + r[2], x0 + w - 20, y + 24, 10, { align: 'right', color: '#9be7ff' });
    });
  });
  txt('La SUPER nécessite la jauge pleine', W / 2, 444, 10, { color: '#ff9de0' });
  txt('Appuyez pour revenir', W / 2, 480, 10, { color: '#aaa', alpha: (gFrame % 60 < 40) ? 1 : 0.3 });
}

/* =================== ÉCRAN TITRE =================== */
class TitleScene {
  constructor(skipPress) {
    this.t = 0; this.stage = skipPress ? 'menu' : 'press'; this.sel = 0; this.vi = 0;
    this.vids = [document.getElementById('vid1'), document.getElementById('vid2')];
    this.vids.forEach((v, i) => { v.onended = () => { this.vi = 1 - i; this.play(); }; });
    this.play();
    setTouchControls(false); mergeKeyboards = true;
    AU.playTrack(TRACKS.title);
  }
  play() { const v = this.vids[this.vi]; try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
  leave() { this.vids.forEach(v => { v.pause(); v.onended = null; }); }
  update() {
    this.t++;
    const pd = pads[0], taps = tapQueue.splice(0);
    const v = this.vids[this.vi]; if (v.paused && this.t % 60 === 0) this.play();
    if (this.stage === 'press') {
      if (confirmPressed(pd) || pads[1].pressed.start || taps.length || anyKeyPressed) { this.stage = 'menu'; AU.sfx('coin'); AU.say('Robot Fighter 2', 0.35, 0.8); }
      return;
    }
    const items = 3;
    if (pd.pressed.u) { this.sel = (this.sel + items - 1) % items; AU.sfx('move'); }
    if (pd.pressed.d) { this.sel = (this.sel + 1) % items; AU.sfx('move'); }
    let ch = confirmPressed(pd) ? this.sel : -1;
    for (const t of taps) for (let i = 0; i < items; i++) if (inRect(t, W / 2 - 200, 330 + i * 46 - 20, 400, 40)) { if (this.sel === i || isTouch) ch = i; this.sel = i; }
    if (ch >= 0) {
      AU.sfx('confirm'); this.leave();
      if (ch === 0) { GAME.mode = 'arcade'; setScene(new SelectScene('arcade')); }
      if (ch === 1) { GAME.mode = 'versus'; setScene(new SelectScene('versus')); }
      if (ch === 2) setScene(new ControlsScene());
    }
  }
  draw() {
    const c = ctx, v = this.vids[this.vi];
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    if (v.readyState >= 2) { try { c.drawImage(v, 0, 0, W, H); } catch (e) { } }
    else { STAGES[0].draw(c, (Math.sin(this.t * 0.005) * 0.5 + 0.5) * (STAGE_W - W), this.t); }
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(0.5, 'rgba(0,0,0,.15)'); g.addColorStop(1, 'rgba(0,0,0,.8)');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // logo
    const bounce = Math.sin(this.t * 0.05) * 3;
    txt('ROBOT', W / 2 - 60, 92 + bounce, 70, { font: FONT_BIG, italic: true, grad: ['#ffffff', '#cfe3ff', '#7aa6d8', '#3a5a88'], stroke: '#061226', sw: 10 });
    bigTxt('FIGHTER', W / 2 + 10, 168 + bounce, 92, { glow: '#ff5a00', blur: 26 });
    txt('II', W / 2 + 262, 150 + bounce, 70, { font: FONT_BIG, italic: true, grad: ['#ffd0d0', '#ff3a3a', '#8a0000'], stroke: '#2a0000', sw: 9, glow: '#ff0000', blur: 20 });
    txt('THE HUMANOID WARRIORS', W / 2, 228, 14, { color: '#9be7ff', stroke: '#000', sw: 5, glow: '#3fa9ff' });
    if (this.stage === 'press') {
      if (this.t % 60 < 40) txt('PRESS START', W / 2, 380, 24, { color: '#fff', stroke: '#000', sw: 6, glow: '#ffd23a', blur: 14 });
      txt(isTouch ? 'Touchez l\'écran pour commencer' : 'Appuyez sur ENTRÉE', W / 2, 420, 10, { color: '#ccc', stroke: '#000', sw: 4 });
    } else {
      ['ARCADE  (1 JOUEUR)', 'VERSUS  (2 JOUEURS)', 'COMMANDES'].forEach((s, i) => {
        const y = 330 + i * 46, sel = this.sel === i;
        if (sel) { c.fillStyle = 'rgba(255,210,58,.18)'; c.fillRect(W / 2 - 200, y - 20, 400, 40); c.strokeStyle = '#ffd23a'; c.strokeRect(W / 2 - 200, y - 20, 400, 40); }
        txt(s, W / 2, y, 16, { color: sel ? '#ffd23a' : '#fff', stroke: '#000', sw: 5 });
      });
    }
    txt('© 2026 WORLD ROBOT LEAGUE', W / 2, H - 18, 9, { color: '#888' });
    txt('M : musique', W - 12, H - 18, 8, { align: 'right', color: '#666' });
  }
}

/* =================== COMMANDES =================== */
class ControlsScene {
  constructor() { this.t = 0; }
  update() { this.t++; const taps = tapQueue.splice(0); if (this.t > 10 && (confirmPressed(pads[0]) || escPressed || taps.length)) { AU.sfx('select'); setScene(new TitleScene(true)); } }
  draw() {
    const c = ctx; drawGridBg(c, this.t, '#3fa9ff');
    bigTxt('COMMANDES', W / 2, 52, 46);
    const col = (x, title, rows, color) => {
      c.fillStyle = 'rgba(5,10,25,.85)'; c.fillRect(x, 92, 290, 330); c.strokeStyle = color; c.lineWidth = 2; c.strokeRect(x, 92, 290, 330);
      txt(title, x + 145, 114, 12, { color });
      rows.forEach((r, i) => { txt(r[0], x + 16, 150 + i * 27, 9, { align: 'left', color: '#aaa' }); txt(r[1], x + 274, 150 + i * 27, 9, { align: 'right', color: '#fff' }); });
    };
    col(20, 'JOUEUR 1', [['Déplacement', 'W A S D'], ['Poing léger', 'F / ESPACE'], ['Poing fort', 'G'], ['Pied léger', 'V'], ['Pied fort', 'B'], ['Spécial 1', 'R'], ['Spécial 2', 'T'], ['SUPER', 'Y'], ['Pause', 'ÉCHAP']], '#ff5a5a');
    col(335, 'JOUEUR 2', [['Déplacement', 'FLÈCHES'], ['Poing léger', 'K'], ['Poing fort', 'L'], ['Pied léger', ','], ['Pied fort', '.'], ['Spécial 1', 'I'], ['Spécial 2', 'O'], ['SUPER', 'P'], ['(En 1 joueur', 'les 2 marchent)']], '#4fb4ff');
    col(650, 'MANETTE / TACTILE', [['Déplacement', 'Croix / stick'], ['Poings', 'X / Y'], ['Pieds', 'A / B'], ['Spéciaux', 'LB / RB'], ['SUPER', 'LT / RT'], ['Pause', 'START'], ['', ''], ['Mobile', 'joystick +'], ['', 'boutons à l\'écran']], '#ffd23a');
    txt('Sauter : HAUT  ·  S\'accroupir : BAS  ·  Garde : reculer', W / 2, 446, 10, { color: '#9be7ff' });
    txt('Manipulations : ↓↘→+P  (boule)   →↓↘+P (dragon)   ↓↙←+K/P   ↓↘→↓↘→+P (SUPER)', W / 2, 472, 9, { color: '#ffd23a' });
    txt('Appuyez pour revenir', W / 2, 510, 10, { color: '#888', alpha: this.t % 60 < 40 ? 1 : 0.3 });
  }
}
function drawGridBg(c, t, col) {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#05060f'); g.addColorStop(1, '#0d1430');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = hexA(col, 0.12); c.lineWidth = 1;
  for (let x = -(t % 40); x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = -(t * 0.5 % 40); y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
}

/* =================== SÉLECTION =================== */
class SelectScene {
  constructor(mode) {
    this.mode = mode; this.t = 0; this.cur = [0, 1]; this.done = [false, mode === 'arcade'];
    this.out = 0; mergeKeyboards = mode === 'arcade'; setTouchControls(false);
    AU.playTrack(TRACKS.select);
    this.anim = 0;
  }
  tile(i) { const col = i % 4, row = (i / 4) | 0; return { x: W / 2 - 2 * 92 + col * 92, y: 318 + row * 92, s: 84 }; }
  update() {
    this.t++; this.anim++;
    const taps = tapQueue.splice(0);
    if (escPressed) { AU.sfx('select'); setScene(new TitleScene(true)); return; }
    if (this.out) { if (++this.out > 50) this.go(); return; }
    for (let p = 0; p < 2; p++) {
      if (this.done[p]) continue;
      const pd = pads[p];
      let c = this.cur[p];
      if (pd.pressed.l) c = (c % 4 === 0) ? c + 3 : c - 1;
      if (pd.pressed.r) c = (c % 4 === 3) ? c - 3 : c + 1;
      if (pd.pressed.u || pd.pressed.d) c = (c + 4) % 8;
      if (c !== this.cur[p]) { this.cur[p] = c; AU.sfx('move'); }
      if (confirmPressed(pd)) this.pickChar(p);
    }
    for (const t of taps) for (let i = 0; i < 8; i++) {
      const r = this.tile(i);
      if (inRect(t, r.x - r.s / 2, r.y - r.s / 2, r.s, r.s)) {
        const p = this.done[0] ? 1 : 0; if (this.done[p]) break;
        if (this.cur[p] === i) this.pickChar(p); else { this.cur[p] = i; AU.sfx('move'); }
      }
    }
    if (taps.some(t => inRect(t, W / 2 - 90, 500, 180, 34))) { const p = this.done[0] ? 1 : 0; if (!this.done[p]) this.pickChar(p); }
  }
  pickChar(p) {
    this.done[p] = true; AU.sfx('confirm'); AU.say(ROSTER[this.cur[p]].name.replace('02', 'zero two').replace('H1', 'H one'), 0.6, 0.95);
    if (this.done[0] && this.done[1]) this.out = 1;
  }
  go() {
    GAME.p1 = this.cur[0];
    if (this.mode === 'arcade') {
      const others = ROSTER.map((_, i) => i).filter(i => i !== GAME.p1);
      for (let i = others.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[others[i], others[j]] = [others[j], others[i]]; }
      GAME.ladder = others; GAME.idx = 0;
      startArcadeFight();
    } else {
      GAME.p2 = this.cur[1];
      const st = (Math.random() * STAGES.length) | 0;
      setScene(new VsScene(ROSTER[GAME.p1], ROSTER[GAME.p2], st, () => startVersusFight(st)));
    }
  }
  draw() {
    const c = ctx;
    drawGridBg(c, this.t, '#ff5a5a');
    bigTxt('CHOISISSEZ VOTRE ROBOT', W / 2, 40, 36);
    // grands aperçus
    const showP2 = this.mode === 'versus';
    for (let p = 0; p < (showP2 ? 2 : 1); p++) {
      const ch = ROSTER[this.cur[p]], left = p === 0;
      const x = left ? 150 : W - 150;
      const g = c.createRadialGradient(x, 250, 10, x, 250, 190);
      g.addColorStop(0, hexA(ch.accent, 0.4)); g.addColorStop(1, hexA(ch.accent, 0));
      c.fillStyle = g; c.fillRect(x - 200, 60, 400, 400);
      const pose = this.done[p] ? lerpPose(POSES.idle, POSES.win, (Math.sin(this.t * 0.1) + 1) / 2 * 0.3 + 0.7) : { ...POSES.idle, fe: POSES.idle.fe + Math.sin(this.t * 0.08) * 3, fk: POSES.idle.fk + Math.sin(this.t * 0.08) * 3 };
      const sk = skeleton(ch, pose, left ? 1 : -1, 1.55);
      drawRobot(c, ch, pose, x, 455 - sk._low, left ? 1 : -1, 1.55);
      txt(ch.name, x, 82, 20, { color: '#fff', stroke: '#000', sw: 5, glow: ch.accent });
      txt(ch.maker + ' · ' + ch.country, x, 106, 9, { color: ch.accent, stroke: '#000', sw: 3 });
      const stat = (lab, v, yy) => {
        txt(lab, x - 110, yy, 8, { align: 'left', color: '#ccc', stroke: '#000', sw: 3 });
        c.fillStyle = '#222'; c.fillRect(x - 20, yy - 5, 130, 10);
        c.fillStyle = ch.accent; c.fillRect(x - 20, yy - 5, 130 * clamp((v - 0.75) / 0.45, 0.1, 1), 10);
      };
      stat('PUISSANCE', ch.power, 470); stat('VITESSE', ch.speed, 488); stat('TAILLE', ch.scale, 506);
    }
    if (!showP2) {
      // bio + coups à droite en mode arcade
      const ch = ROSTER[this.cur[0]];
      c.fillStyle = 'rgba(5,10,25,.8)'; c.fillRect(W - 300, 74, 284, 200); c.strokeStyle = ch.accent; c.strokeRect(W - 300, 74, 284, 200);
      txt(ch.full, W - 284, 94, 10, { align: 'left', color: ch.accent });
      wrapText(c, ch.bio, W - 284, 118, 252, 16, '11px ' + FONT_BIG, '#ddd');
      moveRows(ch).forEach((r, j) => { txt(r[0], W - 284, 186 + j * 30, 8, { align: 'left', color: '#ffd23a' }); txt(r[1], W - 284, 200 + j * 30, 10, { align: 'left', color: '#fff', font: FONT_BIG }); });
    }
    // grille
    for (let i = 0; i < 8; i++) {
      const r = this.tile(i), ch = ROSTER[i];
      c.drawImage(portrait(ch, 84), r.x - r.s / 2, r.y - r.s / 2, r.s, r.s);
      c.strokeStyle = '#333'; c.lineWidth = 2; c.strokeRect(r.x - r.s / 2, r.y - r.s / 2, r.s, r.s);
      txt(ch.name, r.x, r.y + r.s / 2 - 8, 7, { color: '#fff', stroke: '#000', sw: 3 });
    }
    for (let p = 0; p < 2; p++) {
      if (p === 1 && this.mode !== 'versus') continue;
      const r = this.tile(this.cur[p]), col = p ? '#4fb4ff' : '#ff3a3a';
      const on = this.done[p] || this.t % 20 < 14;
      if (!on) continue;
      c.strokeStyle = col; c.lineWidth = 5; c.strokeRect(r.x - r.s / 2 - 3 + p * 4, r.y - r.s / 2 - 3 + p * 4, r.s + 6 - p * 8, r.s + 6 - p * 8);
      txt(p ? '2P' : '1P', r.x + (p ? 30 : -30), r.y - r.s / 2 - 10, 10, { color: col, stroke: '#000', sw: 4 });
    }
    if (isTouch) {
      c.fillStyle = 'rgba(255,210,58,.2)'; c.fillRect(W / 2 - 90, 500, 180, 34); c.strokeStyle = '#ffd23a'; c.strokeRect(W / 2 - 90, 500, 180, 34);
      txt('VALIDER', W / 2, 517, 12, { color: '#ffd23a' });
    } else txt(this.mode === 'versus' ? 'J1 : ZQSD/WASD + F   ·   J2 : FLÈCHES + K' : 'Flèches + ENTRÉE pour valider', W / 2, 517, 9, { color: '#aaa' });
    if (this.out) { c.fillStyle = `rgba(255,255,255,${Math.max(0, 0.6 - this.out / 30)})`; c.fillRect(0, 0, W, H); }
  }
}
function wrapText(c, s, x, y, maxW, lh, font, col) {
  c.save(); c.font = font; c.fillStyle = col; c.textAlign = 'left'; c.textBaseline = 'top';
  let line = '';
  for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = t; }
  if (line) c.fillText(line, x, y);
  c.restore();
}

/* =================== VS =================== */
class VsScene {
  constructor(ch1, ch2, stageIdx, next, label) { this.a = ch1; this.b = ch2; this.st = stageIdx; this.next = next; this.t = 0; this.label = label; setTouchControls(false); AU.stopMusic(); }
  update() {
    this.t++; const taps = tapQueue.splice(0);
    if (this.t === 30) { AU.sfx('hitS'); }
    if (this.t === 32) AU.say(`${this.a.name.replace('02', 'zero two').replace('H1', 'H one')}. versus. ${this.b.name.replace('02', 'zero two').replace('H1', 'H one')}`, 0.4, 0.9);
    if (this.t > 220 || (this.t > 40 && (confirmPressed(pads[0]) || taps.length))) this.next();
  }
  draw() {
    const c = ctx, t = this.t;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const k = easeOut(clamp(t / 25, 0, 1));
    // deux moitiés en diagonale
    const half = (ch, left) => {
      c.save();
      c.beginPath();
      if (left) { c.moveTo(0, 0); c.lineTo(W / 2 + 60, 0); c.lineTo(W / 2 - 60, H); c.lineTo(0, H); }
      else { c.moveTo(W / 2 + 60, 0); c.lineTo(W, 0); c.lineTo(W, H); c.lineTo(W / 2 - 60, H); }
      c.closePath(); c.clip();
      const g = c.createLinearGradient(left ? 0 : W, 0, W / 2, 0);
      g.addColorStop(0, shade(ch.accent, -0.3)); g.addColorStop(1, '#05060a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(255,255,255,.08)';
      for (let i = 0; i < 25; i++) { const y = (i * 37 + t * 6 * (left ? 1 : -1)) % H; c.beginPath(); c.moveTo(0, (y + H) % H); c.lineTo(W, (y + H) % H); c.stroke(); }
      const x = left ? lerp(-300, 230, k) : lerp(W + 300, W - 230, k);
      const pose = { ...POSES.idle, fe: POSES.idle.fe + Math.sin(t * 0.08) * 4 };
      const sk = skeleton(ch, pose, left ? 1 : -1, 2.3);
      drawRobot(c, ch, pose, x, H + 60 - sk._low * 0.6, left ? 1 : -1, 2.3);
      c.restore();
      txt(ch.name, left ? lerp(-200, 40, k) : lerp(W + 200, W - 40, k), H - 60, 30, { align: left ? 'left' : 'right', font: FONT_BIG, italic: true, color: '#fff', stroke: '#000', sw: 7 });
      txt(ch.maker, left ? lerp(-200, 42, k) : lerp(W + 200, W - 42, k), H - 28, 11, { align: left ? 'left' : 'right', color: ch.accent, stroke: '#000', sw: 4 });
    };
    half(this.a, true); half(this.b, false);
    c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.moveTo(W / 2 + 60, 0); c.lineTo(W / 2 - 60, H); c.stroke();
    if (t > 26) {
      const s = 1 + Math.max(0, (34 - t) / 8);
      bigTxt('VS', W / 2, H / 2 - 20, 130 * s, { grad: ['#ffffff', '#ffe14a', '#ff5a00', '#a00000'], glow: '#ff3a00', blur: 40 });
    }
    if (this.label) txt(this.label, W / 2, 34, 14, { color: '#ffd23a', stroke: '#000', sw: 5 });
    txt('ARÈNE : ' + STAGES[this.st].name, W / 2, H / 2 + 80, 11, { color: '#fff', stroke: '#000', sw: 4, alpha: t > 40 ? 1 : 0 });
    if (t < 30 && t > 24) { c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(0, 0, W, H); }
  }
}

/* =================== SCÈNE DE COMBAT =================== */
class FightScene {
  constructor(fight) { this.f = fight; setTouchControls(true); AU.playTrack(TRACKS[fight.stage.track]); }
  update() { this.f.update(); }
  draw() { this.f.draw(); }
}
function startArcadeFight() {
  const opp = GAME.ladder[GAME.idx], st = ROSTER[opp].stage;
  const label = `COMBAT ${GAME.idx + 1} / ${GAME.ladder.length}`;
  setScene(new VsScene(ROSTER[GAME.p1], ROSTER[opp], st, () => {
    mergeKeyboards = true;
    const f = new Fight(ROSTER[GAME.p1], ROSTER[opp], st, {
      cpu1: true, level: Math.min(6, 1 + GAME.idx), versus: false,
      onEnd: w => {
        if (w === 0) { GAME.idx++; if (GAME.idx >= GAME.ladder.length) setScene(new EndingScene(ROSTER[GAME.p1])); else startArcadeFight(); }
        else setScene(new ContinueScene());
      }
    });
    setScene(new FightScene(f));
  }, label));
}
function startVersusFight(st) {
  mergeKeyboards = false;
  const f = new Fight(ROSTER[GAME.p1], ROSTER[GAME.p2], st, {
    versus: true,
    onEnd: w => setScene(new ResultScene(ROSTER[w === 0 ? GAME.p1 : GAME.p2], w))
  });
  setScene(new FightScene(f));
}

/* =================== CONTINUE / GAME OVER =================== */
class ContinueScene {
  constructor() { this.t = 0; this.n = 9; setTouchControls(false); AU.stopMusic(); AU.say('Continue?'); }
  update() {
    this.t++; const taps = tapQueue.splice(0);
    if (this.n >= 0 && this.t % 60 === 0) { this.n--; AU.sfx('move'); }
    if (this.n >= 0 && this.t > 20 && (confirmPressed(pads[0]) || taps.length)) { AU.sfx('coin'); startArcadeFight(); return; }
    if (this.n < 0) { if (this.t % 60 === 1) AU.say('Game over'); if (this.go == null) this.go = this.t; if (this.t - this.go > 150 || (this.t - this.go > 30 && (confirmPressed(pads[0]) || taps.length))) setScene(new TitleScene(false)); }
  }
  draw() {
    const c = ctx; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const ch = ROSTER[GAME.p1];
    const sk = skeleton(ch, POSES.down, 1, 1.6);
    drawRobot(c, ch, { ...POSES.down, rot: -90 }, W / 2 - 40, 430, 1, 1.6);
    if (this.n >= 0) {
      bigTxt('CONTINUE ?', W / 2, 140, 64);
      bigTxt(String(Math.max(0, this.n)), W / 2, 260, 110, { grad: ['#fff', '#ff9a9a', '#ff2a2a', '#600'] });
      txt(isTouch ? 'Touchez pour continuer' : 'Appuyez sur un bouton', W / 2, 340, 12, { color: '#fff', alpha: this.t % 40 < 28 ? 1 : 0.2 });
    } else bigTxt('GAME OVER', W / 2, 200, 80, { grad: ['#fff', '#aaa', '#555', '#222'], stroke: '#000' });
  }
}

/* =================== RÉSULTAT VERSUS =================== */
class ResultScene {
  constructor(ch, side) { this.ch = ch; this.side = side; this.t = 0; setTouchControls(false); AU.playTrack(TRACKS.win); }
  update() { this.t++; const taps = tapQueue.splice(0); if (this.t > 60 && (confirmPressed(pads[0]) || confirmPressed(pads[1]) || taps.length)) setScene(new SelectScene('versus')); }
  draw() {
    const c = ctx; drawGridBg(c, this.t, this.ch.accent);
    const pose = (this.t / 40 | 0) % 2 ? POSES.win : POSES.win2;
    const sk = skeleton(this.ch, pose, 1, 2);
    drawRobot(c, this.ch, pose, W / 2, 470 - sk._low, 1, 2);
    bigTxt((this.side === 0 ? 'JOUEUR 1' : 'JOUEUR 2') + ' GAGNE !', W / 2, 70, 50);
    txt(this.ch.name, W / 2, 120, 20, { color: this.ch.accent, stroke: '#000', sw: 5 });
    txt('Appuyez pour rejouer', W / 2, 510, 11, { color: '#aaa', alpha: this.t % 60 < 40 ? 1 : 0.3 });
  }
}

/* =================== FIN (CHAMPION) =================== */
class EndingScene {
  constructor(ch) { this.ch = ch; this.t = 0; setTouchControls(false); FX.clear(); AU.playTrack(TRACKS.win); AU.say('Congratulations! ' + ch.name + ' is the world robot champion!', 0.5, 0.9); }
  update() {
    this.t++; FX.update(); const taps = tapQueue.splice(0);
    if (this.t % 25 === 0) {
      const x = rand(100, W - 100), y = rand(60, 260), col = pick(['#ff3fd2', '#3fa9ff', '#ffd23a', '#4dff88', this.ch.accent]);
      explosion(x, y, col, 0.7); AU.sfx('hitL');
    }
    if (this.t > 180 && (confirmPressed(pads[0]) || taps.length)) setScene(new TitleScene(false));
  }
  draw() {
    const c = ctx; drawGridBg(c, this.t, this.ch.accent);
    FX.draw(c);
    const pose = lerpPose(POSES.win, POSES.taunt, (Math.sin(this.t * 0.05) + 1) / 2);
    const sk = skeleton(this.ch, pose, 1, 2.1);
    const g = c.createRadialGradient(W / 2, 330, 10, W / 2, 330, 260); g.addColorStop(0, hexA(this.ch.accent, 0.45)); g.addColorStop(1, hexA(this.ch.accent, 0));
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    drawRobot(c, this.ch, pose, W / 2, 500 - sk._low, 1, 2.1);
    bigTxt('FÉLICITATIONS !', W / 2, 64, 56);
    txt(this.ch.name + ' est le champion', W / 2, 118, 16, { color: '#fff', stroke: '#000', sw: 5 });
    txt('du monde des robots !', W / 2, 142, 16, { color: '#fff', stroke: '#000', sw: 5 });
    if (this.t > 180) txt('Appuyez pour revenir au titre', W / 2, 515, 10, { color: '#aaa', alpha: this.t % 60 < 40 ? 1 : 0.3 });
  }
}

/* =================== BOUCLE PRINCIPALE =================== */
scene = new TitleScene(false);
let last = performance.now(), acc = 0;
const STEP = 1000 / 60;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= STEP) {
    pollInput();
    if (musicToggle) { AU.toggleMusic(); musicToggle = false; }
    if (nextScene && fade >= 0) {
      fade += 1;
      if (fade >= 10) { if (scene && scene.leave) scene.leave(); scene = nextScene; nextScene = null; fade = -10; }
    } else {
      if (fade < 0) fade++;
      scene.update();
    }
    gFrame++;
    tapQueue.length = 0; anyKeyPressed = false; escPressed = false;
    acc -= STEP;
  }
  ctx.setTransform(VIEW_SCALE, 0, 0, VIEW_SCALE, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  scene.draw();
  const fk = nextScene ? fade / 10 : fade < 0 ? -fade / 10 : 0;
  if (fk > 0) { ctx.fillStyle = `rgba(0,0,0,${fk})`; ctx.fillRect(0, 0, W, H); }
  AU.tick();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
