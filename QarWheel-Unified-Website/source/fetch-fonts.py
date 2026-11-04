"""Fetch the selected open-source Google Fonts once for local hosting."""
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlsplit
import re

DEST = Path(__file__).resolve().parent / 'assets/fonts'
CSS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400..700&family=Manrope:wght@400..700&family=Noto+Sans+Arabic:wght@400..700&display=swap'


def fetch(url):
    if urlsplit(url).hostname not in ('fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com'):
        raise ValueError('Unexpected font source')
    return urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'}), timeout=30).read()


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    css = fetch(CSS_URL).decode('utf-8')
    rules = []
    for subset, block in re.findall(r'/\*\s*([^*]+?)\s*\*/\s*(@font-face\s*\{[^}]+\})', css):
        # English + Arabic presentation; keep Arabic's full glyph coverage.
        if subset not in ('latin', 'arabic'): continue
        family = re.search(r"font-family:\s*'([^']+)'", block)[1]
        url = re.search(r'url\((https://fonts.gstatic.com/[^)]+)\)', block)[1]
        name = family.lower().replace(' ', '-') + '-' + subset + '.woff2'
        data = fetch(url)
        if data[:4] != b'wOF2': raise ValueError('Expected a WOFF2 font')
        (DEST / name).write_bytes(data)
        rules.append('/* ' + family + ' — ' + subset + ' */\n' + block.replace(url, './fonts/' + name))
        print(name, len(data), 'bytes')
    if len(rules) < 4: raise ValueError('Expected English and Arabic font subsets')
    (DEST.parent / 'fonts.css').write_text('\n\n'.join(rules) + '\n', encoding='utf-8')
    for family in ('inter', 'manrope', 'notosansarabic'):
        (DEST / (family + '-OFL.txt')).write_bytes(fetch('https://raw.githubusercontent.com/google/fonts/main/ofl/' + family + '/OFL.txt'))


if __name__ == '__main__': main()
