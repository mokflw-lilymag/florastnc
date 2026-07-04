from pathlib import Path

html_path = Path("docs/floxync-manual.html")
snippet_path = Path("docs/content-production/01-document-manual/_situation-guides-snippet.html")
html = html_path.read_text(encoding="utf-8")
if 'id="manual-hub"' in html:
    print("already has manual-hub")
else:
    snippet = snippet_path.read_text(encoding="utf-8").rstrip() + "\n\n"
    needle = '        <div id="screenshot-guide"'
    if needle not in html:
        raise SystemExit("needle not found")
    html = html.replace(needle, snippet + '        <div id="screenshot-guide"', 1)
    html_path.write_text(html, encoding="utf-8")
    print("inserted ok")
