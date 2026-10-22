"""Injecte data/articles.json dans le gabarit → web/radar.html (artifact) et index.html (GitHub Pages)."""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
tpl = (root / "web/template.html").read_text()
snap = json.dumps(json.load(open(root / "data/articles.json")), ensure_ascii=False).replace("</", "<\\/")
page = tpl.replace("__SNAPSHOT__", snap)
(root / "web/radar.html").write_text(page)
(root / "index.html").write_text('<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    + page.replace("<style>", "<style>\n[hidden]{display:none!important}", 1).replace("\n<div class=\"wrap\">", "\n</head>\n<body>\n<div class=\"wrap\">", 1) + "\n</body>\n</html>\n")
print("ok", len(page))
