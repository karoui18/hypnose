"""Check every generated page's local links/assets and PDF signatures."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import json
ROOT=Path(__file__).resolve().parents[1]
errors=[]
class Check(HTMLParser):
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        for key in ('href','src'):
            value=attrs.get(key,'');parsed=urlsplit(value)
            if parsed.scheme or parsed.netloc or not parsed.path:continue
            if not (ROOT/unquote(parsed.path)).is_file():errors.append(f'{self.page}: missing {value}')
        if tag=='img' and 'alt' not in attrs:errors.append(f'{self.page}: image missing alt')
for page in ROOT.glob('*.html'):
    parser=Check();parser.page=page.name;parser.feed(page.read_text())
for pdf in (ROOT/'assets').glob('*.pdf'):
    if not pdf.read_bytes().startswith(b'%PDF'):errors.append(f'{pdf.name}: invalid signature')
result={'pages':len(list(ROOT.glob('*.html'))),'local_pdfs':len(list((ROOT/'assets').glob('*.pdf'))),'errors':errors}
(ROOT/'qa/link-check.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result,indent=2))
raise SystemExit(bool(errors))
