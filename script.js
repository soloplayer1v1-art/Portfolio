/* =====================================================
   PORTFOLIO — script.js
   Clean · Classic · Modern · Fully Animated
   ===================================================== */

"use strict";

/* ── Helpers ────────────────────────────────────────── */
const qs = (sel, ctx = document) => ctx.querySelector(sel);
const qsa = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const lerp = (a, b, n) => a + (b - a) * n;

/* ─────────────────────────────────────────────────────
   1. PAGE LOADER
───────────────────────────────────────────────────── */
(function initLoader() {
  const loader = qs("#loader");
  const fill = qs("#loader-fill");
  const count = qs("#loader-count");
  if (!loader) return;

  let progress = 0;
  const target = { val: 0 };

  // Simulate loading progress
  const increments = [15, 35, 55, 70, 85, 100];
  let i = 0;
  const tick = setInterval(() => {
    if (i < increments.length) {
      target.val = increments[i++];
    }
    progress = lerp(progress, target.val, 0.08);
    fill.style.width = progress + "%";
    count.textContent = Math.round(progress);

    if (progress >= 99.5) {
      clearInterval(tick);
      setTimeout(() => {
        loader.classList.add("done");
        document.body.style.overflow = "";
        revealHero();
      }, 200);
    }
  }, 40);

  document.body.style.overflow = "hidden";
})();

function revealHero() {
  const els = qsa(".hero [data-delay]");
  els.forEach((el) => {
    const delay = +el.dataset.delay || 0;
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.transition = "opacity .7s ease, transform .7s ease";
    }, delay);
  });
}

/* ─────────────────────────────────────────────────────
   2. CUSTOM CURSOR
───────────────────────────────────────────────────── */
(function initCursor() {
  const cursor = qs("#cursor");
  const follower = qs("#cursor-follower");
  if (!cursor || !follower) return;

  let mx = 0,
    my = 0,
    fx = 0,
    fy = 0;

  // Use transform instead of left/top — stays on compositor thread, no layout
  cursor.style.left = "0";
  cursor.style.top = "0";
  follower.style.left = "0";
  follower.style.top = "0";

  document.addEventListener(
    "mousemove",
    (e) => {
      mx = e.clientX;
      my = e.clientY;
      // Dot snaps instantly — just transform, no layout cost
      cursor.style.transform = `translate(calc(${mx}px - 50%), calc(${my}px - 50%))`;
    },
    { passive: true },
  );

  function animateFollower() {
    fx = lerp(fx, mx, 0.12);
    fy = lerp(fy, my, 0.12);
    follower.style.transform = `translate(calc(${fx}px - 50%), calc(${fy}px - 50%))`;
    requestAnimationFrame(animateFollower);
  }
  animateFollower();

  // Hover states
  const hoverEls = qsa(
    "a, button, .project-card, .skill-card, .social-link, .dot",
  );
  hoverEls.forEach((el) => {
    el.addEventListener("mouseenter", () =>
      document.body.classList.add("cursor-hover"),
    );
    el.addEventListener("mouseleave", () =>
      document.body.classList.remove("cursor-hover"),
    );
  });

  document.addEventListener("mouseleave", () => {
    cursor.style.opacity = "0";
    follower.style.opacity = "0";
  });
  document.addEventListener("mouseenter", () => {
    cursor.style.opacity = "1";
    follower.style.opacity = "1";
  });
})();

