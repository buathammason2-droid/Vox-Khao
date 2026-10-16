const topics={'ทั้งหมด':'Thailand','โลก':'world','เศรษฐกิจ':'economy','เทคโนโลยี':'technology','สิ่งแวดล้อม':'climate','กีฬา':'sports'};
const memory=new Map();
const providerMemory=new Map();let gdeltBlockedUntil=0;
const CACHE_ORIGIN='https://khao-red-daily.stonylion.chatgpt.site';
let lastDocAt=0;
async function fetchDoc(url,options){if(gdeltBlockedUntil>Date.now())return new Response('',{status:429});const scheduled=Math.max(Date.now(),lastDocAt+6000);lastDocAt=scheduled;const wait=scheduled-Date.now();if(wait>0)await new Promise(r=>setTimeout(r,Math.min(wait,12000)));if(gdeltBlockedUntil>Date.now())return new Response('',{status:429});return fetch(url,options)}
async function edgeRead(path){try{return await (await caches.default.match(new Request(CACHE_ORIGIN+path)))?.json()}catch{return null}}
async function edgeWrite(path,value,seconds){try{await caches.default.put(new Request(CACHE_ORIGIN+path),new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age='+seconds}}))}catch{}}
async function gdeltSnapshot(){
 return readGdeltSnapshot();
}
async function readGdeltSnapshot(){
 const cached=await edgeRead('/__cache/v3/gdelt-snapshot');if(cached)return cached;
 const base=Math.floor((Date.now()-300000)/900000)*900000;
 for(const t of [base+60000,base,base-900000+60000]){
 const stamp=new Date(t).toISOString().replace(/[-:T]/g,'').slice(0,12)+'00';
 const r=await fetch('https://data.gdeltproject.org/gdeltv5/weblegacy/ngrams/'+stamp+'.toc.json.gz',{headers:{'User-Agent':'KHAO-Daily/1.0'},signal:AbortSignal.timeout(12000)});
 if(r.status===404)continue;if(!r.ok)throw Error('GDELT dataset unavailable');
 const bytes=new Uint8Array(await r.arrayBuffer());if(bytes.length>5000000)throw Error('Dataset too large');
 let decoded;if(bytes[0]===31&&bytes[1]===139){decoded=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()}else decoded=new TextDecoder().decode(bytes);
 if(decoded.length>15000000)throw Error('Dataset too large');
 const rows=decoded.trim().split('\n').map(line=>{try{return JSON.parse(line)}catch{return null}}).filter(a=>a&&a.title&&safeUrl(a.url)&&['en','th'].includes(a.lang)).map(a=>({title:text(a.title,500),url:safeUrl(a.url),socialimage:safeUrl(a.img),seendate:date(a.date),language:a.lang,domain:new URL(a.url).hostname}));
 if(!rows.length)throw Error('Empty GDELT dataset');const value={rows,observedAt:new Date(t).toISOString()};await edgeWrite('/__cache/v3/gdelt-snapshot',value,900);return value;
 }throw Error('No recent GDELT dataset');
}
async function gdeltFallback(q,cat){
 try{const snapshot=await gdeltSnapshot();const terms=q?q.toLowerCase().split(/\s+/):cat==='ทั้งหมด'?[]:[topics[cat]];const rows=snapshot.rows.filter(a=>terms.every(t=>a.title.toLowerCase().includes(t)));
 const articles=(await Promise.all(rows.slice(0,10).map(a=>normalize(a,'GDELT',cat)))).filter(Boolean);
 return {provider:'GDELT',state:'ok',mode:'dataset',observedAt:snapshot.observedAt,message:`GDELT: ดึงข่าวจากชุดข้อมูลทางการแทน DOC API (${articles.length} เรื่อง)${q||cat!=='ทั้งหมด'?' · ค้นจากพาดหัว':''}`,articles};
 }catch{return {provider:'GDELT',state:'rate_limited',message:'GDELT DOC API จำกัดคำขอ และชุดข้อมูลสำรองยังไม่พร้อม กรุณาลองภายหลัง',articles:[]}}
}
async function providerFeed(provider,q,cat,key){
 const id=JSON.stringify([provider,q,cat,provider==='NewsAPI'&&Boolean(key)]),old=providerMemory.get(id);if(old&&old.expires>Date.now())return old.value;
 let value=await upstream(provider,q,cat,key);if(!value.articles.length&&value.state!=='ok'&&old?.value.articles.length)value={...value,articles:old.value.articles,stale:true,message:value.message+' · แสดงข้อมูลก่อนหน้า'};if(providerMemory.size>80)providerMemory.delete(providerMemory.keys().next().value);providerMemory.set(id,{value,expires:Date.now()+(value.state==='ok'?600000:120000)});return value;
}
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function safeUrl(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function text(v,max=1500){return typeof v==='string'?v.replace(/<[^>]*>/g,'').slice(0,max):''}
function date(v){const s=String(v||'').replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,'$1-$2-$3T$4:$5:$6Z');return Number.isFinite(Date.parse(s))?new Date(s).toISOString():null}
async function idFor(url){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(url));return Array.from(new Uint8Array(hash)).slice(0,12).map(n=>n.toString(16).padStart(2,'0')).join('')}
async function normalize(a,provider,cat){const url=safeUrl(a.url);if(!url||!a.title||a.title==='[Removed]')return null;return {id:await idFor(url),url,title:text(a.title,500),desc:text(a.description),content:provider==='NewsAPI'?text(a.content):'',image:safeUrl(a.urlToImage||a.socialimage),source:provider,publisher:text(a.source?.name||a.domain||new URL(url).hostname,150),publishedAt:date(a.publishedAt||a.seendate),language:text(a.language,40),cat,mood:cat==='กีฬา'?'มีพลัง · กระฉับกระเฉง':cat==='สิ่งแวดล้อม'?'สงบ · ธรรมชาติ':'สุขุม · ชัดเจน'}}
async function upstream(provider,q,cat,key){
 if(provider==='GDELT'&&(gdeltBlockedUntil>Date.now()||await edgeRead('/__cache/v3/gdelt-cooldown')))return gdeltFallback(q,cat);
 if(provider==='NewsAPI'&&!key)return {provider,state:'unconfigured',message:'NewsAPI รอตั้งค่า API key ฝั่งเซิร์ฟเวอร์',articles:[]};
 const term=q||topics[cat];const url=new URL(provider==='NewsAPI'?'https://newsapi.org/v2/everything':'https://api.gdeltproject.org/api/v2/doc/doc');
 if(provider==='NewsAPI'){url.search=new URLSearchParams({q:term,language:'en',sortBy:'publishedAt',pageSize:'10'}).toString()}else{const clean=q.replace(/["()<>:]/g,' ').trim();url.search=new URLSearchParams({query:(clean?`"${clean}"`:term)+' sourcelang:english',mode:'artlist',format:'json',maxrecords:'10',timespan:'3d',sort:'datedesc'}).toString()}
 try{
 const r=await (provider==='GDELT'?fetchDoc:fetch)(url,{headers:provider==='NewsAPI'?{'X-Api-Key':key,'User-Agent':'KHAO-Daily/1.0','Accept':'application/json'}:{'Accept':'application/json','User-Agent':'KHAO-Daily/1.0'},signal:AbortSignal.timeout(24000)});
 if(provider==='GDELT'&&!r.ok){gdeltBlockedUntil=Date.now()+3600000;await edgeWrite('/__cache/v3/gdelt-cooldown',{until:gdeltBlockedUntil},3600);return gdeltFallback(q,cat)}
 if(!r.ok){let code='';if(provider==='NewsAPI'){try{const detail=await r.json();if(/^[a-zA-Z0-9_]{1,60}$/.test(detail.code||''))code=detail.code}catch{}}return {provider,state:r.status===429?'rate_limited':'error',code:code||undefined,message:r.status===429?`${provider} จำกัดจำนวนคำขอ กรุณาลองใหม่ภายหลัง`:r.status===401?`${provider}: คีย์ไม่ถูกต้องหรือหมดอายุ`:r.status===426?`${provider}: แผนบริการนี้ยังไม่รองรับเว็บไซต์ที่เผยแพร่`:`${provider} ตอบกลับผิดพลาด (${r.status}${code?' / '+code:''})`,articles:[]}}
 const data=await r.json();if(data.status==='error')return {provider,state:'error',message:data.code==='apiKeyInvalid'?'NewsAPI: API key ไม่ถูกต้อง':'NewsAPI ไม่สามารถให้บริการคำขอนี้ได้ โปรดตรวจแผนและโควตา',articles:[]};
 if(data.articles!==undefined&&!Array.isArray(data.articles))throw Error('Invalid upstream format');
 const articles=(await Promise.all((data.articles||[]).slice(0,30).map(a=>normalize(a,provider,cat)))).filter(Boolean);
 if(provider==='GDELT'&&!articles.length)return gdeltFallback(q,cat);
 return {provider,state:'ok',message:articles.length?`เชื่อมต่อ ${provider} แล้ว`:`${provider}: ไม่พบข่าวในช่วง 3 วันที่ค้นหา`,articles};
 }catch(e){if(provider==='GDELT')return gdeltFallback(q,cat);return {provider,state:'error',message:e.name==='TimeoutError'?`${provider} ใช้เวลาตอบกลับนาน กรุณาลองอีกครั้ง`:`${provider} ยังไม่พร้อมให้บริการ กรุณาลองอีกครั้ง`,articles:[]}}
}
async function loadFeed(params,env){
 const q=(params.get('q')||'').trim();const cat=params.get('category')||'ทั้งหมด';const source=params.get('source')||'all';
 if(q.length>120||!Object.hasOwn(topics,cat)||!['all','GDELT','NewsAPI'].includes(source))return json({error:'พารามิเตอร์ค้นหาไม่ถูกต้อง'},400);
 const key=String(env.NEWSAPI_KEY||env.NEWS_API_KEY||'').trim();const cacheId=JSON.stringify([q,cat,source,Boolean(key)]);const old=memory.get(cacheId);
 if(old&&old.expires>Date.now())return json({...old.value,cached:true});
 {
 const providers=source==='all'?['GDELT','NewsAPI']:[source];
 const batches=await Promise.all(providers.map(p=>providerFeed(p,q,cat,key)));const seen=new Set();let articles=batches.flatMap(b=>b.articles).filter(a=>{if(seen.has(a.id))return false;seen.add(a.id);return true}).sort((a,b)=>Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
 const statuses=batches.map(({articles,...s})=>s);let stale=false;
 if(!articles.length&&old?.value.articles.length){articles=old.value.articles;stale=true}
 const value={articles,statuses,stale,cached:false,fetchedAt:stale?old.value.fetchedAt:new Date().toISOString()};
 if(memory.size>100)memory.delete(memory.keys().next().value);memory.set(cacheId,{value,expires:Date.now()+(statuses.every(s=>s.state==='ok')?600000:60000)});
 return json(value);
 }
}
const translations=new Map();let translationQuotaUntil=0;
function splitTranslation(v){const chunks=[];let chunk='';for(const word of v.split(/(?<=\s)/u)){if(new TextEncoder().encode(chunk+word).length>480){if(chunk)chunks.push(chunk);chunk='';for(const char of word){if(new TextEncoder().encode(chunk+char).length>480){chunks.push(chunk);chunk=''}chunk+=char}}else chunk+=word}if(chunk)chunks.push(chunk);return chunks}
async function translateSegment(value){
 if(!value||/[\u0E00-\u0E7F]/u.test(value))return value;
 const id=await idFor('en|th|'+value),path='/__cache/v3/translation/'+id;
 if(translations.has(id))return translations.get(id);const cached=await edgeRead(path);if(cached?.text){translations.set(id,cached.text);return cached.text}
 {
 if(translationQuotaUntil>Date.now())throw Error('quota');const u='https://api.mymemory.translated.net/get?'+new URLSearchParams({q:value,langpair:'en|th'});
 const r=await fetch(u,{headers:{'User-Agent':'KHAO-Daily/1.0'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('unavailable');const d=await r.json();
 if(d.quotaFinished||Number(d.responseStatus)===429){translationQuotaUntil=Date.now()+3600000;throw Error('quota')}
 const result=d.responseData?.translatedText;if(Number(d.responseStatus)!==200||!result||!/[\u0E00-\u0E7F]/u.test(result))throw Error('unavailable');
 const clean=text(result,3000);if(translations.size>500)translations.delete(translations.keys().next().value);translations.set(id,clean);await edgeWrite(path,{text:clean},604800);return clean;
 }
}
async function translateText(value){let result='';for(const chunk of splitTranslation(value))result+=await translateSegment(chunk);return result}
async function translateRequest(request){
 if(Number(request.headers.get('content-length')||0)>16000)return json({error:'ข้อความยาวเกินไป'},413);
 let input;try{const body=await request.text();if(new TextEncoder().encode(body).length>16000)return json({error:'ข้อความยาวเกินไป'},413);input=JSON.parse(body)}catch{return json({error:'ข้อมูลไม่ถูกต้อง'},400)}
 if(!Array.isArray(input.articles)||input.articles.length>4||!input.articles.length)return json({error:'ส่งได้ครั้งละ 1–4 ข่าว'},400);
 for(const a of input.articles)if(!a||typeof a.id!=='string'||!/^[a-f0-9]{24}$/.test(a.id)||typeof a.title!=='string'||a.title.length>600||typeof a.desc!=='string'||a.desc.length>1800||typeof (a.content||'')!=='string'||(a.content||'').length>1800)return json({error:'รูปแบบข่าวไม่ถูกต้อง'},400);
 const articles=[];for(let i=0;i<input.articles.length;i+=2){articles.push(...await Promise.all(input.articles.slice(i,i+2).map(async a=>{try{const title=await translateText(a.title),desc=await translateText(a.desc),content=await translateText(a.content||'');return {id:a.id,title,desc,content,state:'translated'}}catch(e){return {id:a.id,state:e.message==='quota'?'quota':'unavailable',message:e.message==='quota'?'MyMemory ถึงโควตาแปลชั่วคราว แสดงต้นฉบับไว้ก่อน':'แปลไทยบางรายการไม่ได้ แสดงต้นฉบับสำหรับรายการนั้น'}}})))}
 return json({articles,provider:'MyMemory'});
}
export default {async fetch(request,env={}){
 const u=new URL(request.url);if(u.pathname==='/api/article'&&request.method==='GET')return sourceArticle(request);if(u.pathname==='/api/audio/config'&&request.method==='GET')return json({configured:Boolean(env.ELEVENLABS_API_KEY)});if(u.pathname==='/api/audio'&&request.method==='POST')return generateAudio(request,env);if(u.pathname==='/api/analyze'&&request.method==='POST')return analyzeNews(request,env);if(u.pathname==='/api/translate'&&request.method==='POST')return translateRequest(request);if(!['GET','HEAD'].includes(request.method))return json({error:'Method not allowed'},405);
 if(u.pathname==='/api/news'){
 if(request.method==='HEAD')return new Response(null,{status:200});
 const cacheKey=new Request(u.origin+'/__news_cache/v3?'+new URLSearchParams({q:(u.searchParams.get('q')||'').trim(),category:u.searchParams.get('category')||'ทั้งหมด',source:u.searchParams.get('source')||'all',configured:String(Boolean(env.NEWSAPI_KEY||env.NEWS_API_KEY))}));
 const cache=typeof caches!=='undefined'?caches.default:null;
 if(cache){try{const hit=await cache.match(cacheKey);if(hit){const d=await hit.json();return json({...d,cached:true})}}catch{}}
 const response=await loadFeed(u.searchParams,env);
 if(cache&&response.ok){const d=await response.clone().json();if(d.articles.length&&!d.stale){const cached=new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=600'}});try{await cache.put(cacheKey,cached)}catch{}}}
 return response;
 }
 const asset=ASSETS[u.pathname];if(asset)return new Response(request.method==='HEAD'?null:asset.base64?Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0)):asset.body,{headers:{'Content-Type':asset.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'}});
 return new Response('Not found',{status:404});
}};
