/* ===== Nav scroll effect ===== */
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

/* ===== Mobile hamburger ===== */
const hamburger = document.querySelector('.nav-hamburger');
const mobileNav  = document.querySelector('.nav-mobile');
if (hamburger && mobileNav) {
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });
  mobileNav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileNav.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ===== Active nav link ===== */
const page = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('[data-page]').forEach(el => {
  el.classList.toggle('active', el.dataset.page === page);
});

/* ===== Intersection observer – fade-up ===== */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.fade-up').forEach(el => io.observe(el));

/* ===== Contact form ===== */
const form = document.getElementById('contact-form');
if (form) {
  const successPanel = document.getElementById('form-success');

  function validate(field) {
    const err = form.querySelector(`[data-err="${field.name}"]`);
    let msg = '';
    if (!field.value.trim()) {
      msg = 'This field is required.';
    } else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
      msg = 'Enter a valid email address.';
    }
    field.classList.toggle('error', !!msg);
    if (err) { err.textContent = msg; err.classList.toggle('show', !!msg); }
    return !msg;
  }

  form.querySelectorAll('.form-input').forEach(f => {
    f.addEventListener('input', () => validate(f));
    f.addEventListener('blur',  () => validate(f));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('[required]')];
    const ok = fields.map(validate).every(Boolean);
    if (!ok) return;

    const btn = form.querySelector('.btn-submit');
    btn.textContent = 'Sending…';
    btn.disabled = true;

    const data = {
      name:    form.querySelector('#name').value.trim(),
      email:   form.querySelector('#email').value.trim(),
      subject: form.querySelector('#subject').value.trim(),
      message: form.querySelector('#message').value.trim(),
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Server error');
      form.style.display = 'none';
      successPanel.classList.add('show');
    } catch (err) {
      console.error('Contact form error:', err);
      btn.textContent = 'Send Message';
      btn.disabled = false;
      const errEl = document.querySelector('.form-api-err');
      if (errEl) { errEl.textContent = 'Something went wrong. Please try again.'; errEl.style.display = 'block'; }
    }
  });
}
