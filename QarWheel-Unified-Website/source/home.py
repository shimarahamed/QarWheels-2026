"""Shared marketing sections. Product demonstrations contain illustrative data only."""
import re


def icon(name):
    paths = {
        'car': '<path d="m4 10 2-5h12l2 5M3 10h18v8H3zM6 18v2m12-2v2M6 14h2m8 0h2"/>',
        'spark': '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4m-2-2h4"/>',
        'pin': '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
        'record': '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/>',
        'clock': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'tool': '<path d="M14 4a6 6 0 0 0-7 7L3 17l4 4 6-6a6 6 0 0 0 7-7l-4 3-3-3z"/>',
        'ac': '<path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h6a3 3 0 1 1-3 3"/>',
        'oil': '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/>',
        'wheel': '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m6 6 4 4m4 4 4 4M6 18l4-4m4-4 4-4"/>',
        'battery': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M7 7V4h3v3m4 0V4h3v3M6 13h4m-2-2v4m6-2h4"/>',
        'check': '<path d="m5 12 4 4L19 6"/>',
    }
    return f'<svg class="u-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{paths[name]}</svg>'


def section_from(html, cls):
    result = re.search(r'<section class="' + cls + r'"[^>]*>.*?</section>', html, re.S)
    return result[0] if result else ''


def phone(ar, base, compact=False):
    t = (lambda en, arabic: arabic if ar else en)
    return f'''<div class="u-phone" aria-label="{t('Illustrative QarWheel mobile experience', 'تصور توضيحي لتجربة قارويل على الهاتف')}">
      <div class="u-phone-status"><b>9:41</b><span>● ▰</span></div>
      <div class="u-phone-brand"><img src="{base}assets/favicon.png" width="25" height="27" alt=""><strong>QarWheel</strong><span class="u-avatar">Q</span></div>
      <p class="u-phone-welcome">{t('EVERY JOURNEY STARTS HERE', 'كل رحلة تبدأ هنا')}</p><h3>{t('Your car. Your world.', 'سيارتك. عالمك.')}</h3>
      <div class="u-vehicle"><div><span>{t('MY GARAGE', 'سياراتي')}</span><b>{t('Your everyday companion', 'رفيقتك في كل رحلة')}</b></div>{icon('car')}<small>{t('Vehicle details · Service history', 'تفاصيل السيارة · سجل الصيانة')}</small></div>
      <div class="u-phone-actions"><span>{icon('pin')}{t('Find a garage', 'ابحث عن كراج')}</span><span>{icon('record')}{t('My records', 'سجلاتي')}</span><span>{icon('clock')}{t('Bookings', 'الحجوزات')}</span></div>
      <div class="u-ai"><span>{icon('spark')}</span><div><b>{t('A question about your car?', 'سؤال عن سيارتك؟')}</b><small>{t('Start with AI-assisted guidance', 'ابدأ بإرشادات الذكاء الاصطناعي')}</small></div></div>
      <div class="u-phone-heading"><b>{t('Care that keeps you moving', 'عناية تواكب رحلتك')}</b></div>
      <div class="u-phone-services"><span>{icon('ac')}{t('AC & cooling', 'التكييف')}</span><span>{icon('oil')}{t('Maintenance', 'الصيانة')}</span><span>{icon('wheel')}{t('Tires', 'الإطارات')}</span></div>
      <div class="u-phone-nav"><b>{icon('car')}{t('Home', 'الرئيسية')}</b><span>{icon('pin')}{t('Explore', 'استكشف')}</span><span>{icon('record')}{t('My garage', 'سياراتي')}</span></div>
    </div>'''


def service_categories(ar, local):
    t = lambda en, arabic: arabic if ar else en
    categories = [('ac', 'AC & cooling', 'التكييف والتبريد'), ('oil', 'Oil & maintenance', 'الزيوت والصيانة'), ('wheel', 'Tires & wheels', 'الإطارات والعجلات'), ('battery', 'Battery & electrical', 'البطارية والكهرباء'), ('tool', 'Brakes & repairs', 'المكابح والإصلاحات'), ('spark', 'Body & detailing', 'الهيكل والتلميع')]
    return f'''<section class="u-services shell" aria-labelledby="services-title"><div><p class="eyebrow accent">{t('CARE FOR THE EVERYDAY', 'عناية بكل يوم')}</p><h2 id="services-title">{t('Whatever the road brings.', 'مهما حمل لك الطريق.')}</h2><p>{t('Explore the services that keep your car at its best.', 'استكشف الخدمات التي تحافظ على سيارتك في أفضل حال.')}</p></div><div class="u-category-list">{''.join(f'<a href="{local}product/index.html#service-discovery">{icon(i)}<span>{t(en, arabic)}</span></a>' for i,en,arabic in categories)}</div></section>'''


