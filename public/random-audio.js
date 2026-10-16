const randomPodcast={article:null,language:null,script:'',src:'',translation:'',translationState:'idle',busy:false,error:'',token:0};
const randomPodcastTranslations=new Map();
function podcastCandidates(items){return items.filter(n=>{const title=n.originalTitle||n.title||'';return n.id&&n.url&&(title.match(/[a-zA-Z]/g)||[]).length>(title.match(/[\u0E00-\u0E7F]/g)||[]).length})}
function choosePodcastNews(items,lastId,random=Math.random){const pool=podcastCandidates(items),others=pool.filter(n=>n.id!==lastId),choices=others.length?others:pool;return choices.length?choices[Math.min(choices.length-1,Math.floor(random()*choices.length))]:null}
function randomPodcastScript(n){const title=(n.originalTitle||n.title||'').slice(0,230),desc=(n.originalDesc||n.desc||'').slice(0,1000);return 'Welcome to KHAO podcast. Here is the story. '+title+'. '+(desc?'Here is what the supplied report says. '+desc+'. ':'Only the headline is available. Further details have not been supplied. ')+'That is the available brief. Follow the original source below for the full report and context.'}
function stopRandomPodcast(){randomPodcast.token++;randomPodcast.busy=false}
function randomTranslationMarkup(){const s=randomPodcast;if(uiLang!=='en'||!s.article)return '';return '<section class="panel random-translation"><span class="kicker">ENGLISH → ไทย</span><h2>'+t('คำแปลไทยของพอดแคสต์ทั้งหมด','Full Thai podcast translation')+'</h2><p class="random-explainer">'+t('แปลครบตามบทที่ใช้สร้างเสียง รวมคำเกริ่นและปิดท้าย ไม่ใช่บทความฉบับเต็มของผู้เผยแพร่','A translation of the complete narration script, including its introduction and closing. This is not the publisher’s full article.')+'</p><div class="random-translated" lang="th" role="status">'+esc(s.translation|| (s.translationState==='error'?'ยังแปลไม่ได้ชั่วคราวหรือถึงโควตา MyMemory ลองสุ่มและสร้างพอดแคสต์อีกครั้งได้':s.translationState==='loading'?'กำลังแปลบทพอดแคสต์ทั้งหมดเป็นไทย…':'กดสร้างพอดแคสต์เพื่อดูคำแปลไทย'))+'</div><details><summary>'+t('ดูบทที่ใช้เล่าภาษาอังกฤษ','Read the English narration script')+'</summary><p lang="en">'+esc(s.script)+'</p></details></section>'}
function paintRandomVocabulary(n){if(location.hash!=='#audio'||randomPodcast.article?.id!==n.id)return;const holder=document.querySelector('#random-vocabulary');if(!holder)return;const state=aiStates.get(n.id);holder.innerHTML=(state?.status==='error'?'<p class="random-ai-error" role="status">'+esc(uiLang==='en'?state.error.error_en||'AI is unavailable':state.error.error||'AI ยังไม่พร้อม')+'</p>':'')+vocabularyPanel(n,state);bindVocabulary(n)}
function randomPodcastPage(){
 const s=randomPodcast,n=s.article,display=n?record(n):null,ready=Boolean(s.src&&s.language===uiLang);
 const picked=display?`<div class="random-picked"><img src="${display.image}" alt="" referrerpolicy="no-referrer"><div><span class="kicker">${t('ข่าวที่สุ่มได้','YOUR SELECTED STORY')}</span><h2>${display.title}</h2>${meta(n)}<a href="#article/${display.id}">${t('อ่านรายละเอียดและเลือกเสียงอื่น ↗','Read the story & explore audio options ↗')}</a></div></div>`:`<div class="random-waiting">${t('ข่าวเรื่องต่อไปของคุณรออยู่<br>เลือกไทยหรือ English แล้วกดเริ่มฟัง','Your next story is waiting.<br>Choose Thai or English, then press play.')}</div>`;
 const status=s.error||(loading?t('กำลังโหลดข่าวสำหรับสุ่ม…','Loading stories to shuffle…'):!podcastCandidates(news).length?t('ยังไม่มีข่าวต้นฉบับอังกฤษสำหรับสุ่ม ลองกลับหน้าข่าวแล้วโหลดอีกครั้ง','No English-source stories are available. Reload the news feed first.'):ready?t('เสียงพร้อมแล้ว กดเล่นหรือพักได้ที่เครื่องเล่น','Your audio is ready. Use the player to play or pause.'):t('ระบบสุ่มจากข่าวที่โหลดไว้ และหลีกเลี่ยงข่าวเดิมเมื่อมีข่าวอื่น','Picks from loaded stories and avoids an immediate repeat when alternatives exist.'));
 main.innerHTML=`<div class="random-room"><div class="edition"><b>THE RANDOM LISTENING ROOM</b></div><h1>${t('สุ่มหนึ่งข่าว<br>แล้วให้เราเล่าให้ฟัง.','One random story.<br>A new perspective.')}</h1><p class="random-lead">${t('เลือกภาษา แล้วกดเพียงปุ่มเดียวเพื่อสุ่มข่าวและสร้างพอดแคสต์จากหัวข้อกับข้อมูลย่อ','Choose a language, then press one button to pick a story and create a podcast from its headline and excerpt.')}</p><section class="random-console"><span class="kicker">KHAO / PODCAST SHUFFLE</span><div class="random-language">${languageSwitch()}</div>${picked}<button class="btn primary random-generate" id="random-podcast" ${loading||!podcastCandidates(news).length||s.busy?'disabled':''}>${s.busy?t('กำลังเตรียมพอดแคสต์…','Preparing your podcast…'):t('▶ สุ่มข่าวแล้วฟังพอดแคสต์','▶ Shuffle a story & listen')}</button><p class="random-status" id="random-status" role="status">${esc(status)}</p><audio id="random-speech" controls preload="none" ${ready?'':'hidden'} aria-label="${t('พอดแคสต์ข่าวสุ่ม','Random news podcast')}"></audio><small>${t('ใช้โควตา ElevenLabs เมื่อกดสร้าง · ไม่มีการสร้างเพลงประกอบในหน้านี้','Generation uses ElevenLabs quota. This page creates narration only.')}</small></section>${display?'<div id="random-translation">'+randomTranslationMarkup()+'</div><div id="random-vocabulary">'+vocabularyPanel(n,aiStates.get(n.id))+'</div>':''}</div>`;
 const audio=document.querySelector('#random-speech');elevenSpeech=audio;elevenEffect=null;if(ready)audio.src=s.src;
 document.querySelector('#random-podcast').onclick=generateRandomPodcast;
 if(n)paintRandomVocabulary(n);
 applyLocale();
}
async function translateRandomScript(script,n,signal){
 if(randomPodcastTranslations.has(script))return randomPodcastTranslations.get(script);
 let result;
 try{const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({articles:[{id:n.id,title:'',desc:'',content:script}]}),signal});if(r.ok){const d=await r.json();if(d.articles?.[0]?.state==='translated')result=d.articles[0].content}}catch(e){if(e.name==='AbortError')throw e}
 if(!result)result=await browserTranslateText(script,signal);
 if(!/[\u0E00-\u0E7F]/u.test(result))throw Error('translation_unavailable');
 if(randomPodcastTranslations.size>=12)randomPodcastTranslations.delete(randomPodcastTranslations.keys().next().value);randomPodcastTranslations.set(script,result);return result;
}
async function generateRandomPodcast(){
 const n=choosePodcastNews(news,randomPodcast.article?.id);if(!n||randomPodcast.busy)return;
 stopEleven();const controller=new AbortController();elevenController=controller;const token=++randomPodcast.token,lang=uiLang;
 Object.assign(randomPodcast,{article:n,language:lang,script:randomPodcastScript(n),src:'',translation:'',translationState:'loading',busy:true,error:''});randomPodcastPage();
 const audio=document.querySelector('#random-speech'),button=document.querySelector('#random-podcast'),status=document.querySelector('#random-status');
 const current=()=>randomPodcast.token===token&&location.hash==='#audio'&&uiLang===lang;
 const message=value=>{if(current()&&status.isConnected)status.textContent=value};
 const translateTask=translateRandomScript(randomPodcast.script,n,controller.signal).then(value=>{if(current()){randomPodcast.translation=value;randomPodcast.translationState='ready';const box=document.querySelector('#random-translation');if(box)box.innerHTML=randomTranslationMarkup()}return value}).catch(e=>{if(e.name!=='AbortError'&&current()){randomPodcast.translationState='error';const box=document.querySelector('#random-translation');if(box)box.innerHTML=randomTranslationMarkup()}return null});
 ensureAi(n);
 try{
 let script=randomPodcast.script;if(lang==='th'){message(t('กำลังเตรียมบทภาษาไทย…','Preparing Thai narration…'));script=await translateTask;if(!current())return;if(!script)throw Error('แปลบทเป็นไทยไม่ได้หรือถึงโควตา MyMemory กรุณาลองใหม่หรือเลือก English')}
 if(!current())return;const narration=script.slice(0,1900);
 message(t('กำลังสร้างเสียงพอดแคสต์…','Generating your podcast…'));
 const src=await fetchElevenAudio({kind:'speech',lang,text:narration},'speech|'+lang+'|'+narration,controller.signal);
 if(!current()||!audio.isConnected)return;randomPodcast.src=src;audio.src=src;audio.hidden=false;
 message(t('พอดแคสต์พร้อมแล้ว กดเล่นหรือพักได้ที่เครื่องเล่น','Your podcast is ready. Use the player to play or pause.'));
 await audio.play().catch(()=>{});
 }catch(e){if(e.name!=='AbortError'&&current()){randomPodcast.error=e.message;message(e.message)}}
 finally{await translateTask;if(elevenController===controller)elevenController=null;if(current()){randomPodcast.busy=false;if(button.isConnected){button.disabled=false;button.textContent=t('▶ สุ่มข่าวแล้วฟังพอดแคสต์','▶ Shuffle a story & listen')}}}
}
