"""One-time, bounded import of the public reference. Requires beautifulsoup4.
Normal editing/building does not require network access or BeautifulSoup.
"""
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote, quote
from urllib.request import urlopen, Request
from concurrent.futures import ThreadPoolExecutor
from bs4 import BeautifulSoup
import hashlib, json, re

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.hypnosite.fr/'
cache = {}
manifest = []
failures = []

def fetch(url):
    url = quote(unquote(url), safe=':/?=&%+#')
    try:
        with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=25) as r:
            return r.read()
    except Exception as e:
        failures.append({'url': url, 'error': str(e)})
        return b''

def slug(url):
    name = unquote(urlparse(url).path).split('/')[-1]
    if name in ('', 'index.htm', 'index.html'): return 'index'
    return re.sub(r'[^a-z0-9]+', '-', name.rsplit('.', 1)[0].lower()).strip('-')

def asset(url):
    url = urljoin(BASE, url)
    if url in cache: return cache[url]
    ext = Path(unquote(urlparse(url).path)).suffix.lower()
    name = re.sub(r'[^a-z0-9]+', '-', Path(unquote(urlparse(url).path)).stem.lower()).strip('-')
    local = 'assets/' + name[:65] + '-' + hashlib.sha1(url.encode()).hexdigest()[:8] + ext
    data = fetch(url)
    if not data: return url
    if ext == '.pdf' and not data.startswith(b'%PDF'):
        failures.append({'url': url, 'error': 'Not a PDF response'}); return url
    (ROOT / local).write_bytes(data)
    cache[url] = local
    manifest.append({'source': url, 'local': local, 'bytes': len(data)})
    return local

pages = {}
pending = [BASE]
for depth in range(3):
    urls = sorted(set(pending) - pages.keys())[:180-len(pages)]
    if not urls: break
    for url, raw in zip(urls, ThreadPoolExecutor(4).map(fetch, urls)):
        if raw: pages[url] = BeautifulSoup(raw, 'html.parser')
    pending = []
    for soup in pages.values():
        for a in soup.select('a[href]'):
            url = urljoin(BASE, a['href']).split('#')[0]
            if urlparse(url).netloc == 'www.hypnosite.fr' and urlparse(url).path.lower().endswith(('.htm', '.html')) and slug(url) != 'index': pending.append(url)
    print('Pages:', len(pages), flush=True)

page_slugs = {url: slug(url) for url in pages}
pdfs = []
def link(href):
    url = urljoin(BASE, href)
    if urlparse(url).path.lower().endswith('.pdf'):
        local = asset(url)
        if not any(x['source'] == url for x in pdfs): pdfs.append({'source': url, 'local': local})
        return local
    clean = url.split('#')[0]
    if slug(clean) == 'index' and urlparse(clean).netloc == 'www.hypnosite.fr': return 'index.html'
    if clean in page_slugs: return page_slugs[clean] + '.html' + ('#'+url.split('#')[1] if '#' in url else '')
    return url if not href.startswith(('mailto:', 'tel:', '#')) else href

def clean_html(node):
    copy = BeautifulSoup(str(node), 'html.parser')
    for bad in copy.select('script, style, form, input, textarea, select, button'): bad.decompose()
    for el in copy.find_all(True):
        for key in list(el.attrs):
            if key not in ('href', 'src', 'style', 'title', 'colspan', 'rowspan'): del el.attrs[key]
        if el.has_attr('href'): el['href'] = link(el['href'])
        if el.has_attr('src'): el['src'] = asset(el['src'])
    return ''.join(str(x) for x in copy.contents)