def product_preview(ar, base, local):
    t = lambda en, arabic: arabic if ar else en
    items = [
        ('spark', 'Understand', 'افهم', 'A clearer starting point.', 'بداية أكثر وضوحًا.', 'Describe what you notice. AI-assisted guidance helps you explore possible causes and prepare better questions for a qualified technician.', 'صف ما تلاحظه. تساعدك إرشادات الذكاء الاصطناعي على فهم الأسباب المحتملة وإعداد أسئلة أفضل لفني مؤهل.'),
        ('pin', 'Discover', 'اكتشف', 'Find your kind of garage.', 'اعثر على الكراج المناسب.', 'Explore garages by the services your vehicle needs. Compare relevant information, then confirm the work and availability with the provider.', 'استكشف الكراجات حسب احتياجات سيارتك. قارن المعلومات المتاحة وأكّد نطاق العمل والتوفر مع مقدم الخدمة.'),
        ('clock', 'Follow', 'تابع', 'Know where things stand.', 'اعرف أين وصلت الأمور.', 'Follow the updates recorded by your service provider. Keep the conversation, the work and the next step in view.', 'تابع التحديثات التي يسجلها مقدم الخدمة، وابقَ على اطلاع بالمحادثات والعمل والخطوة التالية.'),
        ('record', 'Keep', 'احتفظ', 'Every car has a story.', 'لكل سيارة قصة.', 'Bring vehicle details and recorded maintenance together in a vehicle passport, with a history you can return to.', 'اجمع تفاصيل السيارة والصيانة المسجلة في جواز للسيارة وسجل يمكنك الرجوع إليه.')]
    tabs = ''.join(f'<button type="button" id="experience-tab-{i}" role="tab" aria-selected="{str(i==0).lower()}" aria-controls="experience-panel-{i}" tabindex="{0 if i==0 else -1}">{icon(x[0])}{t(x[1],x[2])}</button>' for i,x in enumerate(items))
    panels = []
    for i,x in enumerate(items):
        if i == 0:
            demo = f'<div class="u-chat-question">{t("My car’s AC isn’t cooling as usual.", "مكيف سيارتي لا يبرد كالمعتاد.")}</div><div class="u-chat-answer">{icon("spark")}<b>{t("Let’s give that some context.", "لنفهم المشكلة بشكل أفضل.")}</b><p>{t("When did you first notice the change? Does it happen while driving, while stopped, or both?", "متى لاحظت التغيير؟ هل يحدث أثناء القيادة أم التوقف أم في الحالتين؟")}</p></div><p class="u-demo-note">{t("Illustrative conversation · Guidance, not a diagnosis", "محادثة توضيحية · إرشادات وليست تشخيصًا")}</p>'
        elif i == 1:
            demo = f'<div class="u-search">{icon("pin")}{t("Automotive services in Qatar", "خدمات السيارات في قطر")}</div><div class="u-garage-demo"><img src="{base}assets/workshop-720.webp" alt="" loading="lazy"><div><span class="u-label">{t("ILLUSTRATIVE PROVIDER", "مقدم خدمة توضيحي")}</span><b>{t("Your next service starts here", "خدمتك القادمة تبدأ هنا")}</b><p>{t("AC & cooling · Maintenance · Repairs", "التكييف · الصيانة · الإصلاحات")}</p></div></div><p class="u-demo-note">{t("Explore service details before choosing a provider.", "اطّلع على تفاصيل الخدمة قبل اختيار مقدمها.")}</p>'
        elif i == 2:
            demo = '<div class="u-tracking">' + ''.join(f'<div class="{("done" if j<2 else "active" if j==2 else "")}"><span>{icon("check") if j<2 else str(j+1).zfill(2)}</span><b>{s}</b></div>' for j,s in enumerate(t(['Vehicle received', 'Inspection', 'Work in progress', 'Ready for collection'], ['استلام السيارة', 'الفحص', 'العمل جارٍ', 'جاهزة للاستلام']))) + '</div><p class="u-demo-note">' + t('Illustrative status · Updated by your service provider', 'حالة توضيحية · يحدثها مقدم الخدمة') + '</p>'
        else:
            demo = f'<div class="u-passport">{icon("car")}<span>{t("VEHICLE PASSPORT", "جواز السيارة")}</span><h4>{t("One car. One record.", "سيارة واحدة. سجل واحد.")}</h4><div>{icon("record")}<b>{t("Service & maintenance", "الخدمة والصيانة")}</b></div><div>{icon("tool")}<b>{t("Repairs & recorded work", "الإصلاحات والأعمال المسجلة")}</b></div><div>{icon("clock")}<b>{t("Your vehicle’s timeline", "التسلسل الزمني لسيارتك")}</b></div></div>'
        panels.append(f'<div id="experience-panel-{i}" class="u-experience-panel" role="tabpanel" aria-labelledby="experience-tab-{i}" tabindex="0" {"hidden" if i else ""}><div class="u-experience-copy"><span class="u-label">0{i+1} / QARWHEEL</span><h3>{t(x[3],x[4])}</h3><p>{t(x[5],x[6])}</p><a class="btn btn-dark" href="{local}how-it-works/index.html">{t("See how it works", "اكتشف كيف تعمل")}</a></div><div class="u-demo">{demo}</div></div>')
    return f'''<section class="u-experience" id="experience"><div class="shell"><div class="u-section-head"><div><p class="eyebrow accent">{t('THE QARWHEEL EXPERIENCE', 'تجربة قارويل')}</p><h2>{t('From “what’s wrong?”<br>to what comes next.', 'من «ما المشكلة؟»<br>إلى الخطوة التالية.')}</h2></div><p>{t('Four connected parts of car care.<br>One place to bring them together.', 'أربعة جوانب مترابطة للعناية بالسيارة.<br>مكان واحد يجمعها.')}</p></div><div class="u-experience-card"><div class="u-tabs" role="tablist" aria-label="{t('Explore the product', 'استكشف المنتج')}">{tabs}</div>{''.join(panels)}</div></div></section>'''


