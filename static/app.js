// 0x04am — small client-side enhancements
// 1. HUD clock         — live local time in the status strip
// 2. Cmd-K search       — fuzzy search across posts + tags + commands
// 3. TOC scroll-spy     — highlight active heading in the post sidebar
//
// All data comes from window.__POSTS / __TAGS / __URLS, generated at build
// time by base.html.

(() => {
  "use strict";

  // ──────────────────────────────────────────
  // 1. HUD clock
  // ──────────────────────────────────────────
  const clockEl = document.getElementById("hud-clock");
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      clockEl.textContent = `${h}:${m}:${s}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ──────────────────────────────────────────
  // 2. Cmd-K search modal
  // ──────────────────────────────────────────
  const overlay   = document.getElementById("cmdk-overlay");
  const input     = document.getElementById("cmdk-input");
  const resultsEl = document.getElementById("cmdk-results");
  const countEl   = document.getElementById("cmdk-count");
  const trigger   = document.getElementById("search-trigger");

  let activeIdx = 0;
  let currentResults = [];

  const POSTS = window.__POSTS || [];
  const TAGS  = window.__TAGS  || [];
  const URLS  = window.__URLS  || {};

  const COMMANDS = [
    { label: "go to home",  url: URLS.home  },
    { label: "go to blog",  url: URLS.blog  },
    { label: "go to tags",  url: URLS.tags  },
    { label: "go to about", url: URLS.about },
  ];

  function openCmdK() {
    if (!overlay) return;
    overlay.hidden = false;
    input.value = "";
    activeIdx = 0;
    render("");
    setTimeout(() => input.focus(), 30);
  }

  function closeCmdK() {
    if (!overlay) return;
    overlay.hidden = true;
  }

  function highlight(text, q) {
    if (!q) return escapeHtml(text);
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escapeHtml(text);
    return (
      escapeHtml(text.slice(0, idx)) +
      `<span class="cmdk-hl">${escapeHtml(text.slice(idx, idx + q.length))}</span>` +
      escapeHtml(text.slice(idx + q.length))
    );
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function search(q) {
    const query = q.trim().toLowerCase();
    if (!query) {
      return {
        posts: POSTS.slice(0, 6),
        tags:  TAGS.slice(0, 6),
        cmds:  [],
      };
    }
    const posts = POSTS.filter(p => {
      const hay = (p.title + " " + (p.desc || "") + " " + (p.tags || []).join(" ")).toLowerCase();
      return hay.includes(query);
    });
    const tags = TAGS.filter(t => t.name.toLowerCase().includes(query));
    const cmds = COMMANDS.filter(c => c.label.includes(query));
    return { posts, tags, cmds };
  }

  function render(q) {
    const { posts, tags, cmds } = search(q);
    currentResults = [
      ...posts.map(p => ({ kind: "post", payload: p })),
      ...tags.map(t  => ({ kind: "tag",  payload: t })),
      ...cmds.map(c  => ({ kind: "cmd",  payload: c })),
    ];

    if (currentResults.length === 0) {
      resultsEl.innerHTML = `<div class="cmdk__empty">// no results for "${escapeHtml(q)}"</div>`;
      countEl.textContent = "0 results";
      return;
    }

    let html = "";
    if (posts.length) {
      html += `<div class="cmdk__group">POSTS · ${posts.length}</div>`;
      posts.forEach((p, i) => {
        const idx = i;
        const active = idx === activeIdx ? " cmdk__result--active" : "";
        html += `
          <div class="cmdk__result${active}" data-idx="${idx}">
            <span class="cmdk__result-glyph">▸</span>
            <span class="cmdk__result-title">${highlight(p.title, q)}</span>
            <span class="cmdk__result-date">${escapeHtml(p.date)}</span>
          </div>`;
      });
    }
    if (tags.length) {
      html += `<div class="cmdk__group">TAGS · ${tags.length}</div>`;
      tags.forEach((t, i) => {
        const idx = posts.length + i;
        const active = idx === activeIdx ? " cmdk__result--active" : "";
        html += `
          <div class="cmdk__result${active}" data-idx="${idx}">
            <span class="cmdk__result-glyph">#</span>
            <span class="cmdk__result-title">${highlight(t.name, q)}</span>
            <span class="cmdk__result-date">${t.count} post${t.count === 1 ? "" : "s"}</span>
          </div>`;
      });
    }
    if (cmds.length) {
      html += `<div class="cmdk__group">COMMANDS · ${cmds.length}</div>`;
      cmds.forEach((c, i) => {
        const idx = posts.length + tags.length + i;
        const active = idx === activeIdx ? " cmdk__result--active" : "";
        html += `
          <div class="cmdk__result${active}" data-idx="${idx}">
            <span class="cmdk__result-glyph">›</span>
            <span class="cmdk__result-title">${highlight(c.label, q)}</span>
          </div>`;
      });
    }

    resultsEl.innerHTML = html;
    countEl.textContent =
      currentResults.length + " result" + (currentResults.length === 1 ? "" : "s");

    // Bind clicks + hover
    resultsEl.querySelectorAll(".cmdk__result").forEach(el => {
      el.addEventListener("click",      () => pick(parseInt(el.dataset.idx, 10)));
      el.addEventListener("mouseenter", () => {
        activeIdx = parseInt(el.dataset.idx, 10);
        updateActive();
      });
    });
  }

  function updateActive() {
    resultsEl.querySelectorAll(".cmdk__result").forEach((el, i) => {
      el.classList.toggle("cmdk__result--active", i === activeIdx);
    });
  }

  function pick(idx) {
    const item = currentResults[idx];
    if (!item) return;
    const url =
      item.kind === "post" ? item.payload.url :
      item.kind === "tag"  ? item.payload.url :
      item.payload.url;
    closeCmdK();
    if (url) window.location.href = url;
  }

  if (overlay && input) {
    input.addEventListener("input", e => {
      activeIdx = 0;
      render(e.target.value);
    });

    overlay.addEventListener("click", e => {
      if (e.target === overlay) closeCmdK();
    });

    // Global hotkeys
    document.addEventListener("keydown", e => {
      // Cmd/Ctrl + K toggles
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        overlay.hidden ? openCmdK() : closeCmdK();
        return;
      }

      // "/" opens (when nothing else is focused)
      if (e.key === "/" && overlay.hidden && document.activeElement === document.body) {
        e.preventDefault();
        openCmdK();
        return;
      }

      if (overlay.hidden) return;

      if (e.key === "Escape") {
        e.preventDefault();
        closeCmdK();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIdx = Math.min(currentResults.length - 1, activeIdx + 1);
        updateActive();
        scrollIntoView();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIdx = Math.max(0, activeIdx - 1);
        updateActive();
        scrollIntoView();
      } else if (e.key === "Enter") {
        e.preventDefault();
        pick(activeIdx);
      }
    });
  }

  function scrollIntoView() {
    const el = resultsEl.querySelectorAll(".cmdk__result")[activeIdx];
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pr = resultsEl.getBoundingClientRect();
    if (r.top < pr.top) el.parentNode.scrollTop -= (pr.top - r.top + 8);
    if (r.bottom > pr.bottom) el.parentNode.scrollTop += (r.bottom - pr.bottom + 8);
  }

  if (trigger) {
    trigger.addEventListener("click", openCmdK);
  }

  // ──────────────────────────────────────────
  // 3. TOC scroll-spy
  // ──────────────────────────────────────────
  const tocLinks = document.querySelectorAll("[data-toc-link]");
  if (tocLinks.length) {
    const ids = [...tocLinks].map(a => a.getAttribute("href").slice(1));
    const headings = ids.map(id => document.getElementById(id)).filter(Boolean);

    if (headings.length) {
      const observer = new IntersectionObserver(
        entries => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              tocLinks.forEach(a => {
                a.classList.toggle(
                  "toc__link--active",
                  a.getAttribute("href") === "#" + entry.target.id
                );
              });
              break;
            }
          }
        },
        { rootMargin: "-90px 0px -65% 0px", threshold: 0 }
      );
      headings.forEach(h => observer.observe(h));
    }

    // Smooth scroll on click
    tocLinks.forEach(a => {
      a.addEventListener("click", e => {
        const id = a.getAttribute("href").slice(1);
        const el = document.getElementById(id);
        if (!el) return;
        e.preventDefault();
        window.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
        history.replaceState(null, "", "#" + id);
      });
    });
  }
})();

  // ──────────────────────────────────────────
  // 4. Smooth page transitions
  // ──────────────────────────────────────────
  // Pure CSS — .main gets a fade-in on load. No JS needed.
