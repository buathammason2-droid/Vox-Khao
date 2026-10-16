import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const context=vm.createContext({Math,Map,t:(th)=>th,esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
vm.runInContext(fs.readFileSync('public/vocabulary.js','utf8'),context);
const items=[{word:'investment',meaningTh:'การลงทุน',sourceTerm:'investment'},{word:'factory',meaningTh:'โรงงาน',sourceTerm:'factory'},{word:'plan',meaningTh:'แผนงาน',sourceTerm:'plan'}];
for(let target=0;target<=3;target++){
 const state=context.makeVocabularyQuiz(items);assert.equal(new Set(state.order).size,3);state.options.forEach(options=>assert.deepEqual(Array.from(options).sort(),[0,1,2]));
 assert.equal(context.advanceVocabularyQuiz(state),false,'Cannot skip an unanswered question');
 for(let i=0;i<3;i++){const correct=state.order[state.index],choice=i<target?correct:(correct+1)%3;assert(context.selectVocabularyAnswer(state,choice));assert.equal(context.selectVocabularyAnswer(state,correct),false,'Answers lock after selection');assert(context.advanceVocabularyQuiz(state))}
 assert.equal(state.phase,'result');assert.equal(state.answers.filter(a=>a.correct).length,target);
 assert.equal(context.selectVocabularyAnswer(state,0),false,'Finished quiz cannot gain extra points');
}
const n={id:'test-article'};
let html=context.vocabularyPanel(n,{status:'error'});assert(html.includes('disabled'));assert(!html.includes('data-vocab-start'));
html=context.vocabularyPanel(n,{status:'ready',data:{analysis:{vocabulary:items}}});assert(html.includes('data-vocab-start'));assert(html.includes('โรงงาน'));
context.vocabularyState(n,items).state=context.makeVocabularyQuiz(items);
html=context.vocabularyPanel(n,{status:'ready',data:{analysis:{vocabulary:items}}});assert.equal((html.match(/data-vocab-answer=/g)||[]).length,3);assert(!html.includes('vocab-cards'),'Learning definitions are hidden while answering');
const malicious=items.map(x=>({...x,word:'<script>alert(1)</script>'}));html=context.vocabularyPanel({id:'escape'},{status:'ready',data:{analysis:{vocabulary:malicious}}});assert(!html.includes('<script>'));
console.log('PASS: three-question scoring 0–3, unique shuffled questions/options, locked answers, no skipped questions, unavailable AI disables quiz, hidden answer cards and escaped text');