def business_preview(ar, local):
    t = lambda en, arabic: arabic if ar else en
    return f'''<section class="u-business shell"><div class="u-business-copy"><p class="eyebrow accent">{t('QARWHEEL FOR BUSINESS', 'قارويل للأعمال')}</p><h2>{t('Great service.<br>Better connected.', 'خدمة متميزة.<br>تواصل أفضل.')}</h2><p>{t('Behind every confident driver is a team that cares. Bring your garage’s services, customer conversations and work in progress into a clearer view.', 'وراء كل سائق مطمئن فريق يهتم. اجمع خدمات كراجك ومحادثات العملاء والأعمال الجارية في صورة أوضح.')}</p><ul><li>{t('Help drivers discover your services', 'ساعد السائقين على اكتشاف خدماتك')}</li><li>{t('Keep bookings and workshop jobs organized', 'نظّم الحجوزات وأعمال الورشة')}</li><li>{t('Keep customers informed along the way', 'أبقِ العملاء على اطلاع طوال الرحلة')}</li></ul><a class="btn btn-dark" href="{local}garages/index.html">{t('Explore the partner experience', 'استكشف تجربة الشراكة')}</a></div><div class="u-workspace"><div class="u-workspace-top"><strong>QarWheel <span>Business</span></strong><span class="u-avatar">Q</span></div><div class="u-workspace-body"><div class="u-workspace-side">{icon('car')}{icon('clock')}{icon('tool')}{icon('record')}</div><div class="u-workspace-content"><p class="u-label">{t('WORKSHOP OVERVIEW', 'نظرة عامة على الورشة')}</p><h3>{t('A clearer day ahead.', 'يوم أكثر تنظيمًا.')}</h3><div class="u-workspace-tags"><span>{t('Bookings', 'الحجوزات')}</span><span>{t('Jobs', 'الأعمال')}</span><span>{t('Customers', 'العملاء')}</span></div><div class="u-job"><span>{icon('oil')}</span><div><b>{t('Routine maintenance', 'الصيانة الدورية')}</b><small>{t('Service details and customer notes', 'تفاصيل الخدمة وملاحظات العميل')}</small></div><em>{t('Confirmed', 'مؤكد')}</em></div><div class="u-job"><span>{icon('ac')}</span><div><b>{t('AC inspection', 'فحص التكييف')}</b><small>{t('Technician updates in one place', 'تحديثات الفني في مكان واحد')}</small></div><em class="progress">{t('In progress', 'جارٍ')}</em></div><div class="u-job"><span>{icon('wheel')}</span><div><b>{t('Tire service', 'خدمة الإطارات')}</b><small>{t('Keep the next step visible', 'وضّح الخطوة التالية')}</small></div><em>{t('Ready', 'جاهز')}</em></div></div></div><p class="u-demo-note">{t('Illustrative business workspace · No live customer data', 'تصور توضيحي لمساحة العمل · لا يتضمن بيانات عملاء حقيقية')}</p></div></section>'''