/* ─────────────────────────────────────────────────────
   3. NAVIGATION
───────────────────────────────────────────────────── */
(function initNav() {
  const nav = qs("#nav");
  const toggle = qs("#nav-toggle");
  const menu = qs("#mobile-menu");
  const links = qsa(".mob-link");
  if (!nav) return;

  // Cache section positions to avoid repeated layout reads on scroll
  let sectionCache = [];
  function cacheSections() {
    sectionCache = qsa("section[id]").map((sec) => ({
      id: sec.id,
      top: sec.offsetTop,
      bottom: sec.offsetTop + sec.offsetHeight,
    }));
  }
  cacheSections();
  window.addEventListener("resize", cacheSections, { passive: true });

  // Active link on scroll — reads from cache, no layout cost
  function updateActiveLink() {
    const scrollY = window.scrollY + 120;
    sectionCache.forEach(({ id, top, bottom }) => {
      const link = qs(`.nav-link[href="#${id}"]`);
      if (link)
        link.classList.toggle("active", scrollY >= top && scrollY < bottom);
    });
  }

  const handleScroll = () => {
    nav.classList.toggle("scrolled", window.scrollY > 20);
    updateActiveLink();
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  // Mobile toggle
  if (toggle && menu) {
    const setMenuState = (open) => {
      menu.classList.toggle("open", open);
      toggle.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };

    toggle.addEventListener("click", () => {
      setMenuState(!menu.classList.contains("open"));
    });

    links.forEach((l) =>
      l.addEventListener("click", () => setMenuState(false)),
    );

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900 && menu.classList.contains("open")) {
        setMenuState(false);
      }
    });
  }
})();

/* ─────────────────────────────────────────────────────
   4. HERO CANVAS — Particle Field
───────────────────────────────────────────────────── */
(function initCanvas() {
  const canvas = qs("#hero-canvas");
  if (!canvas) return;
  // alpha:false tells the browser this canvas is opaque — skips alpha compositing
  const ctx = canvas.getContext("2d", { alpha: false });

  let W,
    H,
    particles = [],
    mouse = { x: -9999, y: -9999 };
  const NUM = 55; // fewer particles = less CPU
  const COLORS = ["rgba(99,102,241,", "rgba(167,139,250,", "rgba(52,211,153,"];
  const CONNECT_DIST = 90; // connection threshold
  const CONNECT_DIST_SQ = CONNECT_DIST * CONNECT_DIST; // precompute squared
  const MOUSE_DIST = 120;
  const MOUSE_DIST_SQ = MOUSE_DIST * MOUSE_DIST;
  let paused = false;

  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(init = false) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 10;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(Math.random() * 0.6 + 0.2);
      this.r = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.life = 0;
      this.maxLife = Math.random() * 300 + 200;
    }
    update() {
      // Mouse repulsion — use squared distance to avoid Math.sqrt()
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < MOUSE_DIST_SQ && distSq > 0) {
        const dist = Math.sqrt(distSq); // sqrt only when inside radius
        const force = (MOUSE_DIST - dist) / MOUSE_DIST;
        this.vx += (dx / dist) * force * 0.8;
        this.vy += (dy / dist) * force * 0.8;
      }
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;
      this.life++;
      if (this.life > this.maxLife || this.y < -10) this.reset();
    }
    draw() {
      const t = this.life / this.maxLife;
      const a = this.alpha * (t < 0.1 ? t / 0.1 : t > 0.9 ? (1 - t) / 0.1 : 1);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + a + ")";
      ctx.fill();
    }
  }

  function resize() {
    W = canvas.width = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }

  function drawConnections() {
    // Build all connection paths first, then stroke ONCE — huge batching win
    ctx.beginPath();
    ctx.lineWidth = 0.8;
    for (let i = 0; i < particles.length; i++) {
      const pi = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const pj = particles[j];
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const distSq = dx * dx + dy * dy;
        // Use squared threshold — avoids every Math.sqrt() here
        if (distSq < CONNECT_DIST_SQ) {
          ctx.moveTo(pi.x, pi.y);
          ctx.lineTo(pj.x, pj.y);
        }
      }
    }
    ctx.strokeStyle = "rgba(99,102,241,0.1)";
    ctx.stroke(); // ONE draw call for all connection lines
  }

  function init() {
    resize();
    particles = Array.from({ length: NUM }, () => new Particle());
    window.addEventListener("resize", resize, { passive: true });
    canvas.addEventListener(
      "mousemove",
      (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      },
      { passive: true },
    );
    canvas.addEventListener("mouseleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
    // Pause animation when tab is not visible to save CPU
    document.addEventListener("visibilitychange", () => {
      paused = document.hidden;
      if (!paused) loop();
    });
    loop();
  }

  function loop() {
    if (paused) return;
    // Fill background since alpha:false requires us to paint the bg
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, W, H);
    drawConnections();
    particles.forEach((p) => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(loop);
  }

  init();
})();

