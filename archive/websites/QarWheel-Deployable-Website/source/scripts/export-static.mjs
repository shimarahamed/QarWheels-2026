import {cp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import path from 'node:path';

const routes=['home','product','drivers','garages','how-it-works','about','contact','privacy','terms'];
const output=path.resolve('dist-static');
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp('dist/client/assets',path.join(output,'assets'),{recursive:true});
await cp('public/theme-init.js',path.join(output,'theme-init.js'));
for(const route of routes){
 const folder=route==='home'?output:path.join(output,route);
 await mkdir(folder,{recursive:true});
 await cp(`dist/client/__pages/en/${route}.html`,path.join(folder,'index.html'));
}
// Each real route has its own index.html. Arabic is selected via ?lang=ar in the client.
// For an unknown URL, the application renders its existing not-found experience.
await cp('dist/client/__pages/en/home.html',path.join(output,'404.html'));
const report={routes:routes.length,output,requiresBackend:false};
console.log(JSON.stringify(report));