def home(ar, base, local, original):
    t = lambda en, arabic: arabic if ar else en
    hero = f'''<section class="u-hero shell" aria-labelledby="home-title"><div class="u-hero-copy"><p class="eyebrow"><span class="pip"></span>{t('BUILT AROUND YOU. MADE FOR QATAR.', 'حولك تبدأ التجربة. ولأجلك في قطر.')}</p><h1 id="home-title">{t('Car care.<br><em>Connected.</em>', 'عناية بسيارتك.<br><em>أكثر ترابطًا.</em>')}</h1><p class="u-intro">{t('Your car, your garage, your next move.<br>Bring it all together with QarWheel.', 'سيارتك، كراجك، خطوتك القادمة.<br>تجتمع كلها مع قارويل.')}</p><div class="u-hero-ctas"><a class="btn btn-red" href="{local}drivers/index.html">{t('Explore for drivers', 'استكشف تجربة السائقين')}</a><a class="btn u-outline" href="{local}garages/index.html">{t('For garages', 'للكراجات')}</a></div><p class="u-launch-note"><span></span>{t('One connected vision for drivers & garages', 'رؤية مترابطة للسائقين والكراجات')}</p><div class="u-hero-bottom"><span>{t('DISCOVER. UNDERSTAND. CARE.', 'اكتشف. افهم. اعتنِ.')}</span><b>01 — 04</b></div></div><div class="u-hero-visual"><img class="u-hero-photo" src="{base}assets/interior-1600.webp" srcset="{base}assets/interior-720.webp 720w, {base}assets/interior-1600.webp 1600w" sizes="(max-width: 760px) 100vw, 50vw" width="1600" height="1067" alt="{t('A view inside a car, from the driver’s seat', 'إطلالة داخل السيارة من مقعد السائق')}" fetchpriority="high"><div class="u-visual-top"><span>QARWHEEL / {t('ON THE MOVE', 'دائمًا معك')}</span><span>{t('DOHA, QA', 'الدوحة، قطر')}</span></div><div class="u-hero-device">{phone(ar,base)}</div><div class="u-glass-note">{icon('record')}<span><b>{t('Your car’s story.', 'قصة سيارتك.')}</b><small>{t('All in one place.', 'كلها في مكان واحد.')}</small></span></div><span class="u-visual-caption">{t('Illustrative product experience', 'تصور توضيحي لتجربة المنتج')}</span></div></section>'''
    intro = f'''<section class="u-intro-section shell"><p class="eyebrow accent">{t('LESS GUESSWORK. MORE CLARITY.', 'حيرة أقل. وضوح أكثر.')}</p><div><h2>{t('A better relationship<br>with your car.', 'علاقة أفضل<br>مع سيارتك.')}</h2><p>{t('A warning light. A routine service. A repair you want to understand. QarWheel connects the moments that matter, so caring for your car feels more straightforward.', 'ضوء تحذير، صيانة دورية، أو إصلاح ترغب في فهمه. تربط قارويل اللحظات المهمة لتصبح العناية بسيارتك أكثر وضوحًا وسهولة.')}</p></div></section>'''
    pillars = f'''<div class="u-pillar-strip shell">{''.join(f'<a href="#experience"><span>0{i+1}</span>{icon(k)}<b>{t(en,arb)}</b></a>' for i,(k,en,arb) in enumerate([('spark','AI-assisted guidance','إرشادات ذكية'),('pin','Garage discovery','اكتشاف الكراجات'),('clock','Service progress','متابعة الخدمة'),('record','Vehicle passport','جواز السيارة')]))}</div>'''
    banner = section_from(original, 'banner-image')
    faq = section_from(original, 'faq')
    final = section_from(original, 'final-cta')
    return '<main id="main">' + hero + pillars + intro + product_preview(ar,base,local) + service_categories(ar,local) + business_preview(ar,local) + banner + faq + final + '</main>'
