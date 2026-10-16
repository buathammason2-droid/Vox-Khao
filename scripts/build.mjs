import fs from 'node:fs';
const assets={};
for(const [file,type] of [['index.html','text/html; charset=utf-8'],['app.js','text/javascript; charset=utf-8'],['ai-ui.js','text/javascript; charset=utf-8'],['full-article.js','text/javascript; charset=utf-8'],['evidence.js','text/javascript; charset=utf-8'],['audio-ui.js','text/javascript; charset=utf-8'],['vocabulary.js','text/javascript; charset=utf-8'],['random-audio.js','text/javascript; charset=utf-8'],['style.css','text/css; charset=utf-8']])assets['/'+(file==='index.html'?'':file)]={type,body:fs.readFileSync('public/'+file,'utf8')};
assets['/space-hero.webp']={type:'image/webp',base64:true,body:fs.readFileSync('public/space-hero.webp').toString('base64')};
fs.mkdirSync('dist/server',{recursive:true});fs.mkdirSync('dist/.openai',{recursive:true});
fs.writeFileSync('dist/server/index.js','const ASSETS='+JSON.stringify(assets)+';\n'+fs.readFileSync('public/evidence.js','utf8')+'\n'+fs.readFileSync('worker/ai.js','utf8')+'\n'+fs.readFileSync('worker/audio.js','utf8')+'\n'+fs.readFileSync('worker/article.js','utf8')+'\n'+fs.readFileSync('worker/api.js','utf8'));
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
for(const file of ['index.html','app.js','style.css'])if(fs.existsSync('dist/'+file))fs.unlinkSync('dist/'+file);
console.log('Built news Worker and embedded browser assets');
