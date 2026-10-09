/* Вся анимация написана вручную — без библиотек — и уважает
   prefers-reduced-motion. */
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- LOADER: счётчик 0→100 едет слева направо, затем раскрытие ---------- */
  const loader = $("#loader");
  const count = $("#loaderCount");
  function reveal() {
    root.dataset.revealed = "true";
    loader.classList.add("is-done");
    setTimeout(() => (root.dataset.settled = "true"), 1700);
  }
  if (reduced) reveal();
  else {
    let p = 0, done = false;
    let last = performance.now();
    const start = last;
    const finish = () => { if (!done) { done = true; setTimeout(reveal, 150); } };
    const safety = setTimeout(finish, 3500); // если вкладка в фоне
    const tick = (now) => {
      const dt = now - last; last = now;
      const ready = document.readyState === "complete" || now - start > 2000;
      p = Math.min(p + dt * 0.075, ready ? 100 : 88);
      count.textContent = Math.floor(p);
      count.style.left = p + "%";
      count.style.transform = `translateX(-${p}%)`;
      if (p >= 100) { clearTimeout(safety); finish(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- шапка: большое имя сжимается в строку меню ---------- */
  const bar = $("#bar");
  const big = $("#bigName");
  let bigScale = 1, baseSize = 32;
  function measureName() {
    big.style.fontSize = "";
    baseSize = parseFloat(getComputedStyle(big).fontSize);
    const w = big.getBoundingClientRect().width;
    const right = $(".bar__right").getBoundingClientRect().width;
    const target = innerWidth >= 900 ? innerWidth * 0.62 : (innerWidth - 56 - right) * 0.9;
    bigScale = Math.max(1, target / w);
    // отступ hero под большое имя
    root.style.setProperty("--hero-top", big.getBoundingClientRect().height * bigScale + "px");
  }
  function updateName() {
    const p = reduced ? 1 : Math.min(1, scrollY / (innerHeight * 0.45));
    const e = 1 - Math.pow(1 - p, 3);
    big.style.fontSize = (baseSize * (bigScale - (bigScale - 1) * e)).toFixed(2) + "px";
    bar.classList.toggle("is-small", p >= 1);
  }

  /* ---------- индикатор раздела в шапке: «ИМЯ • ОБО МНЕ» ---------- */
  const barSection = $("#barSection");
  const sections = $$("[data-section]");
  function updateSection() {
    let current = "";
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * 0.4) current = s.dataset.section;
    if (barSection.textContent !== current) barSection.textContent = current;
  }

  /* ---------- меню ---------- */
  const burger = $("#burger");
  const menu = $("#menu");
  const toggleMenu = (open) => {
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleMenu(menu.hidden));
  $$("a", menu).forEach((a) => a.addEventListener("click", () => toggleMenu(false)));
  addEventListener("keydown", (e) => e.key === "Escape" && toggleMenu(false));

  /* ---------- параллакс (полароиды сохраняют свой наклон) ---------- */
  const items = $$("[data-speed]").map((el) => ({ el, speed: parseFloat(el.dataset.speed), y: 0 }));
  function updateParallax() {
    if (reduced) return;
    const mid = innerHeight / 2;
    for (const it of items) {
      const r = it.el.getBoundingClientRect();
      if (!r.height || r.bottom < -400 || r.top > innerHeight + 400) continue;
      const center = r.top - it.y + r.height / 2;
      it.y = -(center - mid) * it.speed;
      const rot = it.el.classList.contains("pol") ? " rotate(var(--r, 0deg))" : "";
      const base = it.el.classList.contains("cutout") ? " rotate(-14deg)" : "";
      it.el.style.transform = `translate3d(0, ${it.y.toFixed(1)}px, 0)${rot}${base}`;
    }
  }

  /* ---------- появление текста ---------- */
  $$(".program__text, .about__text, .meta, .footer__mail").forEach((el) => el.classList.add("rv"));
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }),
    { threshold: 0.1 }
  );
  $$(".rv").forEach((el) => io.observe(el));

  /* ---------- бегущая строка: скорость растёт от скорости скролла ---------- */
  const rows = $$(".mq__row").map((el) => { el.innerHTML += el.innerHTML; return { el, dir: +el.dataset.dir }; });
  const track = $("#journeyTrack");
  track.innerHTML += track.innerHTML; // бесконечная лента таймлайна
  let pos = 0, tpos = 0, boost = 0, lastY = scrollY;
  function loop() {
    boost += Math.abs(scrollY - lastY) * 0.04;
    lastY = scrollY;
    boost *= 0.9;
    pos += 0.6 + Math.min(boost, 10);
    tpos += 0.35 + Math.min(boost, 10) * 0.5;
    for (const r of rows) {
      const w = r.el.scrollWidth / 2;
      if (w) r.el.style.transform = `translate3d(${r.dir > 0 ? -(pos % w) : (pos % w) - w}px,0,0)`;
    }
    const tw = track.scrollWidth / 2;
    if (tw) track.style.transform = `translate3d(${-(tpos % tw)}px,0,0)`;
    requestAnimationFrame(loop);
  }
  if (!reduced) requestAnimationFrame(loop);
  else $(".journey").style.overflowX = "auto";

  /* ---------- программы: предыдущая / следующая + размытые анонсы ---------- */
  const programs = $$(".program");
  let current = 0;
  const at = (k) => programs[(k + programs.length) % programs.length];
  function showProgram(i) {
    current = (i + programs.length) % programs.length;
    programs.forEach((p, k) => (p.hidden = k !== current));
    $('[data-role="next-name"]').textContent = at(current + 1).dataset.name;
    $('[data-role="next-img"]').src = at(current + 1).dataset.teaser;
    $('[data-role="after-name"]').textContent = at(current + 2).dataset.name;
    $('[data-role="after-img"]').src = at(current + 2).dataset.teaser;
    $$(".rv", programs[current]).forEach((el) => el.classList.add("is-in"));
    requestAnimationFrame(updateParallax);
  }
  $$("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      showProgram(current + parseInt(b.dataset.step, 10));
      $("#programs").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    })
  );
  showProgram(0);

  /* ---------- копировать email ---------- */
  $$("[data-copy]").forEach((b) => {
    const label = b.innerHTML;
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Скопировано ✓"; }
      catch { b.textContent = b.dataset.copy; }
      setTimeout(() => (b.innerHTML = label), 1800);
    });
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------- общий цикл ---------- */
  let raf = 0;
  const frame = () => { raf = 0; updateName(); updateSection(); updateParallax(); };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(frame); };
  const onResize = () => { measureName(); frame(); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onResize);
  addEventListener("load", onResize);
  document.fonts?.ready.then(onResize);
  onResize();
})();
