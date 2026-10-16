/* Evidence readiness measures supplied information, never truth probability. */
function assessNewsEvidence(input,now=Date.now()){
 const clean=value=>typeof value==='string'?value.replace(/<[^>]*>/g,'').replace(/\[\+\d+ chars\]/g,'').replace(/\s+/g,' ').trim():'';
 const localized=(th,en)=>({th,en});
 let hasLink=false;try{const u=new URL(input?.url);hasLink=['https:','http:'].includes(u.protocol)&&Boolean(u.hostname)}catch{}
 const publisher=clean(input?.publisher),hasPublisher=Boolean(publisher&&!/^(unknown|anonymous|ไม่ระบุ)$/i.test(publisher));
 const dateKind=input?.dateKind||(input?.source==='GDELT'?'observed':'unknown');
 const published=Date.parse(input?.publishedAt||''),hasDate=dateKind==='published'&&Number.isFinite(published)&&published<=now+300000;
 const desc=clean(input?.description||input?.desc),content=clean(input?.excerpt||input?.content);
 const body=[...new Set([desc,content].filter(Boolean))].join(' '),length=body.length;
 const textPoints=length>=1200?40:length>=500?30:length>=120?20:length>=20?10:0;
 const checks=[
 {id:'link',max:20,earned:hasLink?20:0,label:localized('ลิงก์แหล่งต้นฉบับ','Original source link'),reason:hasLink?localized('มีลิงก์ที่ระบุมา ยังไม่ได้ตรวจข้ออ้างในเว็บไซต์ต้นฉบับ','A source URL was supplied; its claims have not been checked.'):localized('ไม่มีลิงก์ต้นฉบับที่ใช้ได้','No usable source URL was supplied.')},
 {id:'publisher',max:10,earned:hasPublisher?10:0,label:localized('ชื่อผู้เผยแพร่ที่ระบุ','Reported publisher'),reason:hasPublisher?localized('มีชื่อผู้เผยแพร่ตามข้อมูลที่ได้รับ ยังไม่ได้ยืนยันตัวตน','A publisher is named in the supplied data; identity is not verified.'):localized('ยังไม่มีชื่อผู้เผยแพร่','No publisher name was supplied.')},
 {id:'date',max:10,earned:hasDate?10:0,label:localized('วันเวลาเผยแพร่ที่ระบุ','Reported publication date'),reason:hasDate?localized('มีวันเวลาเผยแพร่ตามข้อมูลที่ได้รับ','A valid publication timestamp was supplied.'):dateKind==='observed'?localized('มีเพียงเวลาที่พบข่าว ไม่ใช่เวลาเผยแพร่','Only discovery time is available, not publication time.'):localized('วันเวลาเผยแพร่ไม่ชัดเจนหรืออยู่ในอนาคต','Publication time is unknown, invalid, or in the future.')},
 {id:'text',max:40,earned:textPoints,label:localized('ปริมาณข้อความสำหรับพิจารณา','Amount of text available'),reason:localized('มีข้อความย่อหรือเนื้อหา '+length+' ตัวอักษร คะแนนส่วนนี้วัดปริมาณ ไม่ใช่ความถูกต้อง','The excerpt contains '+length+' characters. This measures quantity, not accuracy.')},
 {id:'independent',max:20,earned:0,label:localized('การตรวจเทียบหลักฐานอิสระ','Independent corroboration'),reason:localized('ยังไม่ได้ตรวจหลักฐานอิสระ จึงยังไม่ให้คะแนนส่วนนี้','Independent evidence has not been checked; no points are awarded.')}
 ];
 const score=checks.reduce((sum,check)=>sum+check.earned,0);
 return {version:'evidence-readiness-v1',score,max:100,truthProbability:null,independentlyVerified:false,sourceMetadataScore:(checks[0].earned+checks[1].earned+checks[2].earned)*2.5,textCoverageScore:textPoints*2.5,bodyCharacters:length,checks,label:score<40?localized('ข้อมูลจำกัด','Limited information'):score<70?localized('ข้อมูลบางส่วน','Partial information'):localized('มีข้อความให้พิจารณามากขึ้น','More text available'),reason:localized(length<20?'มีเพียงพาดหัวหรือข้อความน้อยมาก คะแนนนี้แสดงความพร้อมของข้อมูล ไม่ยืนยันว่าข่าวจริง':'คะแนนนี้แสดงข้อมูลที่มีให้ตรวจต่อ ไม่ใช่เปอร์เซ็นต์ความจริงของข่าว',length<20?'Only a headline or very little text is available. This is information readiness, not verification.':'This score describes information available for further checking, not the probability that the story is true.')};
}