/* ─────────────────────────────────────────────────────
   5. TYPED TEXT
───────────────────────────────────────────────────── */
(function initTyped() {
  const el = qs("#typed-text");
  if (!el) return;

  const phrases = [
    "Computer Science Student",
    "Web Developer",
    "Cyber Security Enthusiast",
    "Linux Learner",
  ];
  let pi = 0,
    ci = 0,
    deleting = false;
  const SPEED_TYPE = 80,
    SPEED_DEL = 45,
    PAUSE = 1800;

  function tick() {
    const phrase = phrases[pi];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++ci);
      if (ci === phrase.length) {
        deleting = true;
        setTimeout(tick, PAUSE);
        return;
      }
    } else {
      el.textContent = phrase.slice(0, --ci);
      if (ci === 0) {
        deleting = false;
        pi = (pi + 1) % phrases.length;
      }
    }
    setTimeout(tick, deleting ? SPEED_DEL : SPEED_TYPE);
  }
  tick();
})();

/* ─────────────────────────────────────────────────────
   6. SCROLL REVEAL (IntersectionObserver fallback)
───────────────────────────────────────────────────── */
(function initReveal() {
  // Skip if scroll-driven animations are supported (CSS handles it)
  if (CSS.supports("animation-timeline", "scroll()")) return;

  const items = qsa(".reveal-up, .reveal-left, .reveal-right");
  if (!items.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const delay = +(entry.target.dataset.delay || 0);
          setTimeout(() => entry.target.classList.add("visible"), delay);
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
  );

  items.forEach((el) => obs.observe(el));
})();

/* ─────────────────────────────────────────────────────
   7. COUNTER ANIMATION
───────────────────────────────────────────────────── */
(function initCounters() {
  const nums = qsa(".stat-num[data-target]");
  if (!nums.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.dataset.target;
        const dur = 1500;
        const start = performance.now();

        function update(now) {
          const t = Math.min((now - start) / dur, 1);
          const eased =
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
          el.textContent = Math.round(eased * target);
          if (t < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        obs.unobserve(el);
      });
    },
    { threshold: 0.5 },
  );

  nums.forEach((n) => obs.observe(n));
})();

/* ─────────────────────────────────────────────────────
   8. SKILL BAR ANIMATION
───────────────────────────────────────────────────── */
(function initSkillBars() {
  const bars = qsa(".skill-fill");
  if (!bars.length) return;

  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const bar = entry.target;
        setTimeout(() => {
          bar.style.width = (bar.dataset.width || 80) + "%";
        }, 200);
        obs.unobserve(bar);
      });
    },
    { threshold: 0.3 },
  );

  bars.forEach((b) => obs.observe(b));
})();

/* ─────────────────────────────────────────────────────
   9. TESTIMONIAL SLIDER
───────────────────────────────────────────────────── */
(function initTestimonials() {
  const cards = qsa(".testimonial-card");
  const dots = qsa(".dot");
  if (!cards.length) return;

  let current = 0;
  let timer;

  function goTo(idx) {
    cards[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (idx + cards.length) % cards.length;
    cards[current].classList.add("active");
    dots[current].classList.add("active");
  }

  function autoPlay() {
    timer = setInterval(() => goTo(current + 1), 4500);
  }

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      clearInterval(timer);
      goTo(i);
      autoPlay();
    });
  });

  autoPlay();
})();

/* ─────────────────────────────────────────────────────
   10. CONTACT FORM
───────────────────────────────────────────────────── */
(function initForm() {
  const form = qs("#contact-form");
  const success = qs("#form-success");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const text = btn.querySelector(".btn-text");

    btn.disabled = true;
    text.textContent = "Sending…";

    // Simulate send
    setTimeout(() => {
      text.textContent = "Send Message";
      btn.disabled = false;
      form.reset();
      success.classList.add("visible");
      setTimeout(() => success.classList.remove("visible"), 5000);
    }, 1800);
  });
})();

