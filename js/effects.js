/* ===== Cursor Glow ===== */
;(function () {
  if (window.matchMedia('(hover: none)').matches) return;
  const el = document.createElement('div');
  el.className = 'cursor-glow';
  document.body.appendChild(el);
  let tx = -400, ty = -400, cx = -400, cy = -400;
  window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  (function tick() {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    el.style.transform = `translate(calc(${cx}px - 50%), calc(${cy}px - 50%))`;
    requestAnimationFrame(tick);
  })();
})();

/* ===== Hero Particle Canvas ===== */
;(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-canvas';
  hero.insertBefore(canvas, hero.firstChild);
  const ctx = canvas.getContext('2d');

  let W, H;
  const mouse = { x: -9999, y: -9999 };
  const COUNT = 72;
  const LINK  = 130;

  class Dot {
    constructor() { this.init(); }
    init() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * 0.38;
      this.vy = (Math.random() - 0.5) * 0.38;
      this.r  = Math.random() * 1.4 + 0.5;
      this.col = Math.random() > 0.55 ? '124,111,234' : '100,255,218';
    }
    move() {
      const dx = this.x - mouse.x, dy = this.y - mouse.y;
      const d = Math.hypot(dx, dy);
      if (d < 90 && d > 0) { this.vx += dx / d * 0.22; this.vy += dy / d * 0.22; }
      this.vx *= 0.99; this.vy *= 0.99;
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0) this.x = W; else if (this.x > W) this.x = 0;
      if (this.y < 0) this.y = H; else if (this.y > H) this.y = 0;
    }
  }

  let dots = [];

  function resize() {
    W = canvas.width  = hero.offsetWidth;
    H = canvas.height = hero.offsetHeight;
    dots = Array.from({ length: COUNT }, () => new Dot());
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
        const d = Math.hypot(dx, dy);
        if (d < LINK) {
          ctx.strokeStyle = `rgba(${dots[i].col},${(1 - d / LINK) * 0.22})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(dots[i].x, dots[i].y);
          ctx.lineTo(dots[j].x, dots[j].y);
          ctx.stroke();
        }
      }
    }
    dots.forEach(d => {
      d.move();
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${d.col},0.6)`;
      ctx.fill();
    });
    requestAnimationFrame(frame);
  }

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('resize', resize);
  resize();
  frame();
})();

/* ===== Hero 3D Orbit Rings ===== */
;(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const rings = [
    { size: 210, x: 80, y: 18, dur: 20, delay:  0, color: 'rgba(124,111,234,.18)', rx: 58, rz:  12 },
    { size: 130, x: 87, y: 60, dur: 26, delay: -7, color: 'rgba(100,255,218,.14)', rx: 42, rz: -18 },
    { size:  85, x: 65, y: 12, dur: 15, delay: -3, color: 'rgba(124,111,234,.11)', rx: 68, rz:   8 },
  ];

  rings.forEach(({ size, x, y, dur, delay, color, rx, rz }) => {
    const el = document.createElement('div');
    el.style.cssText = [
      `position:absolute`,
      `width:${size}px`,
      `height:${size}px`,
      `left:${x}%`,
      `top:${y}%`,
      `border-radius:50%`,
      `border:1.5px solid ${color}`,
      `pointer-events:none`,
      `z-index:1`,
      `--rx:${rx}deg`,
      `--rz:${rz}deg`,
      `animation:hero-ring-spin ${dur}s linear ${delay}s infinite`,
    ].join(';');
    hero.appendChild(el);
  });
})();

/* ===== 3D Card Tilt ===== */
;(function () {
  if (window.matchMedia('(hover: none)').matches) return;

  const SEL = '.intro-card, .project-card, .skill-card, .form-card, .avatar-box';
  document.querySelectorAll(SEL).forEach(card => {
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    card.appendChild(shine);

    card.addEventListener('mousemove', e => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top)  / height;
      const rx = (y - 0.5) * -16;
      const ry = (x - 0.5) *  16;
      card.style.transition = 'transform 0.08s ease';
      card.style.transform = `perspective(700px) rotateX(${rx}deg) rotateY(${ry}deg) scale3d(1.025,1.025,1.025)`;
      shine.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.09) 0%, transparent 65%)`;
      shine.style.opacity = '1';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(.23,1,.32,1)';
      card.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      shine.style.opacity = '0';
      setTimeout(() => {
        card.style.transform = '';
        card.style.transition = '';
      }, 500);
    });
  });
})();

/* ===== Magnetic Buttons ===== */
;(function () {
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const { left, top, width, height } = btn.getBoundingClientRect();
      const dx = (e.clientX - (left + width  / 2)) * 0.3;
      const dy = (e.clientY - (top  + height / 2)) * 0.3;
      btn.style.transition = 'transform 0.1s ease';
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transition = 'transform 0.45s cubic-bezier(.23,1,.32,1), background 0.15s ease, box-shadow 0.15s ease';
      btn.style.transform = 'translate(0,0)';
      setTimeout(() => { btn.style.transform = ''; btn.style.transition = ''; }, 450);
    });
  });
})();
