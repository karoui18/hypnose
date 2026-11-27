// Independent fixtures transcribed from the PDFs, not derived from engine config.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const {score} = require('../js/scoring.js');
const questionnaires = JSON.parse(fs.readFileSync(path.join(root, 'content/questionnaires.json')));
const get = id => questionnaires.find(q => q.id === id);
let checks = 0;
const eq = (a,b) => { assert.deepEqual(a,b); checks++; };
const rejects = fn => { assert.throws(fn); checks++; };
const specs = [
  ['hamilton',14,0,4,[],[[7,'minimale'],[14,'légère'],[23,'modérée'],[56,'sévère']]],
  ['attitudes',12,1,5,[],null],
  ['rosenberg',10,1,4,[3,5,8,9,10],[[24,'très faible'],[30,'faible'],[34,'moyenne'],[39,'forte'],[40,'très forte']]],
  ['estime-sociale',30,1,6,[1,2,9,10,11,14,16,18,19,20,21,23,26,29,30],null],
  ['tas20',20,1,5,[4,5,10,18,19],[[51,'absence'],[60,'possible'],[100,'présente']]],
  ['pss10',10,0,4,[4,5,7,8],[[13,'faible'],[26,'modéré'],[40,'élevé']]],
];
for (const [id,n,low,high,reverse,bands] of specs) {
  const q=get(id);eq(q.questions.length,n);eq(q.scoring.reverse || [],reverse);
  for(let target=n*low;target<=n*high;target++){
    let rest=target-n*low;
    const corrected=Array.from({length:n},()=>{const d=Math.min(rest,high-low);rest-=d;return low+d;});
    const raw=corrected.map((v,i)=>reverse.includes(i+1)?low+high-v:v);
    const result=score(q,raw);eq(result.total,target);
    if(bands){assert.ok(result.interpretation.includes(bands.find(([max])=>target<=max)[1]));checks++;}
    if(id==='tas20')eq(result.subscales.reduce((sum,s)=>sum+s.total,0),target);
  }
  for(let i=0;i<n;i++){
    const input=Array(n).fill(low);input[i]=null;rejects(()=>score(q,input));
    delete input[i];rejects(()=>score(q,input));
  }
  for(const bad of [NaN,Infinity,-1,high+1,String(low),false,undefined]){const input=Array(n).fill(low);input[0]=bad;rejects(()=>score(q,input));}
}
// LSAS: every total, all four subscales, and dual-field completeness.
const lsas=get('lsas');
eq(lsas.questions.map((q,i)=>q.group==='performance'?i+1:null).filter(Boolean),[1,2,3,4,6,8,9,13,14,16,17,20]);
for(let total=0;total<=144;total++){
  let rest=total;const a=Array.from({length:24},()=>{const anxiety=Math.min(3,rest);rest-=anxiety;const avoidance=Math.min(3,rest);rest-=avoidance;return {anxiety,avoidance};});
  const result=score(lsas,a);eq(result.total,total);eq(result.subscales.reduce((s,x)=>s+x.total,0),total);
  const label=total<56?'Aucune catégorie':total<=65?'modérée':total<=80?'marquée':total<=95?'sévère':'très sévère';assert.ok(result.interpretation.includes(label));checks++;
}
const incomplete=Array.from({length:24},()=>({anxiety:0,avoidance:0}));delete incomplete[3].avoidance;rejects(()=>score(lsas,incomplete));
eq(score(lsas,Array.from({length:24},()=>({anxiety:3,avoidance:3}))).subscales.map(s=>s.total),[36,36,36,36]);
// ASRS must use shaded boxes, not sum of response values; Part B cannot alter Part A.
const thresholds=[2,2,2,3,3,3,3,3,2,3,3,2,3,3,3,2,3,2];eq(get('asrs').scoring.thresholds,thresholds);
for(let i=0;i<18;i++){
  const a=Array(18).fill(0);a[i]=thresholds[i]-1;eq(score(get('asrs'),a).total,0);
  a[i]++;const r=score(get('asrs'),a);eq(r.total,i<6?1:0);eq(r.subscales[0].total,i>=6?1:0);
}
for(let n=0;n<=6;n++){const a=thresholds.map((v,i)=>i<n?v:0);const r=score(get('asrs'),a);eq(r.total,n);assert.ok(r.interpretation.includes(n>=4?'est atteint':'n’est pas atteint'));checks++;}
// Horn is six independent triads and uses >10, never >=10.
for(let i=0;i<6;i++){
  const a=Array(18).fill(1);a[i]=4;a[i+6]=3;a[i+12]=3;let r=score(get('horn'),a);eq(r.total,null);eq(r.subscales[i].total,10);eq(r.subscales[i].highlighted,false);
  a[i]++;r=score(get('horn'),a);eq(r.subscales[i].total,11);eq(r.subscales[i].highlighted,true);
}
// Beck permits multiple selections and takes the maximum, rather than their sum.
const beck=get('beck');eq(beck.questions.length,13);
for(let total=0;total<=39;total++){
  let rest=total;const a=Array.from({length:13},()=>{const v=Math.min(3,rest);rest-=v;return [0,v];});
  const r=score(beck,a);eq(r.total,total);const label=total<=3?'pas de dépression':total<=7?'légère':total<=15?'moyenne':'sévère';assert.ok(r.interpretation.includes(label));checks++;
}
eq(score(beck,Array.from({length:13},()=>[0,1,2,3])).total,39);
const b=Array.from({length:13},()=>[0]);b[6]=[0,1];eq(score(beck,b).needsSupport,true);b[6]=[];rejects(()=>score(beck,b));
eq(get('valeurs').values.length,25);rejects(()=>score(get('valeurs'),[]));
fs.writeFileSync(path.join(root,'qa/scoring-check.json'),JSON.stringify({checks,passed:true,instruments:11,source:'Local PDFs; independent exhaustive total/boundary and reversal fixtures'},null,2));
console.log(`${checks} scoring assertions passed.`);
