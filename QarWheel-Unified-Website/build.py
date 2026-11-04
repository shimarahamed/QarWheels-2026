"""Build the bilingual QarWheel business website. Python standard library only."""
from pathlib import Path
import re
import shutil
from source.home import home, product_preview, service_categories, business_preview

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'website'
SOURCE = ROOT / 'source'


def build():
    OUT.mkdir(exist_ok=True)
    shutil.copytree(SOURCE / 'assets', OUT / 'assets', dirs_exist_ok=True)
    pages = []
    for template in (SOURCE / 'templates').rglob('*.html'):
        rel = template.relative_to(SOURCE / 'templates')
        ar = rel.parts[0] == 'ar'
        lang = 'ar' if ar else 'en'
        depth = len(rel.parts) - 1
        base = '../' * depth or './'
        local = '../' * (depth - int(ar)) or './'
        slug = rel.parent.name if depth > int(ar) else 'home'
        html = template.read_text(encoding='utf-8')
        html = html.replace('<html lang="en">', '<html lang="en" dir="ltr" data-theme="light">')
        html = re.sub(r'<script src="[^"]*assets/site.js" defer></script>', '', html)
        if slug == 'home' and rel.name == 'index.html':
            html = re.sub(r'<main id="main">.*?</main>', lambda _: home(ar, base, local, html), html, flags=re.S)
        elif slug in ('product', 'drivers'):
            extra = product_preview(ar, base, local) + service_categories(ar, local)
            html = html.replace('<section class="features"', extra + '<section class="features"', 1)
        elif slug == 'garages':
            html = html.replace('<section class="inner-content">', business_preview(ar, local) + '<section class="inner-content">', 1)

        # Keep the approved logo and destination structure. One navigation for both profiles.
        driver_link = f'<a href="{local}drivers/index.html"' + (' aria-current="page"' if slug == 'drivers' else '') + '>' + ('للسائقين' if ar else 'For Drivers') + '</a>'
        html = re.sub(r'(<nav id="nav"[^>]*>)(.*?)(</nav>)', lambda m: m[1] + driver_link + m[2] + m[3], html, count=1, flags=re.S)
        html = re.sub(r'<span class="audience-go".*?</span>', '', html, flags=re.S)
        font_files = ['noto-sans-arabic-arabic.woff2'] if ar else ['manrope-latin.woff2', 'inter-latin.woff2']
        font_preloads = ''.join(f'<link rel="preload" href="{base}assets/fonts/{font}" as="font" type="font/woff2" crossorigin>' for font in font_files)
        html = html.replace('</head>', f'<script src="{base}assets/theme-init.js"></script>{font_preloads}<link rel="stylesheet" href="{base}assets/fonts.css"><link rel="stylesheet" href="{base}assets/unified.css"><link rel="stylesheet" href="{base}assets/premium.css"></head>')
        html = re.sub(r'(<meta name="theme-color" content=")[^"]*(")', r'\g<1>#F4F5F7\2', html)
        html = html.replace('<body>', f'<body class="unified page-{slug}">')
        html = html.replace('</body>', f'<script src="{base}assets/unified.js" defer></script></body>')
        # Existing templates accidentally hide content if JavaScript is unavailable.
        html = html.replace(' class="reveal"', ' class="content-block"')
        html = html.replace(' reveal"', ' content-block"')
        html = html.replace('<main id="main">', '<main id="main" tabindex="-1">')
        if slug == 'product':
            html = html.replace('<section class="product-overview">', '<section class="product-overview" id="service-discovery">')
        target = OUT / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding='utf-8')
        if rel.name == 'index.html':
            pages.append('https://qarwheel.qa/' + str(rel.parent).replace('\\', '/').strip('.') + ('/' if depth else ''))
    (OUT / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + ''.join(f'<url><loc>{url}</loc></url>' for url in sorted(pages)) + '</urlset>', encoding='utf-8')
    (OUT / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: https://qarwheel.qa/sitemap.xml\n', encoding='utf-8')
    print(f'Built {len(pages)} English/Arabic pages and 404.html in {OUT}')


if __name__ == '__main__':
    build()
