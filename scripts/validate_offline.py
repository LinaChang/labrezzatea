"""Check downloaded navigation and HTML/CSS dependencies without network access."""
import collections
import html
import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
from mirror import OUT, ROOT, Parser, CSS, IMPORT

manifest = json.loads((ROOT / 'mirror-manifest.json').read_text('utf-8'))
issues = []
checked = 0
navigation = 0
images = 0
for record in manifest['records']:
    if 'path' not in record:
        continue
    file = OUT / record['path']
    ct = record.get('content_type', '')
    if not any(x in ct for x in ('html', 'css')):
        continue
    text = file.read_text('utf-8')
    refs = []
    if 'html' in ct:
        parser = Parser()
        parser.feed(text)
        refs.extend(parser.refs)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
    refs.extend((m[1], False) for m in CSS.findall(text))
    refs.extend((m[2], False) for m in IMPORT.findall(text))
    for raw, is_navigation in refs:
        raw = html.unescape(raw).strip()
        p = urlsplit(raw)
        if not raw or p.scheme or p.netloc or raw.startswith('#'):
            continue
        checked += 1
        navigation += is_navigation
        images += Path(p.path).suffix.lower() in ('.png','.jpg','.jpeg','.gif','.svg','.webp','.ico')
        target = (OUT / unquote(p.path).lstrip('/')) if raw.startswith('/') else file.parent / unquote(p.path)
        if not target.is_file():
            issues.append({'file':record['path'], 'reference':raw, 'navigation':is_navigation})

report = {
    'checked_local_references': checked,
    'checked_navigation_references': navigation,
    'checked_image_references': images,
    'missing_navigation': [x for x in issues if x['navigation']],
    'missing_dependencies': [dict(file=f,reference=r,occurrences=n) for (f,r),n in collections.Counter((x['file'],x['reference']) for x in issues if not x['navigation']).items()],
    'download_failures': [r for r in manifest['records'] if 'error' in r],
    'document_files': [r['path'] for r in manifest['records'] if Path(r.get('path','')).suffix.lower() in ('.pdf','.doc','.docx','.xls','.xlsx','.zip')],
    'visual_qa': 'Not performed: browser permission was declined.',
}
(ROOT / 'validation-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),'utf-8')
print(json.dumps({k:v for k,v in report.items() if k not in ('download_failures','missing_dependencies')},ensure_ascii=False,indent=2))
print('Missing dependency references:',len(report['missing_dependencies']))
if report['missing_navigation']:
    raise SystemExit(1)
