/* ============================================================================
   PRIME-CAE · product family
   Each product gets one graphic that states what it actually does — a design
   space, a loaded connection, damage against a limit, a grounded answer. At
   card size, one clear idea beats four faint ones.
   ========================================================================== */
import { $$, clamp, lerp, rng, reduced, coarse } from '../core/dom.js';
import { fitCanvas, sceneLoop } from '../core/canvas.js';
import { ramp, rampCss, withAlpha } from '../core/color.js';
import { themeFor } from '../core/theme.js';
import { bracketPath, BK_EXT } from '../core/bracket.js';

/* the same structural model as the rest of the site, at card size — so the
   family reads as one object seen through four products */
function shape(ctx, cx, cy, w, h, k, fill, stroke, lw) {
  const S = Math.min(w / (BK_EXT.x1 - BK_EXT.x0), h / (BK_EXT.y1 - BK_EXT.y0));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(S, S);
  ctx.translate(-(BK_EXT.x0 + BK_EXT.x1) / 2, -(BK_EXT.y0 + BK_EXT.y1) / 2);
  bracketPath(ctx, clamp((k - 0.55) / 0.85, 0, 1));
  if (fill) { ctx.fillStyle = fill; ctx.fill('evenodd'); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = (lw || 1.5) / S; ctx.stroke(); }
  ctx.restore();
}

