"""Validate the static deliverable, including deep links in both languages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
from collections import Counter
import re

ROOT = Path(__file__).resolve().parent / 'website'


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path, self.ids, self.links, self.errors = path, [], [], []
        self.h1 = self.main = 0
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a:
            self.ids.append(a['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'main': self.main += 1
        if tag == 'html':
            expected = 'ar' if 'ar' in self.path.relative_to(ROOT).parts else 'en'
            if a.get('lang') != expected: self.errors.append('Incorrect language')
            if a.get('dir') != ('rtl' if expected == 'ar' else 'ltr'): self.errors.append('Incorrect text direction')
        if tag in ('a', 'link') and a.get('href'): self.links.append(a['href'])
        if tag in ('img', 'script') and a.get('src'): self.links.append(a['src'])
        if tag == 'img' and 'alt' not in a: self.errors.append('Image missing alt attribute')
        if a.get('srcset'):
            self.links.extend(item.strip().split()[0] for item in a['srcset'].split(','))
        if a.get('aria-controls'):
            self.links.extend('#' + target for target in a['aria-controls'].split())
        if a.get('aria-labelledby'):
            self.links.extend('#' + target for target in a['aria-labelledby'].split())


pages = {p.resolve(): Page(p) for p in ROOT.rglob('*.html')}
errors = []
checked = 0
for path, page in pages.items():
    if page.h1 != 1: page.errors.append(f'Expected one h1, got {page.h1}')
    if page.main != 1: page.errors.append(f'Expected one main, got {page.main}')
    page.errors += ['Duplicate ID: ' + key for key, count in Counter(page.ids).items() if count > 1]
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc: continue
        target = (ROOT / url.path.lstrip('/') if url.path.startswith('/') else path.parent / unquote(url.path)).resolve() if url.path else path
        if target.is_dir(): target = target / 'index.html'
        if not target.is_relative_to(ROOT.resolve()):
            page.errors.append('Link leaves package: ' + link)
        elif not target.exists():
            page.errors.append('Missing local destination: ' + link)
        elif url.fragment and target in pages and unquote(url.fragment) not in pages[target].ids:
            page.errors.append('Missing fragment: ' + link)
        checked += 1
    errors += [str(path.relative_to(ROOT)) + ': ' + problem for problem in page.errors]
# Font files and stylesheet resources are part of the portable package too.
for path in ROOT.rglob('*.css'):
    for raw in re.findall(r'url\(([^)]+)\)', path.read_text(encoding='utf-8')):
        url = urlsplit(raw.strip(' \t\r\n\'"'))
        if url.scheme or url.netloc or not url.path: continue
        target = (path.parent / unquote(url.path)).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            errors.append(str(path.relative_to(ROOT)) + ': Missing stylesheet resource: ' + url.path)
        checked += 1
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'PASS: {len(pages)} pages; {checked} local references; EN/AR, RTL, landmarks, IDs and image alternatives.')
