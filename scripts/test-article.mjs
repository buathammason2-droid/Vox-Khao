import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c=vm.createContext({URL,Set,Map,Response,AbortSignal,Uint8Array,TextDecoder,json:v=>v});vm.runInContext(fs.readFileSync('worker/article.js','utf8'),c);
for(const url of ['http://bbc.com/a','https://localhost/a','https://127.0.0.1/a','https://bbc.com.evil.test/a','https://user:pass@bbc.com/a','https://bbc.com:444/a'])assert.equal(c.allowedArticleUrl(url),null);
assert(c.allowedArticleUrl('https://www.bbc.com/news/a'));
let d=c.extractArticle('<script type="application/ld+json">'+JSON.stringify({'@type':'NewsArticle',articleBody:'First paragraph.\nSecond paragraph.'})+'</script>');assert.equal(d.paragraphs.length,2);assert.equal(d.complete,false);
d=c.extractArticle('<nav><p>'+('Menu '.repeat(20))+'</p></nav><article><p>'+('News content '.repeat(20))+'</p><script>malicious()</script></article>');assert.equal(d.paragraphs.length,1);assert(!d.paragraphs[0].includes('Menu'));
c.fetch=async()=>new Response('',{status:302,headers:{location:'https://127.0.0.1/private'}});let r=await c.sourceArticle(new Request('https://app.test/api/article?url=https://bbc.com/a'));assert.equal(r.state,'unavailable');
c.fetch=async()=>new Response('<article><p>'+('Public article text. '.repeat(20))+'</p></article>',{headers:{'content-type':'text/html'}});r=await c.sourceArticle(new Request('https://app.test/api/article?url=https://bbc.com/b'));assert.equal(r.state,'ready');assert.equal(r.paragraphs.length,1);
const app=fs.readFileSync('public/app.js','utf8');assert(app.indexOf('${fullArticlePanel(raw)}')>app.indexOf('${aiPanel(raw)}'));assert(app.includes('ensureFullArticle(raw)'));console.log('PASS source extraction, restricted fallback, safe publisher/redirect checks and article placement');