const ART = {
  /* ---------------------------------------------------------------------
     DESIGN — a design space, not a single design
     A grid of variants across two parameters, with one selected.
     --------------------------------------------------------------------- */
  design(ctx, w, h, t, store, T) {
    const N = 3;
    const gx = w * .22, gy = h * .18, gw = w * .70, gh = h * .62;
    const cw = gw / N, ch = gh / N;
    const pick = Math.floor(t * .5) % (N * N);

    ctx.strokeStyle = T.line; ctx.lineWidth = 1.25;
    for (let i = 0; i <= N; i++) {
      ctx.beginPath(); ctx.moveTo(gx + i * cw, gy); ctx.lineTo(gx + i * cw, gy + gh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy + i * ch); ctx.lineTo(gx + gw, gy + i * ch); ctx.stroke();
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      const i = r * N + c;
      const cx = gx + c * cw + cw / 2, cy = gy + r * ch + ch / 2;
      const k = .55 + c * .28 + r * .10;
      const on = i === pick;
      shape(ctx, cx, cy, cw * .66, ch * .66, k,
        on ? withAlpha(T.accent, .30) : withAlpha(T.text3, .12),
        on ? T.accent : withAlpha(T.text3, .55), on ? 2 : 1.25);
      if (on) {
        ctx.strokeStyle = T.accent; ctx.lineWidth = 2;
        ctx.strokeRect(gx + c * cw + 2, gy + r * ch + 2, cw - 4, ch - 4);
      }
    }
    ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = T.text3;
    ctx.fillText('parameter A', gx, gy + gh + 20);
    ctx.save(); ctx.translate(gx - 12, gy + gh); ctx.rotate(-Math.PI / 2);
    ctx.fillText('parameter B', 0, 0); ctx.restore();
  },

  /* ---------------------------------------------------------------------
     JOINT — a loaded connection, and where it concentrates
     Two lapped members, a fastener, and the stress field around it.
     --------------------------------------------------------------------- */
  joint(ctx, w, h, t, store, T) {
    /* The connection as it is actually set up for analysis: a clevis built off
       a fixed wall, a tongue between its arms, a pin hole through all three,
       and the load coming in on the free end. Drawn axonometrically, because a
       clevis only reads as a clevis in three dimensions. */
    const AX = [1, .14], AY = [.52, -.36];          /* z is straight up      */
    const XH = 1.02, RH = .24;                      /* pin station / radius  */
    const XE = 2.10;                                /* free end of the tongue */
    const AW = .46, TW = .34;                       /* arm / tongue half-width */
    const pulse = (Math.sin(t * 1.5) + 1) / 2;

    /* fit the whole assembly into the card */
    const sx = (x, y) => x * AX[0] + y * AY[0];
    const sy = (x, y, z) => x * AX[1] + y * AY[1] - z;
    const X = [-.18, XE], Y = [-.9, .9], Z = [-.95, .95];
    let ax0 = 1e9, ax1 = -1e9, ay0 = 1e9, ay1 = -1e9;
    for (const x of X) for (const y of Y) for (const z of Z) {
      ax0 = Math.min(ax0, sx(x, y)); ax1 = Math.max(ax1, sx(x, y));
      ay0 = Math.min(ay0, sy(x, y, z)); ay1 = Math.max(ay1, sy(x, y, z));
    }
    const S = Math.min(w * .80 / (ax1 - ax0), h * .78 / (ay1 - ay0));
    const ox = w / 2 - S * (ax0 + ax1) / 2;
    const oy = h * .46 - S * (ay0 + ay1) / 2;
    const P = (x, y, z) => [ox + S * sx(x, y), oy + S * sy(x, y, z)];

    /* ---------------------------------------------------------- helpers -- */
    const loops = (ls, z, dy) => {
      ctx.beginPath();
      for (const L of ls) {
        L.forEach((p, k) => {
          const q = P(p[0], p[1], z);
          k ? ctx.lineTo(q[0], q[1] + dy) : ctx.moveTo(q[0], q[1] + dy);
        });
        ctx.closePath();
      }
    };
    const mix = (a, b, k) => `rgb(${Math.round(lerp(a[0], b[0], k))},${Math.round(lerp(a[1], b[1], k))},${Math.round(lerp(a[2], b[2], k))})`;
    /* a horizontal plate: its thickness is a pure vertical offset on screen,
       so the side walls come out of stacked copies of the plan */
    const slab = (ls, zTop, zBot, top, near, far) => {
      const dz = (zTop - zBot) * S;
      const steps = Math.max(6, Math.round(dz));
      for (let k = steps; k >= 1; k--) {
        loops(ls, zTop, dz * k / steps);
        ctx.fillStyle = mix(near, far, k / steps);
        ctx.fill('evenodd');
      }
      loops(ls, zTop, 0);
      ctx.fillStyle = top; ctx.fill('evenodd');
      ctx.strokeStyle = 'rgba(30,58,88,.55)'; ctx.lineWidth = 1.1; ctx.stroke();
    };
    const quad = (a, b, c, d, fill) => {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
      ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      ctx.strokeStyle = 'rgba(30,58,88,.45)'; ctx.lineWidth = 1.1; ctx.stroke();
    };
    const ring = (cx, cy, r, rev) => Array.from({ length: 40 }, (_, k) => {
      const a = (rev ? -1 : 1) * k / 40 * Math.PI * 2;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });

    /* ------------------------------------------------------- the parts --- */
    const armPlan = [];
    armPlan.push([0, -AW]);
    for (let k = 0; k <= 24; k++) {
      const a = -Math.PI / 2 + k / 24 * Math.PI;
      armPlan.push([XH + AW * Math.cos(a), AW * Math.sin(a)]);
    }
    armPlan.push([0, AW]);

    const tonPlan = [];
    tonPlan.push([XE, -TW]);
    for (let k = 0; k <= 24; k++) {
      const a = -Math.PI / 2 - k / 24 * Math.PI;
      tonPlan.push([XH + TW * Math.cos(a), TW * Math.sin(a)]);
    }
    tonPlan.push([XE, TW]);

    const bore = ring(XH, 0, RH, true);
    const STEEL = { top: '#E7EDF4', near: [166, 181, 196], far: [104, 121, 139] };
    const MID   = { top: '#CBD9E6', near: [140, 158, 176], far: [86, 103, 121] };

    /* the wall the clevis is built off — B, fixed support */
    const P1 = P(0, -.9, .95), P2 = P(0, .9, .95), P3 = P(0, .9, -.95), P4 = P(0, -.9, -.95);
    const B1 = P(-.18, -.9, .95), B2 = P(-.18, .9, .95), B4 = P(-.18, -.9, -.95);
    quad(B1, B2, P2, P1, '#C9D6E3');                        /* top of wall   */
    quad(B1, P1, P4, B4, withAlpha(T.pass, .34));           /* fixed face    */
    quad(P1, P2, P3, P4, '#DCE6EF');                        /* front of wall */
    ctx.strokeStyle = withAlpha(T.pass, .95); ctx.lineWidth = 2;
    for (let k = 0; k < 5; k++) {
      const u = .12 + k * .19;
      const a = P(-.18, -.9, .95 - u * 1.9), b = P(0, -.9, .95 - u * 1.9 - .16);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }

    /* lower arm, tongue, upper arm — painted bottom up, which is also the
       correct depth order in this view */
    slab([armPlan, bore], -.24, -.52, MID.top, MID.near, MID.far);
    slab([tonPlan, bore], .20, -.20, STEEL.top, STEEL.near, STEEL.far);
    slab([armPlan, bore], .52, .24, STEEL.top, STEEL.near, STEEL.far);

    /* the pin hole, called out the way a selected face is */
    loops([bore], .52, 0);
    ctx.fillStyle = `rgba(46,196,132,${.30 + .12 * pulse})`; ctx.fill();
    ctx.strokeStyle = 'rgba(46,196,132,.95)'; ctx.lineWidth = 1.8; ctx.stroke();

    /* A — the load on the free end */
    const f1 = P(XE, -TW, .20), f2 = P(XE, TW, .20), f3 = P(XE, TW, -.20), f4 = P(XE, -TW, -.20);
    quad(f1, f2, f3, f4, 'rgba(240,150,80,.34)');
    const tip = P(XE, 0, 0), d = 22 + pulse * 8;
    ctx.strokeStyle = 'rgba(240,150,80,.98)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tip[0], tip[1]); ctx.lineTo(tip[0] + d, tip[1] + d * .14); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tip[0] + d + 10, tip[1] + (d + 10) * .14);
    ctx.lineTo(tip[0] + d - 1, tip[1] + d * .14 - 6);
    ctx.lineTo(tip[0] + d - 1, tip[1] + d * .14 + 6);
    ctx.closePath(); ctx.fillStyle = 'rgba(240,150,80,.98)'; ctx.fill();

    ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = T.text3;
    ctx.fillText('clevis · pin in double shear', w * .06, h - 12);
  },

  /* ---------------------------------------------------------------------
     LIFE — accumulated damage against the limit that matters
     --------------------------------------------------------------------- */
  life(ctx, w, h, t, store, T) {
    const X = w * .16, Y = h * .16, W = w * .74, H = h * .56;
    ctx.strokeStyle = T.line; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y + H); ctx.lineTo(X + W, Y + H); ctx.stroke();

    /* the limit */
    ctx.strokeStyle = withAlpha(T.fail, .8); ctx.setLineDash([6, 5]); ctx.lineWidth = 1.75;
    ctx.beginPath(); ctx.moveTo(X, Y + H * .12); ctx.lineTo(X + W, Y + H * .12); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = T.fail;
    ctx.fillText('limit', X + W - 30, Y + H * .12 - 7);

    /* damage accumulating, sub-linear then accelerating */
    const prog = clamp((t * .12) % 1.35, 0, 1);
    const dmg = u => Math.pow(u, 1.9) * .82;
    ctx.beginPath();
    for (let i = 0; i <= 80; i++) {
      const u = i / 80; if (u > prog) break;
      const x = X + u * W, y = Y + H - dmg(u) * H;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = T.accent; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();

    /* where it is now */
    const hx = X + prog * W, hy = Y + H - dmg(prog) * H;
    ctx.fillStyle = T.accent;
    ctx.beginPath(); ctx.arc(hx, hy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha(T.accent, .35); ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, Y + H); ctx.stroke();

    ctx.fillStyle = T.text3;
    ctx.fillText('accumulated damage', X, Y - 6);
    ctx.fillText('service life', X + W - 62, Y + H + 18);
  },

  /* ---------------------------------------------------------------------
     COPILOT — a question answered against the current model
     --------------------------------------------------------------------- */
  copilot(ctx, w, h, t, store, T) {
    const cx = w * .30, cy = h * .46;
    const sw = w * .40, sh = h * .34;
    shape(ctx, cx, cy, sw, sh, 1, withAlpha(T.accent, .16), withAlpha(T.text, .38), 1.75);

    /* the region the question is about */
    const hot = { x: cx + sw * .22, y: cy - sh * .16 };
    const pulse = (Math.sin(t * 2) + 1) / 2;
    const g = ctx.createRadialGradient(hot.x, hot.y, 1, hot.x, hot.y, 26 + pulse * 5);
    const c = ramp(.88);
    g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},.9)`);
    g.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(hot.x, hot.y, 26 + pulse * 5, 0, Math.PI * 2); ctx.fill();

    /* the answer, grounded in that region */
    const bx = w * .58, by = h * .22, bw = w * .34, bh = h * .40;
    ctx.strokeStyle = withAlpha(T.accent, .55); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(hot.x + 10, hot.y); ctx.lineTo(bx, by + bh * .55); ctx.stroke();

    ctx.fillStyle = withAlpha(T.panel, .96);
    ctx.strokeStyle = withAlpha(T.accent, .5); ctx.lineWidth = 1.5;
    const r = 6;
    ctx.beginPath();
    ctx.moveTo(bx + r, by); ctx.lineTo(bx + bw - r, by);
    ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
    ctx.lineTo(bx + bw, by + bh - r);
    ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
    ctx.lineTo(bx + r, by + bh);
    ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
    ctx.lineTo(bx, by + r); ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    const lines = [.86, .72, .93, .55];
    lines.forEach((len, i) => {
      const reveal = clamp(t * 1.6 - i * .5, 0, 1);
      if (reveal <= 0) return;
      const y = by + 16 + i * (bh - 26) / lines.length;
      ctx.fillStyle = i === 0 ? withAlpha(T.accent, .95) : withAlpha(T.text3, .75);
      ctx.fillRect(bx + 12, y, (bw - 24) * len * reveal, i === 0 ? 5 : 3.5);
    });
    ctx.font = '600 11px ui-monospace, monospace'; ctx.fillStyle = T.text3;
    ctx.fillText('grounded in the current model', w * .07, h - 14);
  },
};

export function initProducts() {
  $$('canvas[data-product]').forEach(cv => {
    const fn = ART[cv.dataset.product];
    if (!fn) return;
    const { ctx, size } = fitCanvas(cv, 1.9);
    const T = themeFor(cv);
    const store = {};
    sceneLoop(cv, now => {
      const { w, h } = size;
      if (!w) return;
      ctx.clearRect(0, 0, w, h);
      fn(ctx, w, h, reduced() ? 1.6 : now, store, T);
    }, { fps: coarse() ? 18 : 24 });
  });
}
