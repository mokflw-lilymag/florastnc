"""Insert S0 + S6-S11 situation guides into floxync-manual.html."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
html_path = ROOT / "docs" / "floxync-manual.html"
snippet_path = ROOT / "docs" / "content-production" / "01-document-manual" / "_sit-s6-s11-snippet.html"

html = html_path.read_text(encoding="utf-8")
if 'id="sit-mobile-order"' in html:
    print("already has sit-mobile-order")
    raise SystemExit(0)

snippet = snippet_path.read_text(encoding="utf-8").rstrip() + "\n\n"

needle = """          <p class="text-xs text-slate-500">더 자세히: <a href="#nav-new-order" class="text-emerald-700 underline">새 주문</a> · <a href="#nav-delivery" class="text-emerald-700 underline">배송·픽업</a> · <a href="#nav-daily-settlement" class="text-emerald-700 underline">일일 마감</a> · <a href="#nav-expenses" class="text-emerald-700 underline">지출</a></p>
        </article>
      </section>"""

if needle not in html:
    raise SystemExit("S5 end needle not found")

insert = """          <p class="text-xs text-slate-500">더 자세히: <a href="#nav-new-order" class="text-emerald-700 underline">새 주문</a> · <a href="#nav-delivery" class="text-emerald-700 underline">배송·픽업</a> · <a href="#nav-daily-settlement" class="text-emerald-700 underline">일일 마감</a> · <a href="#nav-expenses" class="text-emerald-700 underline">지출</a></p>
        </article>

""" + snippet + """      </section>"""

html = html.replace(needle, insert, 1)
html_path.write_text(html, encoding="utf-8")
print("inserted S0 + S6-S11 ok")