for url, soup in pages.items():
    css = ''
    for tag in soup.select('link[rel="stylesheet"]'):
        href = tag.get('href', '')
        if 'WEFiles/' not in href and 'Fonts' not in href: css += fetch(urljoin(BASE, href)).decode('utf-8', 'replace')
    rules = {}
    for selector, body in re.findall(r'([^{}]+)\{([^{}]*)\}', css.split('@media')[0]):
        rules[selector.strip()] = dict(re.findall(r'([\w-]+)\s*:\s*([^;]+)', body))
    def convert(el):
        classes = el.get('class', [])
        if any('Counter' in x for x in classes): return None
        ident = el.get('id', '')
        style = {}
        for cl in classes:
            if cl.startswith('OESK_'): style.update(rules.get('.'+cl, {}))
        style.update(rules.get('#'+ident, {}))
        style.pop('position', None)
        style.update(dict(re.findall(r'(z-index)\s*:\s*([^;]+)', el.get('style', ''))))
        children = [x for x in el.select('.BaseDiv') if x.find_parent(class_='BaseDiv') == el]
        if children:
            return {'type':'group', 'name':ident, 'layout':style, 'items':[v for x in children if (v:=convert(x))]}
        img = el.find('img')
        text = el.get_text(' ', strip=True)
        if img:
            a = img.find_parent('a')
            label = unquote(Path(urlparse(img.get('src','')).path).stem).split('-WE')[0].replace('_',' ')
            return {'type':'image', 'name':label, 'layout':style, 'src':asset(img['src']), 'href':link(a['href']) if a and a.has_attr('href') else '', 'label':label}
        if not text: return None
        content = el.select_one('.ContentBox') or el.select_one('.OESZ_Text') or el
        return {'type':'text', 'name':ident, 'layout':style, 'text':text, 'html':clean_html(content)}
    layers = []
    for kind in ['Header','Content','Footer']:
        container = soup.select_one('.OESZ_XBody'+kind)
        if not container: continue
        layout = rules.get('#XBody .OESZ_XBody'+kind, {})
        if layout.get('display') == 'none': continue
        elements = [el for el in container.select('.BaseDiv') if el.find_parent(class_='BaseDiv') and el.find_parent(class_='BaseDiv').get('id') == 'XBody']
        items = [v for el in elements if (v:=convert(el))]
        if items: layers.append({'name':kind.lower(), 'height':layout.get('height', '550px' if kind=='Content' else '50px'), 'items':items})
    # Associate nearby short labels with images for mobile, keeping desktop geometry intact.
    def number(x):
        try: return float(str(x).replace('px',''))
        except: return 0
    for layer in layers:
        images = [x for x in layer['items'] if x['type']=='image']
        for item in layer['items']:
            if item['type'] != 'text' or len(item['text']) > 100: continue
            x,y = number(item['layout'].get('left')),number(item['layout'].get('top'))
            candidates = []
            for im in images:
                ix,iy,w = (number(im['layout'].get(k)) for k in ('left','top','width'))
                if iy <= y <= iy+260 and ix-50 <= x <= ix+w+35:
                    candidates.append((abs(x-(ix+w/2))*.4+abs(y-iy-130),im))
            if candidates:
                im = min(candidates,key=lambda c:c[0])[1]
                im['label'] = item['text'];item['mobileHidden'] = True
    title = soup.title.get_text(strip=True) if soup.title else slug(url)
    data = {'title':title,'source':url,'width':rules.get('#XBody',{}).get('width','900px'),'layers':layers}
    (ROOT/'content'/(slug(url)+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
    print('Imported',slug(url),flush=True)

font_css = fetch(BASE+'Files/Fonts/Fonts.css').decode()
font_rules=[]
for block in re.findall(r'@font-face\s*\{[^}]+\}', font_css):
    family = re.search(r'font-family:\s*"([^"]+)"',block)
    woff = re.search(r'url\("([^"]+\.woff)"\)',block)
    if family and woff:
        local = asset(urljoin(BASE+'Files/Fonts/',woff[1]))
        font_rules.append('@font-face{font-family:'+json.dumps(family[1])+';src:url("../'+local+'") format("woff");font-display:swap;}')
(ROOT/'styles/fonts.css').write_text('\n'.join(font_rules))
(ROOT/'content/downloads.json').write_text(json.dumps(pdfs,ensure_ascii=False,indent=2))
(ROOT/'content/asset-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(ROOT/'content/import-failures.json').write_text(json.dumps(failures,ensure_ascii=False,indent=2))
print('DONE',len(pages),'pages',len(manifest),'assets',len(pdfs),'PDFs',len(failures),'failures')
