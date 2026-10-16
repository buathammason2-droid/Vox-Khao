const vocabularyQuizzes=new Map();
function shuffledVocabularyIndices(length,random=Math.random){const out=Array.from({length},(_,i)=>i);for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
function makeVocabularyQuiz(items){return {phase:'quiz',index:0,order:shuffledVocabularyIndices(items.length),options:items.map(()=>shuffledVocabularyIndices(items.length)),answers:[]}}
function selectVocabularyAnswer(state,option){if(state.phase!=='quiz'||state.answers.length>state.index||!Number.isInteger(option)||!state.options[state.index]?.includes(option))return false;const wordIndex=state.order[state.index];state.answers.push({wordIndex,selected:option,correct:option===wordIndex});return true}
function advanceVocabularyQuiz(state){if(state.phase!=='quiz'||state.answers.length<=state.index)return false;if(state.index===state.order.length-1)state.phase='result';else state.index++;return true}
function vocabularyState(n,items){const signature=JSON.stringify(items);let saved=vocabularyQuizzes.get(n.id);if(!saved||saved.signature!==signature){saved={signature,state:{phase:'learn'}};if(vocabularyQuizzes.size>100)vocabularyQuizzes.delete(vocabularyQuizzes.keys().next().value);vocabularyQuizzes.set(n.id,saved)}return saved}
function vocabularyPanel(n,analysisState){
 const items=analysisState?.data?.analysis?.vocabulary||[],ready=items.length===3;
 const state=vocabularyState(n,items).state;
 const cards=()=>'<div class="vocab-cards">'+items.map((item,i)=>'<div><span class="vocab-number">0'+(i+1)+'</span><h4 lang="en">'+esc(item.word)+'</h4><p lang="th">'+esc(item.meaningTh)+'</p><small>'+t('ในข่าว: ','In the source: ')+esc(item.sourceTerm)+'</small></div>').join('')+'</div>';
 let body='';
 if(!ready){body='<p class="vocab-empty" role="status">'+(analysisState?.status==='loading'?t('AI กำลังเลือกศัพท์จากข่าวนี้…','AI is selecting vocabulary from this story…'):analysisState?.status==='ready'?t('ข้อความข่าวนี้ยังไม่เพียงพอสำหรับเลือกศัพท์ 3 คำ','This excerpt does not support three useful vocabulary items.'):t('ยังไม่มีผลจาก Gemini จึงยังสร้างคำศัพท์และควิซไม่ได้','Gemini analysis is unavailable, so vocabulary and the quiz are not ready.'))+'</p><button class="btn" disabled>'+t('เริ่มควิซ · รอคำศัพท์','Start quiz · Awaiting vocabulary')+'</button>'}
 else if(state.phase==='learn'){body=cards()+'<p class="vocab-hint">'+t('จำความหมายทั้ง 3 คำ แล้วลองตอบโดยไม่ดูเฉลย','Study the three meanings, then try answering without the definitions.')+'</p><button class="btn primary" data-vocab-start>'+t('เริ่มควิซ · 3 ข้อ','Start quiz · 3 questions')+' →</button>'}
 else if(state.phase==='quiz'){
  const wordIndex=state.order[state.index],answer=state.answers[state.index],correct=items[wordIndex];
  body='<div class="vocab-progress"><span>'+t('ข้อที่ ','Question ')+(state.index+1)+' / 3</span><span>'+state.answers.filter(x=>x.correct).length+' '+t('คะแนน','correct')+'</span></div><div class="vocab-question"><span>'+t('คำนี้แปลว่าอะไรในข่าวนี้?','What does this word mean in Thai in this story?')+'</span><h4 lang="en">'+esc(correct.word)+'</h4></div><div class="vocab-options">'+state.options[state.index].map((option,i)=>'<button class="vocab-option '+(answer?(option===wordIndex?'is-correct':option===answer.selected?'is-wrong':''):'')+'" data-vocab-answer="'+option+'" '+(answer?'disabled':'')+'><span>'+String.fromCharCode(65+i)+'</span><b lang="th">'+esc(items[option].meaningTh)+'</b></button>').join('')+'</div>';
  if(answer)body+='<p class="vocab-feedback '+(answer.correct?'correct':'incorrect')+'" role="status">'+(answer.correct?t('✓ ถูกต้อง! ','✓ Correct! '):t('ลองจำคำนี้ไว้นะ: ','Remember this meaning: '))+esc(correct.word)+' = '+esc(correct.meaningTh)+'</p><button class="btn primary" data-vocab-next>'+ (state.index===2?t('ดูผลควิซ','See results'):t('ข้อถัดไป','Next question'))+' →</button>';
 }
 else{
  const score=state.answers.filter(x=>x.correct).length;
  body='<div class="vocab-result" role="status"><span>'+t('เรียนรู้ครบแล้ว','Quiz complete')+'</span><strong>'+score+' <small>/ 3</small></strong><p>'+t(score===3?'ยอดเยี่ยม! คุณจำได้ครบทั้ง 3 คำ':'ทบทวนคำศัพท์ แล้วลองอีกครั้งได้เสมอ',score===3?'Great work! You remembered all three meanings.':'Review the meanings and try again whenever you like.')+'</p></div>'+cards()+'<button class="btn primary" data-vocab-start>'+t('ลองทำควิซอีกครั้ง','Try the quiz again')+' ↻</button>';
 }
 return '<section class="vocabulary-panel" id="vocabulary-panel" aria-label="'+t('เรียนรู้คำศัพท์จากข่าว','Learn vocabulary from this story')+'"><div class="vocab-heading"><div><span class="kicker">LEARN FROM THIS STORY</span><h3>'+t('เรียนรู้คำศัพท์','Learn vocabulary')+'</h3></div><span class="vocab-tag">EN → ไทย</span></div><p class="vocab-intro">'+t('AI เลือกศัพท์อังกฤษจากเนื้อหาข่าว พร้อมความหมายภาษาไทยตามบริบท','AI selects English vocabulary grounded in the story, with Thai meanings in context.')+'</p>'+body+'</section>';
}
function bindVocabulary(n){
 const root=document.querySelector('#vocabulary-panel');if(!root)return;
 const analysisState=aiStates.get(n.id),items=analysisState?.data?.analysis?.vocabulary||[];if(items.length!==3)return;
 const saved=vocabularyState(n,items);
 const repaint=()=>{if(!root.isConnected)return;root.outerHTML=vocabularyPanel(n,aiStates.get(n.id));bindVocabulary(n);const panel=document.querySelector('#vocabulary-panel');if(panel){const focus=panel.querySelector('[data-vocab-next]')||panel.querySelector('[data-vocab-answer]:not(:disabled)')||panel.querySelector('[data-vocab-start]');focus?.focus({preventScroll:true})}};
 root.querySelector('[data-vocab-start]')?.addEventListener('click',()=>{saved.state=makeVocabularyQuiz(items);repaint()});
 root.querySelectorAll('[data-vocab-answer]').forEach(button=>button.onclick=()=>{if(selectVocabularyAnswer(saved.state,Number(button.dataset.vocabAnswer)))repaint()});
 root.querySelector('[data-vocab-next]')?.addEventListener('click',()=>{if(advanceVocabularyQuiz(saved.state))repaint()});
}

