// Fetch only known public publishers, never arbitrary client-selected hosts.
const articleHosts=new Set(['bbc.com','bbc.co.uk','reuters.com','apnews.com','theguardian.com','npr.org','aljazeera.com','cnn.com','cnbc.com','abcnews.go.com','abc.net.au','nbcnews.com','cbsnews.com','phys.org','sciencedaily.com','science.org','nature.com','euronews.com','france24.com','dw.com','bangkokpost.com','thaipbs.or.th','english.kyodonews.net','channelnewsasia.com','straitstimes.com','economictimes.indiatimes.com','timesofindia.indiatimes.com','hindustantimes.com','ndtv.com','cbc.ca','bgr.com','punchng.com','scmp.com','time.com','timeout.com','denverpost.com','eveshamjournal.co.uk','space.com','livescience.com','scientificamerican.com','theverge.com','arstechnica.com','techcrunch.com','engadget.com','wired.com','washingtonpost.com','nytimes.com']);
const articleCache=new Map();
function allowedArticleUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&articleHosts.has(u.hostname.replace(/^www\./,''))?u:null}catch{return null}}
function articlePlain(value){return String(value||'').replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):''}).replace(/&quot;/g,'"').replace(/&apos;|&#39;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim()}
function articleParagraphs(html){
 const groups=[],stack=[];let block=null;
 const clean=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|nav|footer|aside|header|form|button|figure)\b[^>]*>[\s\S]*?<\/\1>/gi,'');
 const flush=()=>{if(!block)return;const p=articlePlain(block.text);if(p.length>=(block.heading?4:45))for(const group of block.groups)group.push(p);block=null};
 for(const m of clean.matchAll(/<\/?[a-zA-Z][^>]*>|[^<]+/g)){
 const token=m[0];if(token[0]!=='<'){if(block&&!stack.some(s=>s.skip))block.text+=' '+token;continue}
 const tag=token.match(/^<\/?([a-zA-Z0-9]+)/)?.[1].toLowerCase();if(!tag)continue;
 if(token.startsWith('</')){if(block&&block.tag===tag)flush();let i=stack.length-1;while(i>=0&&stack[i].tag!==tag)i--;if(i>=0){if(block&&stack.slice(i).some(s=>s.group))flush();stack.length=i}continue}
 const attrs=[...token.matchAll(/(?:class|id)\s*=\s*["']([^"']*)["']/gi)].map(a=>a[1]).join(' ');
 const skip=stack.some(s=>s.skip)||/(?:^|[\s_-])(?:advertisement|ad-container|related|recommended|recommendations|promo|share|social|subscribe|newsletter|breadcrumb|cookie|caption|games|game-widget)(?:$|[\s_-])/i.test(attrs);
 if(block&&['p','h2','h3','li','div','section','article','main','ul','ol'].includes(tag))flush();
 let group=null;if(!skip&&(tag==='article'||tag==='main'||/itemprop\s*=\s*["']articleBody["']/i.test(token)||/(?:article|story)[_-](?:body|content)|content__article-body/i.test(attrs))){group=[];groups.push(group)}
 const entry={tag,skip,group};if(!['img','br','hr','input','meta','link','source','wbr','area','embed'].includes(tag)&&!token.endsWith('/>'))stack.push(entry);
 if(['p','h2','h3','li'].includes(tag)&&!skip){const active=stack.filter(s=>s.group).map(s=>s.group);if(active.length)block={tag,heading:tag!=='p',text:'',groups:active}}
 }flush();
 return groups.sort((a,b)=>b.join(' ').length-a.join(' ').length)[0]||[];
}
function extractArticle(html){
 const paragraphs=[];let structured=false;
 function walk(value,depth=0){if(!value||depth>12)return;if(Array.isArray(value)){value.forEach(v=>walk(v,depth+1));return}if(typeof value!=='object')return;const types=[].concat(value['@type']||[]);if(value.isAccessibleForFree!==false&&value.isAccessibleForFree!=='False'&&types.some(v=>/Article|BlogPosting/.test(String(v)))&&typeof value.articleBody==='string'){structured=true;paragraphs.push(...value.articleBody.split(/\n+/).map(articlePlain).filter(Boolean))}if(value['@graph'])walk(value['@graph'],depth+1);if(value.mainEntity)walk(value.mainEntity,depth+1)}
 for(const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(m[1]))}catch{}}
 if(!paragraphs.length)paragraphs.push(...articleParagraphs(html));
 const unique=[...new Set(paragraphs)];let count=0;const selected=[];for(const p of unique){if(/^(?:sign up for (?:our|the) newsletter|subscribe to (?:our|the) newsletter|get the cna app|also worth reading|join our channel)/i.test(p)||count+p.length>60000)break;selected.push(p);count+=p.length}return {paragraphs:selected,method:structured?'publisher_article_body':'article_paragraphs',complete:false};
}
async function sourceArticle(request){
 const raw=new URL(request.url).searchParams.get('url')||'';let u=allowedArticleUrl(raw);if(!u)return json({state:'unavailable',reason:'unsupported_source',paragraphs:[]});
 const prior=articleCache.get(u.href);if(prior&&prior.expires>Date.now())return json(prior.data);
 try{let response;const signal=AbortSignal.timeout(16000);for(let hop=0;hop<4;hop++){response=await fetch(u.href,{redirect:'manual',signal,headers:{Accept:'text/html','User-Agent':'VoxKhao-Reader/1.0'}});if(response.status>=300&&response.status<400){const next=allowedArticleUrl(new URL(response.headers.get('location')||'',u).href);await response.body?.cancel();if(!next)throw Error('redirect');u=next;response=null;continue}break}
 if(!response?.ok||!response.headers.get('content-type')?.includes('text/html'))throw Error('blocked');
 const reader=response.body.getReader();let bytes=0;const chunks=[];try{while(true){const {value,done}=await reader.read();if(done)break;const part=value.subarray(0,3000000-bytes);bytes+=part.length;chunks.push(part);if(bytes>=3000000)break}}finally{await reader.cancel()}
 const joined=new Uint8Array(bytes);let offset=0;for(const c of chunks){joined.set(c,offset);offset+=c.length}const extracted=extractArticle(new TextDecoder().decode(joined));const data={state:extracted.paragraphs.length?'ready':'unavailable',...extracted,url:u.href,fetchedAt:new Date().toISOString()};if(articleCache.size>=80)articleCache.delete(articleCache.keys().next().value);articleCache.set(raw,{data,expires:Date.now()+900000});return json(data);
 }catch{return json({state:'unavailable',reason:'source_restricted',paragraphs:[]})}
}
