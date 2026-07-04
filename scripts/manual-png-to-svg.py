# -*- coding: utf-8 -*-
import re
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "docs" / "floxync-manual.html"
t = p.read_text(encoding="utf-8")
before = len(re.findall(r'src="manual-screenshots/[^"]+\.png"', t))
t2 = re.sub(r'(src="manual-screenshots/[^"]+)\.png"', r"\1.svg\"", t)
p.write_text(t2, encoding="utf-8")
after = len(re.findall(r'src="manual-screenshots/[^"]+\.png"', t2))
print(f"png src: {before} -> {after}")
