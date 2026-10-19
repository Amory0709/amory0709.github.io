"""Apply the iPhone rendering fix without rebuilding the existing static app."""
from pathlib import Path
import shutil


deployment = Path(__file__).resolve().parent
export = deployment.parent / 'what-if-studio'
stylesheet = 'card-faces.20261019.css'
link = f'<link rel="stylesheet" href="/what-if-studio/{stylesheet}"/>'
pages = sorted(export.rglob('*.html'))
if not pages:
    raise SystemExit('No WhatIf HTML export found')

# Validate every page before modifying any of them.
contents = [(page, page.read_text()) for page in pages]
for page, html in contents:
    if html.count('</head>') != 1:
        raise SystemExit(f'Expected one closing head tag: {page}')

shutil.copyfile(deployment / 'whatif-card-faces.css', export / stylesheet)
for page, html in contents:
    if link not in html:
        page.write_text(html.replace('</head>', link + '</head>', 1))
print(f'Card-face stylesheet present in {len(pages)} HTML pages')