/* ─────────────────────────────────────────────────────
   11. SCROLL-TO-TOP
───────────────────────────────────────────────────── */
(function initScrollTop() {
  const btn = qs("#scroll-top");
  if (!btn) return;
  btn.addEventListener("click", () => smoothScrollTo(0));
})();

/* ─────────────────────────────────────────────────────
   12. PROJECT HORIZONTAL SCROLLER
──────────────────────────────────────────────────── */
(function initProjectScroller() {
  const scroller = qs("#projects-grid");
  const leftBtn = qs("#project-scroll-left");
  const rightBtn = qs("#project-scroll-right");
  if (!scroller || !leftBtn || !rightBtn) return;

  const getStep = () => {
    const firstCard = scroller.querySelector(".project-card");
    if (!firstCard) return 360;
    return firstCard.getBoundingClientRect().width + 32;
  };

  function smoothScrollToX(targetLeft) {
    const startLeft = scroller.scrollLeft;
    const distance = targetLeft - startLeft;
    const duration = 500;
    const startTime = performance.now();

    function animate(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      scroller.scrollLeft = startLeft + distance * eased;

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }

    requestAnimationFrame(animate);
  }

  leftBtn.addEventListener("click", () => {
    smoothScrollToX(scroller.scrollLeft - getStep());
  });

  rightBtn.addEventListener("click", () => {
    smoothScrollToX(scroller.scrollLeft + getStep());
  });

  scroller.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      smoothScrollToX(scroller.scrollLeft + e.deltaY * 1.2);
    },
    { passive: false },
  );
})();

/* ─────────────────────────────────────────────────────
   13. SMOOTH ANCHOR SCROLLING & NAVIGATION TRANSITIONS
───────────────────────────────────────────────────── */
let activeScrollRaf = null;

function highlightSection(target) {
  if (!target) return;
  const label = target.querySelector(".section-label") || target.querySelector(".hero-greeting");
  if (label) {
    label.classList.remove("section-highlight");
    void label.offsetWidth; // trigger reflow
    label.classList.add("section-highlight");
    setTimeout(() => label.classList.remove("section-highlight"), 1300);
  }
}

function smoothScrollTo(targetY, duration) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo({ top: targetY, behavior: "auto" });
    return;
  }

  if (activeScrollRaf) {
    cancelAnimationFrame(activeScrollRaf);
    activeScrollRaf = null;
  }

  const startY = window.scrollY;
  const distance = targetY - startY;

  if (Math.abs(distance) < 2) return;

  // Adaptive duration: min 700ms, max 1150ms depending on travel distance
  if (!duration) {
    duration = Math.min(Math.max(Math.abs(distance) * 0.65, 700), 1150);
  }

  const startTime = performance.now();

  // Smooth cinematic easeInOutCubic curve
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  const cancelScroll = () => {
    if (activeScrollRaf) {
      cancelAnimationFrame(activeScrollRaf);
      activeScrollRaf = null;
    }
    cleanupListeners();
  };

  const cleanupListeners = () => {
    window.removeEventListener("wheel", cancelScroll, { passive: true });
    window.removeEventListener("touchstart", cancelScroll, { passive: true });
  };

  window.addEventListener("wheel", cancelScroll, { passive: true });
  window.addEventListener("touchstart", cancelScroll, { passive: true });

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeInOutCubic(progress);

    window.scrollTo(0, startY + distance * eased);

    if (progress < 1) {
      activeScrollRaf = requestAnimationFrame(step);
    } else {
      activeScrollRaf = null;
      cleanupListeners();
    }
  }

  activeScrollRaf = requestAnimationFrame(step);
}

