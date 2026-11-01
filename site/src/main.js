// 風玥茶研所 La'Brezza — 全站互動與動態效果
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const EASE = 'cubic-bezier(.2,.7,.2,1)';

  // ---------- 導覽列、閱讀進度、視差 ----------
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.progress');
  const parallax = reduce ? [] : $$('[data-parallax]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (h > 0 ? y / h : 0) + ')';
    for (const el of parallax) {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      el.style.transform = 'translateY(' + (k * -60).toFixed(1) + 'px)';
    }
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---------- 行動版選單 ----------
  const toggle = document.querySelector('.nav-toggle');
  toggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggle.click();
  });

  // ---------- SCROLL 提示 ----------
  $$('[data-scroll-down]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: innerHeight - 40, behavior: reduce ? 'auto' : 'smooth' });
  }));

  // ---------- 進場浮現、數字跑動、時間軸畫線 ----------
  const play = el => {
    if (el.dataset.count) {
      const to = +el.dataset.count, from = to > 1000 ? to - 40 : 0, t0 = performance.now();
      const step = t => {
        const k = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(from + (to - from) * e);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      return;
    }
    if (el.hasAttribute('data-grow')) {
      el.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 2400, easing: EASE, fill: 'forwards' });
      return;
    }
    const a = el.animate(
      [{ opacity: 0, transform: 'translateY(36px)' }, { opacity: 1, transform: 'none' }],
      { duration: 1000, delay: +el.dataset.reveal || 0, easing: EASE, fill: 'both' }
    );
    a.onfinish = () => { el.style.opacity = '1'; a.cancel(); };
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { io.unobserve(e.target); play(e.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  const observe = root => {
    if (reduce) return;
    $$('[data-reveal]:not([data-seen]), [data-count]:not([data-seen]), [data-grow]:not([data-seen])', root).forEach(el => {
      el.setAttribute('data-seen', '');
      io.observe(el);
    });
  };
  observe(document);

  if (!reduce) {
    // ---------- Ken Burns、跑馬燈、SCROLL 提示 ----------
    $$('[data-kb]').forEach(el => el.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.1)' }],
      { duration: 24000, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
    ));
    $$('[data-marquee]').forEach(el => el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }],
      { duration: 42000, iterations: Infinity, easing: 'linear' }
    ));
    $$('[data-bob]').forEach(el => el.animate(
      [{ transform: 'translateY(0)' }, { transform: 'translateY(8px)' }],
      { duration: 1400, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }
    ));

    // ---------- 炭火粒子 ----------
    const ember = init => ({
      x: Math.random(), y: init ? Math.random() : 1.05, vy: 0.0006 + Math.random() * 0.0014,
      r: 0.6 + Math.random() * 1.8, seed: Math.random() * 1000, life: 0.5 + Math.random() * 0.5, g: Math.floor(Math.random() * 90)
    });
    const fields = $$('[data-embers]').map(el => {
      const c = document.createElement('canvas');
      el.appendChild(c);
      const f = { el, c, ctx: c.getContext('2d'), ps: Array.from({ length: 42 }, () => ember(true)), visible: false };
      new IntersectionObserver(([e]) => { f.visible = e.isIntersecting; }).observe(el);
      return f;
    });
    if (fields.length) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const draw = t => {
        for (const f of fields) {
          if (!f.visible) continue;
          const W = f.el.clientWidth, H = f.el.clientHeight;
          if (f.c.width !== Math.round(W * dpr) || f.c.height !== Math.round(H * dpr)) {
            f.c.width = Math.round(W * dpr); f.c.height = Math.round(H * dpr);
          }
          const x = f.ctx;
          x.setTransform(dpr, 0, 0, dpr, 0, 0);
          x.clearRect(0, 0, W, H);
          x.globalCompositeOperation = 'lighter';
          for (let i = 0; i < f.ps.length; i++) {
            const p = f.ps[i];
            p.y -= p.vy; p.x += Math.sin(t / 1000 + p.seed) * 0.0004; p.life -= 0.0012;
            if (p.life <= 0 || p.y < -0.05) { f.ps[i] = ember(false); continue; }
            const a = Math.max(0, p.life * (0.55 + 0.45 * Math.sin(t / 140 + p.seed)));
            const px = p.x * W, py = p.y * H, rad = p.r * 6;
            const grd = x.createRadialGradient(px, py, 0, px, py, rad);
            grd.addColorStop(0, 'rgba(255,' + (150 + p.g) + ',80,' + a + ')');
            grd.addColorStop(1, 'rgba(255,120,40,0)');
            x.fillStyle = grd;
            x.beginPath(); x.arc(px, py, rad, 0, 6.283); x.fill();
          }
        }
        requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
    }
  }

  // ---------- 茶品分類切換 ----------
  const filter = document.querySelector('[data-tea-filter]');
  if (filter) {
    const tabs = $$('a[data-cat]', filter);
    const marker = filter.querySelector('.marker');
    const cards = $$('[data-tea-grid] > [data-cat]');
    const titles = JSON.parse(filter.dataset.titles);
    const select = (cat, push) => {
      tabs.forEach(t => t.setAttribute('aria-current', t.dataset.cat === cat ? 'true' : 'false'));
      const tab = tabs.find(t => t.dataset.cat === cat);
      marker.style.left = tab.dataset.pos + '%';
      let i = 0;
      cards.forEach(c => {
        const show = cat === 'all' || c.dataset.cat === cat;
        c.hidden = !show;
        if (show && !reduce) {
          c.removeAttribute('data-reveal');
          c.style.opacity = '';
          c.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }],
            { duration: 600, delay: i++ * 50, easing: EASE, fill: 'backwards' });
        }
      });
      document.title = titles[cat];
      if (push) history.pushState({ cat }, '', tab.href);
    };
    tabs.forEach(t => t.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      if (t.getAttribute('aria-current') !== 'true') select(t.dataset.cat, true);
    }));
    window.addEventListener('popstate', e => select((e.state && e.state.cat) || filter.dataset.initial, false));
    history.replaceState({ cat: filter.dataset.initial }, '');
  }

  // ---------- 茶學語錄手風琴 ----------
  $$('.faq-q').forEach(btn => btn.addEventListener('click', () => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', open);
    panel.hidden = !open;
    if (open && !reduce) panel.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' });
  }));
  $$('.faq-toc a').forEach(a => a.addEventListener('click', e => {
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  }));

  // ---------- 聯絡表單 ----------
  const form = document.querySelector('[data-contact-form]');
  if (form) {
    const done = document.querySelector('[data-form-done]');
    const error = form.querySelector('.error');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      error.hidden = true;
      const data = new FormData(form);
      if (data.get('website')) return; // 防垃圾訊息的隱藏欄位
      const endpoint = form.dataset.endpoint;
      if (!endpoint) {
        // 尚未串接表單服務時，改用使用者的郵件程式寄出
        const body = data.get('message') + '\n\n—\n' + data.get('name') + '\n' + data.get('email');
        location.href = 'mailto:' + form.dataset.mailto + '?subject=' + encodeURIComponent(data.get('subject')) + '&body=' + encodeURIComponent(body);
        return;
      }
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      try {
        const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(res.status);
        form.hidden = true;
        done.hidden = false;
        if (!reduce) done.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'ease-out' });
      } catch {
        error.hidden = false;
        btn.disabled = false;
      }
    });
  }
})();
