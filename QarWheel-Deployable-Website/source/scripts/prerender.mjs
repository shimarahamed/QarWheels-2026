import {createServer} from 'vite';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import React from 'react';
import {renderToString} from 'react-dom/server';
const vite=await createServer({server:{middlewareMode:true},appType:'custom'});
try{
 const {App}=await vite.ssrLoadModule('/src/App.jsx');
 const {content}=await vite.ssrLoadModule('/src/content.js');
 const template=await readFile('dist/client/index.html','utf8');
 const routes=['home','product','drivers','garages','how-it-works','about','contact','privacy','terms'];
 const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
 for(const lang of ['en','ar']){
  await mkdir(`dist/client/__pages/${lang}`,{recursive:true});
  for(const path of routes){
   const t=content[lang];const i=routes.indexOf(path)-1;
   const title='QarWheel — '+(path==='home'?t.brand:i>=0&&i<5?t.nav[i]:path==='privacy'?t.privacy:path==='terms'?t.terms:t.contact);
   const rendered=renderToString(React.createElement(App,{initialLang:lang,initialPath:path}));
   let html=template.replace('<html lang="en">',`<html lang="${lang}" dir="${lang==='ar'?'rtl':'ltr'}">`).replace(/<title>.*?<\/title>/,`<title>${esc(title)}</title>`).replace(/(<meta name="description" content=")[^"]*/,`$1${esc(t.intro)}`).replace('<div id="root"></div>',`<div id="root" data-page="${path}">${rendered}</div>`);
   await writeFile(`dist/client/__pages/${lang}/${path}.html`,html);
   if(lang==='en'&&path==='home')await writeFile('dist/client/index.html',html);
  }
 }
 console.log('Prerendered all 18 English and Arabic pages.');
}finally{await vite.close()}