qsa('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    const target = qs(href);
    if (!target) return;
    e.preventDefault();

    // Click feedback animation on link
    a.classList.add("nav-clicked");
    setTimeout(() => a.classList.remove("nav-clicked"), 500);

    const isHero = href === "#hero";
    const navH = isHero ? 0 : (+getComputedStyle(document.documentElement)
      .getPropertyValue("--nav-h")
      .replace("px", "") || 72);

    const top = isHero ? 0 : Math.max(0, target.getBoundingClientRect().top + window.scrollY - navH + 1);

    const menu = qs("#mobile-menu");
    const toggle = qs("#nav-toggle");
    if (menu && menu.classList.contains("open")) {
      menu.classList.remove("open");
      if (toggle) toggle.classList.remove("open");
      document.body.classList.remove("menu-open");
      document.body.style.overflow = "";

      // Smooth 100ms pause after closing menu before gliding
      setTimeout(() => {
        smoothScrollTo(top);
        setTimeout(() => highlightSection(target), 350);
      }, 100);
      return;
    }

    smoothScrollTo(top);
    setTimeout(() => highlightSection(target), 300);
  });
});

/* ─────────────────────────────────────────────────────
   13. PARALLAX on hero name (subtle tilt)
───────────────────────────────────────────────────── */
(function initParallax() {
  const hero = qs(".hero-content");
  if (!hero) return;
  let tx = 0,
    ty = 0;
  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;

  // Cache center on resize to avoid reading innerWidth inside mousemove
  window.addEventListener(
    "resize",
    () => {
      cx = window.innerWidth / 2;
      cy = window.innerHeight / 2;
    },
    { passive: true },
  );

  // Store target values in mousemove (passive — no layout reads here)
  document.addEventListener(
    "mousemove",
    (e) => {
      tx = ((e.clientX - cx) / cx) * 8;
      ty = ((e.clientY - cy) / cy) * 5;
    },
    { passive: true },
  );

  // Apply in rAF — style writes are batched with the frame
  let currentX = 0,
    currentY = 0;

  function render() {
    currentX = lerp(currentX, tx * 0.25, 0.1);
    currentY = lerp(currentY, ty * 0.25, 0.1);
    hero.style.transform = `translate(${currentX}px, ${currentY}px)`;
    requestAnimationFrame(render);
  }
  render();
})();

/* ─────────────────────────────────────────────────────
   14. SKILLS — Horizontal slider
───────────────────────────────────────────────────── */
(function initSkillsCarousel() {
  const slider = qs("#skills-slider");
  const cards = qsa(".skill-card--slider");
  const prev = qs("#skills-prev");
  const next = qs("#skills-next");
  if (!slider || !cards.length || !prev || !next) return;

  let active = 0;

  function updateCards() {
    cards.forEach((card, index) => {
      const isActive = index === active;
      card.classList.toggle("is-active", isActive);
      card.style.opacity = isActive ? "1" : "0.68";
      card.style.filter = isActive ? "blur(0)" : "blur(0.2px)";
    });

    const activeCard = cards[active];
    if (activeCard) {
      const offset =
        activeCard.offsetLeft -
        (slider.clientWidth - activeCard.offsetWidth) / 2;
      slider.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
    }

    prev.disabled = active === 0;
    next.disabled = active === cards.length - 1;
  }

  function goTo(nextIndex) {
    active = Math.max(0, Math.min(cards.length - 1, nextIndex));
    updateCards();
  }

  prev.addEventListener("click", () => goTo(active - 1));
  next.addEventListener("click", () => goTo(active + 1));

  // Sync active card on manual touch scroll
  let scrollTimeout;
  slider.addEventListener(
    "scroll",
    () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const sliderCenter = slider.scrollLeft + slider.clientWidth / 2;
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, index) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2;
          const distance = Math.abs(sliderCenter - cardCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
          }
        });

        if (closestIndex !== active) {
          active = closestIndex;
          cards.forEach((card, index) => {
            const isActive = index === active;
            card.classList.toggle("is-active", isActive);
            card.style.opacity = isActive ? "1" : "0.68";
            card.style.filter = isActive ? "blur(0)" : "blur(0.2px)";
          });
          prev.disabled = active === 0;
          next.disabled = active === cards.length - 1;
        }
      }, 60);
    },
    { passive: true }
  );

  updateCards();
})();
