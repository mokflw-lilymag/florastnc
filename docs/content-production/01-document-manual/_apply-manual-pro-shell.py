#!/usr/bin/env python3
"""floxync-manual-pro.html — 프로 UI 셸 (본문·앵커는 정본 복사본 유지)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PRO = ROOT / "docs" / "floxync-manual-pro.html"

NEW_HEAD_STYLE = """  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brand: { 50:'#ecfdf5',100:'#d1fae5',500:'#10b981',600:'#059669',700:'#047857',800:'#065f46',950:'#022c22' },
            ink: { 50:'#f8fafc',100:'#f1f5f9',200:'#e2e8f0',500:'#64748b',700:'#334155',900:'#0f172a' }
          },
          boxShadow: { 'pro': '0 1px 2px rgba(15,23,42,.06), 0 8px 24px rgba(15,23,42,.06)' },
          maxWidth: { 'doc': '48rem' }
        }
      }
    }
  </script>
  <style>
    :root {
      --brand: #059669;
      --brand-soft: #ecfdf5;
      --ink: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --sidebar-w: 17.5rem;
      --topbar-h: 3.75rem;
    }
    html { scroll-behavior: smooth; }
    body {
      font-family: 'Noto Sans KR', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--ink);
      background: linear-gradient(180deg, #f8fafc 0%, #fff 12rem);
    }
    .anchor-offset { scroll-margin-top: calc(var(--topbar-h) + 1rem); }
    .pro-topbar {
      height: var(--topbar-h);
      backdrop-filter: blur(12px);
      background: rgba(255,255,255,.88);
      border-bottom: 1px solid var(--border);
    }
    .pro-sidebar {
      width: var(--sidebar-w);
      top: var(--topbar-h);
      height: calc(100vh - var(--topbar-h));
      background: #fff;
      border-right: 1px solid var(--border);
    }
    .pro-main { margin-left: 0; padding-top: var(--topbar-h); }
    @media (min-width: 1024px) {
      .pro-main { margin-left: var(--sidebar-w); }
    }
    .sidebar-link {
      display: flex; align-items: center; gap: .5rem;
      padding: .45rem .65rem; border-radius: .5rem;
      font-size: .8125rem; line-height: 1.35; color: #475569;
      transition: background .15s, color .15s;
    }
    .sidebar-link:hover { background: #f1f5f9; color: var(--brand); }
    .sidebar-link.active {
      background: var(--brand-soft); color: var(--brand);
      font-weight: 600; box-shadow: inset 3px 0 0 var(--brand);
    }
    .sidebar-link.sit-link.active { background: #f5f3ff; color: #6d28d9; box-shadow: inset 3px 0 0 #7c3aed; }
    .sidebar-link.hidden-by-search { display: none !important; }
    .nav-group-title {
      font-size: .65rem; font-weight: 800; letter-spacing: .08em;
      text-transform: uppercase; color: var(--muted);
      padding: .75rem .5rem .35rem; cursor: pointer; user-select: none;
      display: flex; align-items: center; justify-content: space-between;
    }
    .nav-group-title:hover { color: var(--brand); }
    .nav-group-body { padding-left: .25rem; border-left: 2px solid #e2e8f0; margin-left: .5rem; margin-bottom: .5rem; }
    .nav-group-body.collapsed { display: none; }
    .nav-group-chevron { transition: transform .2s; font-size: .7rem; opacity: .5; }
    .nav-group.collapsed .nav-group-chevron { transform: rotate(-90deg); }
    #manual-search {
      width: 100%; padding: .5rem .75rem .5rem 2.25rem;
      border: 1px solid var(--border); border-radius: .625rem;
      font-size: .8125rem; background: #f8fafc;
    }
    #manual-search:focus { outline: 2px solid #a7f3d0; border-color: #6ee7b7; background: #fff; }
    .search-wrap { position: relative; margin-bottom: 1rem; }
    .search-wrap svg { position: absolute; left: .65rem; top: 50%; transform: translateY(-50%); width: 1rem; height: 1rem; color: #94a3b8; }
    .pro-preview-banner {
      background: linear-gradient(90deg, #065f46, #047857);
      color: #ecfdf5; font-size: .75rem; text-align: center; padding: .35rem .75rem;
    }
    .pro-doc article, .pro-doc section > .anchor-offset {
      scroll-margin-top: calc(var(--topbar-h) + 1rem);
    }
    .pro-doc table {
      border-collapse: separate; border-spacing: 0;
      width: 100%; font-size: .8125rem;
      border: 1px solid var(--border); border-radius: .75rem; overflow: hidden;
    }
    .pro-doc table thead { background: #f8fafc; }
    .pro-doc table th, .pro-doc table td { padding: .5rem .65rem; border-top: 1px solid #f1f5f9; vertical-align: top; }
    .pro-doc table tr:first-child th, .pro-doc table tr:first-child td { border-top: none; }
    .pro-doc table tbody tr:hover { background: #fafafa; }
    .img-placeholder {
      background: linear-gradient(45deg, #f8fafc 25%, #f1f5f9 25%, #f1f5f9 50%, #f8fafc 50%, #f8fafc 75%, #f1f5f9 75%);
      background-size: 16px 16px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #94a3b8; font-weight: 500; border: 1px dashed #cbd5e1; border-radius: .75rem;
    }
    .manual-figure .manual-shot-img.hidden { display: none; }
    .manual-figure .manual-shot-missing:not(.hidden) { display: flex; }
    #sidebar-backdrop {
      display: none; position: fixed; inset: 0; top: var(--topbar-h);
      background: rgba(15,23,42,.4); z-index: 35;
    }
    #sidebar-backdrop.open { display: block; }
    @media (max-width: 1023px) {
      .pro-sidebar {
        transform: translateX(-100%);
        transition: transform .25s ease;
        z-index: 40;
        box-shadow: 8px 0 32px rgba(15,23,42,.12);
      }
      .pro-sidebar.open { transform: translateX(0); }
    }
    .toc-rail {
      display: none;
    }
    @media (min-width: 1280px) {
      .pro-layout { display: grid; grid-template-columns: 1fr 11rem; gap: 2rem; max-width: 72rem; margin: 0 auto; }
      .toc-rail {
        display: block; position: sticky; top: calc(var(--topbar-h) + 1.5rem);
        align-self: start; max-height: calc(100vh - var(--topbar-h) - 2rem);
        overflow-y: auto; font-size: .75rem;
      }
      .toc-rail a { display: block; padding: .25rem 0; color: #64748b; border-left: 2px solid transparent; padding-left: .5rem; }
      .toc-rail a:hover, .toc-rail a.active { color: var(--brand); border-left-color: var(--brand); }
    }
  </style>"""

NEW_NAV = """  <div class="pro-preview-banner">
    ✨ <strong>프로 UI 프리뷰</strong> — 정본은 <code class="bg-white/10 px-1 rounded">/docs/manual</code> · 마음에 들면 <code class="bg-white/10 px-1 rounded">floxync-manual-pro.html</code>로 교체 가능
  </div>

  <header class="pro-topbar fixed top-0 z-50 w-full flex items-center">
    <div class="px-4 lg:px-5 w-full flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button type="button" id="sidebar-toggle" class="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="메뉴 열기">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a id="manual-back-home" href="#" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          돌아가기
        </a>
        <div class="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0">F</div>
        <div class="min-w-0">
          <p class="text-sm font-bold text-ink-900 truncate leading-tight">FloXync 사용 설명서</p>
          <p class="text-[10px] text-slate-500 font-medium">Pro Edition · v4.6</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span class="hidden md:inline text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-brand-50 text-brand-800 border border-brand-100">Preview</span>
        <a href="#faq-support" class="text-xs font-semibold text-brand-700 hover:text-brand-800 px-3 py-1.5 rounded-lg hover:bg-brand-50">고객센터</a>
      </div>
    </div>
  </header>

  <div id="sidebar-backdrop" aria-hidden="true"></div>"""

NEW_SIDEBAR_START = """  <aside id="logo-sidebar" class="pro-sidebar fixed left-0 overflow-y-auto" aria-label="문서 목차">
     <div class="h-full px-3 py-4">
        <div class="search-wrap">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"/></svg>
          <input type="search" id="manual-search" placeholder="목차 검색…" autocomplete="off" />
        </div>
        <div id="sidebar-nav">"""

NEW_MAIN_START = """  <main class="pro-main pro-doc">
    <div class="pro-layout px-4 sm:px-6 lg:px-10 pb-32">
    <div class="max-w-doc mx-auto w-full space-y-20 py-8 lg:py-12">"""

NEW_MAIN_END = """    </div>
    <aside class="toc-rail hidden xl:block" id="toc-rail" aria-label="이 페이지 목차">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">On this page</p>
      <nav id="toc-links"></nav>
    </aside>
    </div>
  </main>"""

PRO_SCRIPT_EXTRA = """
    // --- Pro UI: sidebar groups, search, mobile, TOC ---
    (function () {
      const sidebar = document.getElementById('logo-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      const toggle = document.getElementById('sidebar-toggle');
      const search = document.getElementById('manual-search');
      const navRoot = document.getElementById('sidebar-nav');

      function setSidebarOpen(open) {
        sidebar?.classList.toggle('open', open);
        backdrop?.classList.toggle('open', open);
      }
      toggle?.addEventListener('click', () => setSidebarOpen(!sidebar?.classList.contains('open')));
      backdrop?.addEventListener('click', () => setSidebarOpen(false));
      document.querySelectorAll('.sidebar-link').forEach((a) => {
        a.addEventListener('click', () => { if (window.innerWidth < 1024) setSidebarOpen(false); });
      });

      if (navRoot) {
        const children = Array.from(navRoot.childNodes);
        let buffer = [];
        const flush = (titleEl) => {
          if (!buffer.length) return;
          const group = document.createElement('div');
          group.className = 'nav-group';
          const title = document.createElement('div');
          title.className = 'nav-group-title';
          title.innerHTML = '<span>' + titleEl.textContent.trim() + '</span><span class="nav-group-chevron">▼</span>';
          const body = document.createElement('div');
          body.className = 'nav-group-body';
          buffer.forEach((n) => body.appendChild(n));
          title.addEventListener('click', () => {
            group.classList.toggle('collapsed');
            body.classList.toggle('collapsed');
          });
          group.appendChild(title);
          group.appendChild(body);
          navRoot.appendChild(group);
          buffer = [];
        };
        children.forEach((node) => {
          if (node.nodeType === 1 && node.classList?.contains('mb-4') && node.classList.contains('text-xs')) {
            flush(node);
            node.remove();
          } else if (node.nodeType === 1) {
            buffer.push(node);
          }
        });
        if (buffer.length) {
          const t = document.createElement('div');
          t.textContent = '기타';
          flush(t);
        }
      }

      search?.addEventListener('input', () => {
        const q = search.value.trim().toLowerCase();
        document.querySelectorAll('.sidebar-link').forEach((link) => {
          const text = link.textContent?.toLowerCase() || '';
          link.classList.toggle('hidden-by-search', q.length > 0 && !text.includes(q));
        });
        if (q) document.querySelectorAll('.nav-group').forEach((g) => {
          g.classList.remove('collapsed');
          g.querySelector('.nav-group-body')?.classList.remove('collapsed');
        });
      });

      const tocNav = document.getElementById('toc-links');
      const headings = document.querySelectorAll('.pro-doc h2[id], .pro-doc h3[id], .pro-doc h4[id]');
      headings.forEach((h) => {
        if (!h.id) return;
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent?.slice(0, 48) || h.id;
        a.style.paddingLeft = h.tagName === 'H3' ? '0.75rem' : h.tagName === 'H4' ? '1.25rem' : '0';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
        });
        tocNav?.appendChild(a);
      });
    })();
"""


def main() -> None:
    html = PRO.read_text(encoding="utf-8")

    # title
    html = html.replace(
        "<title>FloXync 사용 설명서 — 초보자도 따라하기</title>",
        "<title>FloXync 사용 설명서 (Pro Preview)</title>",
    )

    # replace head styles (from first style/import through </style> before </head>)
    start = html.find("<script src=\"https://cdn.tailwindcss.com\"></script>")
    end = html.find("</head>")
    if start == -1 or end == -1:
        raise SystemExit("head anchor not found")
    # remove old tailwind + style block
    old_chunk_end = html.find("</style>", start) + len("</style>")
    html = html[:start] + NEW_HEAD_STYLE + html[old_chunk_end:]

    # navbar through sidebar start
    nav_start = html.find("<!-- Navbar -->")
    main_start = html.find("<!-- Main Content -->")
    if nav_start == -1 or main_start == -1:
        raise SystemExit("nav/main anchor not found")
    sidebar_end_marker = html.find("</aside>", nav_start)
    # replace from navbar to end of aside opening content - actually replace nav + entire aside opening
    aside_start = html.find("<aside id=\"logo-sidebar\"", nav_start)
    aside_inner = html.find("<div class=\"h-full px-4 py-6\">", aside_start)
    aside_content_after = html.find("<div class=\"mb-4 text-xs font-bold text-gray-400", aside_inner)
    # Replace nav through aside inner start
    html = html[:nav_start] + NEW_NAV + "\n\n" + NEW_SIDEBAR_START + html[aside_content_after:]

    # close sidebar-nav before closing aside inner
    html = html.replace(
        "        <div class=\"mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-200 shadow-sm\">",
        "        </div>\n        <div class=\"mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100\">",
        1,
    )
    # fix: we need to wrap sidebar content - the script adds closing div for sidebar-nav before the FAQ card
    # Insert close sidebar-nav before the emerald FAQ card
    html = html.replace(
        "        </div>\n        <div class=\"mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100\">",
        "        </div>\n        </div>\n        <div class=\"mt-4 p-4 bg-brand-50 rounded-xl border border-brand-100\">",
        1,
    )

    # main wrapper
    html = html.replace(
        "  <!-- Main Content -->\n  <main class=\"p-4 sm:ml-72 pt-24\">\n    <div class=\"max-w-4xl mx-auto space-y-24 pb-32\">",
        "  <!-- Main Content -->\n" + NEW_MAIN_START,
        1,
    )
    html = html.replace(
        "    </div>\n  </main>\n\n  <script>",
        NEW_MAIN_END + "\n\n  <script>",
        1,
    )

    # body class
    html = html.replace('<body class="bg-white text-gray-800 antialiased">', '<body class="antialiased">')

    # inject pro script before closing script tag
    html = html.replace("  </script>\n</body>", PRO_SCRIPT_EXTRA + "\n  </script>\n</body>", 1)

    PRO.write_text(html, encoding="utf-8")
    print(f"Wrote {PRO} ({len(html)} chars)")


if __name__ == "__main__":
    main()
