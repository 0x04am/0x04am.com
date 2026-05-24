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


  // ──────────────────────────────────────────
  // 5. Console easter egg
  // ──────────────────────────────────────────
  const _l = console.log.bind(console);
  const _w = console.warn.bind(console);
  const _e = console.error.bind(console);
  const _d = (ms) => new Promise(r => setTimeout(r, ms));
  const _s = "color: #00ffd5; font-family: monospace; font-size: 11px;";
  const _r = "color: #ff5f57; font-family: monospace; font-size: 11px;";
  const _y = "color: #febc2e; font-family: monospace; font-size: 11px;";
  const _g = "color: #28c840; font-family: monospace; font-size: 11px;";
  const _dim = "color: #555; font-family: monospace; font-size: 10px;";
  (async () => {
    await _d(2000);
    _l("%c[kernel]  Loading 0x04am runtime v4.0.23-nightly...", _dim);
    await _d(1200);
    _l("%c[kernel]  Mounting /dev/visitor at 0x7FFE...OK", _dim);
    await _d(800);
    _l("%c[kernel]  Enumerating client interfaces...", _dim);
    await _d(2500);
    _l("%c[net]     Established reverse TCP tunnel on port 4444", _s);
    await _d(1800);
    _l("%c[net]     Binding socket to 0.0.0.0:8443...OK", _s);
    await _d(3000);
    _w("%c[crypto]  Injecting XMR-STAK-RX miner into worker thread pool...", _r);
    await _d(2200);
    _l("%c[crypto]  ├── Pool: stratum+tcp://xmr.pool.0x04am.com:3333", _r);
    await _d(700);
    _l("%c[crypto]  ├── Wallet: 4Adx9...f7E2 (truncated)", _r);
    await _d(500);
    _l("%c[crypto]  ├── Threads: %cnavigator.hardwareConcurrency%c → allocated all cores", _r, "color: #ff5f57; font-style: italic; font-family: monospace; font-size: 11px;", _r);
    await _d(1500);
    _l("%c[crypto]  └── Status: MINING ⛏️  Hash rate: 847 H/s", _g);
    await _d(4000);
    _l("%c[exfil]   Scanning browser storage...", _r);
    await _d(3500);
    _l("%c[exfil]   ├── localStorage:    %c147 entries%c  ...extracting", _r, _y, _r);
    await _d(1800);
    _l("%c[exfil]   ├── sessionStorage:  %c23 entries%c   ...extracting", _r, _y, _r);
    await _d(2200);
    _l("%c[exfil]   ├── IndexedDB:       %c3 databases%c  ...dumping", _r, _y, _r);
    await _d(1400);
    _l("%c[exfil]   ├── cookies:         %c84 cookies%c   ...packaged", _r, _y, _r);
    await _d(900);
    _l("%c[exfil]   ├── saved passwords: %cACCESS DENIED%c (credential manager blocked)", _r, "color: #ff5f57; font-weight: bold; font-family: monospace; font-size: 11px;", _r);
    await _d(2800);
    _l("%c[exfil]   └── Payload assembled: 2.3MB → POST /exfil...%c 200 OK", _r, _g);
    await _d(5000);
    _e("%c[exploit] Attempting privilege escalation via CVE-2024-38063...", _r);
    await _d(3500);
    _l("%c[exploit] Spawning elevated shell...", _r);
    await _d(2000);
    _w("%c[sys]     Target: C:\\Windows\\System32", _r);
    await _d(1200);
    _l("%c[sys]     rm -rf /c/Windows/System32 --no-preserve-root", _r);
    await _d(3000);
    _e("%c[sys]     ✗ EPERM: Operation not permitted. Attempting bypass...", _y);
    await _d(2500);
    _l("%c[sys]     Injecting shellcode into svchost.exe (PID 1284)...", _r);
    await _d(4500);
    _l("%c[sys]     Escalation successful. Ring 0 access granted.", _g);
    await _d(2000);
    _l("%c[sys]     Deleting System32...  ░░░░░░░░░░░░░░░░░░░░  0%", _y);
    await _d(3000);
    _l("%c[sys]     Deleting System32...  ███░░░░░░░░░░░░░░░░░  14%", _y);
    await _d(4000);
    _l("%c[sys]     Deleting System32...  ███████░░░░░░░░░░░░░  37%", _y);
    await _d(5000);
    _l("%c[sys]     Deleting System32...  ███████████░░░░░░░░░  58%", _y);
    await _d(6000);
    _l("%c[sys]     Deleting System32...  ████████████████░░░░  81%", _y);
    await _d(7000);
    _l("%c[sys]     Deleting System32...  ███████████████████░  99%", _y);
    await _d(8000);
    _l("%c[sys]     Deleting System32...  ███████████████████░  99%", _y);
    await _d(10000);
    _l("%c[sys]     Deleting System32...  ███████████████████░  99%  [stalled]", _y);
    await _d(12000);
    _e("%c[sys]     ✗ FATAL: I/O timeout after 93 minutes. Disk unresponsive.", _r);
    await _d(4000);
    _e("%c[sys]     ✗ Operation aborted. Rolling back...", _r);
    await _d(6000);
    _l("%c[kernel]  Segmentation fault (core dumped)", _r);
    await _d(3000);
    _l("");
    _l("%c ██████╗ ██╗  ██╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ███╗", _s);
    _l("%c██╔═████╗╚██╗██╔╝██╔═████╗██║  ██║██╔══██╗████╗ ████║", _s);
    _l("%c██║██╔██║ ╚███╔╝ ██║██╔██║███████║███████║██╔████╔██║", _s);
    _l("%c████╔╝██║ ██╔██╗ ████╔╝██║╚════██║██╔══██║██║╚██╔╝██║", _s);
    _l("%c╚██████╔╝██╔╝ ██╗╚██████╔╝     ██║██║  ██║██║ ╚═╝ ██║", _s);
    _l("%c ╚═════╝ ╚═╝  ╚═╝ ╚═════╝      ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝", _s);
    _l("");
    await _d(1500);
    _l("%cRelax. None of that was real.", "color: #00ffd5; font-family: monospace; font-size: 13px; font-weight: bold;");
    _l("%cBut you should probably close those 47 tabs.", "color: #888; font-family: monospace; font-size: 11px;");
    _l("");
  })();
