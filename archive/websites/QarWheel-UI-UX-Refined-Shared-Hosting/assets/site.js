(()=>{'use strict';
 const doc=document.documentElement;
 const header=document.querySelector('.header');
 const menu=document.querySelector('.menu-button');
 const nav=document.querySelector('.nav-links');
 const modal=document.querySelector('.modal');
 const prefersReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const themeButtons=document.querySelectorAll('[data-theme-toggle]');
 const storedTheme=(()=>{try{return localStorage.getItem('qw-theme')}catch(_){return null}})();
 if(storedTheme==='dark'||storedTheme==='light')doc.dataset.theme=storedTheme;
 function paintTheme(){themeButtons.forEach(b=>{const dark=doc.dataset.theme==='dark';b.textContent=dark?'☀':'☾';b.setAttribute('aria-label',dark?'Switch to light appearance':'Switch to dark appearance');b.title=dark?'Light appearance':'Dark appearance'})}
 paintTheme();
 themeButtons.forEach(b=>b.addEventListener('click',()=>{doc.dataset.theme=doc.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('qw-theme',doc.dataset.theme)}catch(_){}paintTheme()}));
 function closeMenu(){if(menu){menu.setAttribute('aria-expanded','false');nav.classList.remove('open');document.body.classList.remove('menu-open')}}
 if(menu){menu.addEventListener('click',()=>{const expanded=menu.getAttribute('aria-expanded')==='true';menu.setAttribute('aria-expanded',String(!expanded));nav.classList.toggle('open',!expanded);document.body.classList.toggle('menu-open',!expanded)})}
 nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});
 document.addEventListener('click',e=>{if(menu&&!header.contains(e.target))closeMenu()});
 let ticking=false;window.addEventListener('scroll',()=>{if(ticking)return;ticking=true;requestAnimationFrame(()=>{header?.classList.toggle('scrolled',scrollY>40);ticking=false})},{passive:true});
 const mobileCta=document.querySelector('.mobile-fixed');const heroElement=document.querySelector('.hero,.page-hero');const footer=document.querySelector('.footer');function toggleMobileCta(){if(!mobileCta)return;const threshold=heroElement?heroElement.offsetTop+heroElement.offsetHeight-80:650;const foot=footer?footer.getBoundingClientRect().top:Infinity;const open=modal?.open||document.body.classList.contains('menu-open');mobileCta.classList.toggle('shown',window.scrollY>threshold&&foot>window.innerHeight-30&&!open)}window.addEventListener('scroll',toggleMobileCta,{passive:true});window.addEventListener('resize',toggleMobileCta);toggleMobileCta();
 if('IntersectionObserver' in window&&!prefersReduced){const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');obs.unobserve(e.target)}})},{threshold:.09,rootMargin:'0px 0px -25px 0px'});document.querySelectorAll('.reveal').forEach(x=>obs.observe(x))}else document.querySelectorAll('.reveal').forEach(x=>x.classList.add('in'));
 document.querySelectorAll('[data-open-download]').forEach(b=>b.addEventListener('click',()=>{closeMenu();if(modal&&typeof modal.showModal==='function')modal.showModal();else if(modal)modal.setAttribute('open','');toggleMobileCta()}));
 modal?.querySelector('[data-close-dialog]')?.addEventListener('click',()=>modal.close?.());modal?.addEventListener('close',toggleMobileCta);
 modal?.addEventListener('click',e=>{if(e.target===modal)modal.close?.()});
 const steps=[...document.querySelectorAll('.journey-step')],panel=document.getElementById('journey-content');
 if(steps.length&&panel){const data=JSON.parse(panel.getAttribute('data-steps')||'[]');steps.forEach((s,index)=>s.addEventListener('click',()=>{steps.forEach(x=>{x.setAttribute('aria-selected','false');x.tabIndex=-1});s.setAttribute('aria-selected','true');s.tabIndex=0;const x=data[index];if(!x)return;panel.innerHTML='<div class="journey-panel"><div class="journey-no"></div><h3></h3><p></p><span class="journey-mark" aria-hidden="true"></span></div>';panel.querySelector('h3').textContent=x.title;panel.querySelector('p').textContent=x.body;panel.querySelector('.journey-no').textContent=String(index+1).padStart(2,'0')+' / 04 — QARWHEEL';panel.querySelector('.journey-mark').textContent=String(index+1).padStart(2,'0')}));steps.forEach((s,i)=>s.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp','Home','End'].includes(e.key))return;e.preventDefault();let next=e.key==='Home'?0:e.key==='End'?steps.length-1:(i+((e.key==='ArrowUp'||(e.key==='ArrowLeft'&&doc.dir!=='rtl')||(e.key==='ArrowRight'&&doc.dir==='rtl'))?-1:1)+steps.length)%steps.length;steps[next].focus();steps[next].click();steps[next].scrollIntoView({block:'nearest',inline:'nearest',behavior:prefersReduced?'instant':'smooth'})}))}
 const year=document.querySelectorAll('[data-year]');year.forEach(n=>n.textContent=new Date().getFullYear());
})();
