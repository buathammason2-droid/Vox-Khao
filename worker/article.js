// Fetch only known public publishers, never arbitrary client-selected hosts.
const articleHosts=new Set(['bbc.com','bbc.co.uk','reuters.com','apnews.com','theguardian.com','npr.org','aljazeera.com','cnn.com','cnbc.com','abcnews.go.com','nbcnews.com','cbsnews.com','phys.org','sciencedaily.com','science.org','nature.com','euronews.com','france24.com','dw.com','bangkokpost.com','thaipbs.or.th','english.kyodonews.net','channelnewsasia.com','straitstimes.com']);
const articleCache=new Map();
function allowedArticleUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&articleHosts.has(u.hostname.replace(/^www\./,''))?u:null}catch{return null}}
function articlePlain(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):''}).replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function extractArticle(html){
 const paragraphs=[];let structured=false;
 function walk(value,depth=0){if(!value||depth>12)return;if(Array.isArray(value)){value.forEach(v=>walk(v,depth+1));return}if(typeof value!=='object')return;const types=[].concat(value['@type']||[]);if(types.some(v=>/Article|NewsArticle|ReportageNewsArticle/.test(String(v)))&&typeof value.articleBody==='string'){structured=true;paragraphs.push(...value.articleBody.split(/\n+/).map(articlePlain).filter(Boolean))}if(value['@graph'])walk(value['@graph'],depth+1);if(value.mainEntity)walk(value.mainEntity,depth+1)}
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]))}catch{}}
 if(!paragraphs.length){const clean=html.replace(/<(script|style|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,'');const body=clean.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]||clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||'';for(const m of body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)){const p=articlePlain(m[1]);if(p.length>=60)paragraphs.push(p)}}
 const unique=[...new Set(paragraphs)];let count=0;const selected=[];for(const p of unique){if(count+p.length>60000)break;selected.push(p);count+=p.length}return {paragraphs:selected,method:structured?'publisher_article_body':'article_paragraphs',complete:false};
}
async function sourceArticle(request){
 const raw=new URL(request.url).searchParams.get('url')||'';let u=allowedArticleUrl(raw);if(!u)return json({state:'unavailable',reason:'unsupported_source',paragraphs:[]});
 const prior=articleCache.get(u.href);if(prior&&prior.expires>Date.now())return json(prior.data);
 try{let response;const signal=AbortSignal.timeout(16000);for(let hop=0;hop<4;hop++){response=await fetch(u.href,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'KHAO-Reader/1.0'}});if(response.status>=300&&response.status<400){const next=allowedArticleUrl(new URL(response.headers.get('location')||'',u).href);await response.body?.cancel();if(!next)throw Error('redirect');u=next;response=null;continue}break}
 if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('blocked');
 const reader=response.body.getReader();let bytes=0;const chunks=[];try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1500000)throw Error('size');chunks.push(value)}}finally{await reader.cancel()}
 const joined=new Uint8Array(bytes);let offset=0;for(const c of chunks){joined.set(c,offset);offset+=c.length}const extracted=extractArticle(new TextDecoder().decode(joined));const data={state:extracted.paragraphs.length?'ready':'unavailable',...extracted,url:u.href,fetchedAt:new Date().toISOString()};if(articleCache.size>=80)articleCache.delete(articleCache.keys().next().value);articleCache.set(raw,{data,expires:Date.now()+900000});return json(data);
 }catch{return json({state:'unavailable',reason:'source_restricted',paragraphs:[]})}
}
