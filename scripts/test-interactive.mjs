import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withBrowser,root,sleep} from './browser-session.mjs';
const records=[];
await withBrowser(async({origin,cmd,evaluate,viewport,navigate,screenshot,errors,requests})=>{
  const check=async(name,expression)=>{assert.equal(await evaluate(expression),true,name);records.push(name);};
  const enter=async()=>{await evaluate(`document.querySelector('#password').value='SebRocks!2026';document.querySelector('#access-form').requestSubmit()`);await sleep(450);};
  await viewport(390,844);
  await navigate('questionnaire.html?id=pss10');
  await check('Direct questionnaire URL requires password',`location.pathname.endsWith('/acces.html')&&new URLSearchParams(location.search).get('next')==='questionnaire.html?id=pss10'`);
  await evaluate(`document.querySelector('#password').value='incorrect';document.querySelector('#access-form').requestSubmit()`);
  await check('Wrong password remains blocked',`!!document.querySelector('#access-error').textContent&&!sessionStorage.length`);
  await screenshot('access-390');
  await enter();
  await check('Correct password restores the exact deep link',`location.pathname.endsWith('/questionnaire.html')&&new URLSearchParams(location.search).get('id')==='pss10'&&!!document.querySelector('#begin')`);
  await viewport(1440,900);await navigate('acces.html');await screenshot('access-1440');
  await navigate('tests.html');
  await evaluate(`document.querySelector('[data-questionnaire="pss10"]').click()`);
  await check('Questionnaire link opens a modal',`document.querySelector('dialog').open===true`);
  await check('QR and button URLs match',`document.querySelector('.qr-code').dataset.url===document.querySelector('.questionnaire-open').href`);
  await evaluate(`new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='scripts/vendor/jsQR.js';s.onload=resolve;s.onerror=reject;document.head.append(s)})`);
  const decoded=await evaluate(`(async()=>{const svg=document.querySelector('.qr-code svg');const text=new XMLSerializer().serializeToString(svg);const image=new Image();image.src='data:image/svg+xml;base64,'+btoa(text);await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,400,400);ctx.drawImage(image,0,0,400,400);return jsQR(ctx.getImageData(0,0,400,400).data,400,400)?.data;})()`);
  assert.equal(decoded,`${origin}/questionnaire.html?id=pss10`);records.push('Rendered modal SVG independently decodes to button URL');
  await screenshot('questionnaire-modal-1440');
  await cmd('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await sleep(60);
  await check('Escape closes modal',`!document.querySelector('dialog').open`);
  await check('Focus returns to trigger',`document.activeElement.dataset.questionnaire==='pss10'`);
  await viewport(390,844);await evaluate(`document.querySelector('[data-questionnaire="pss10"]').click()`);await screenshot('questionnaire-modal-390');
  await check('Mobile modal fits viewport',`document.querySelector('dialog').getBoundingClientRect().width<=innerWidth&&document.querySelector('dialog').getBoundingClientRect().height<=innerHeight`);
  await evaluate(`document.querySelector('.dialog-close').click()`);
  const ids=JSON.parse(fs.readFileSync(path.join(root,'content/questionnaires.json'))).filter(q=>q.id!=='valeurs').map(q=>q.id);
  for(const width of [1440,390]){
    await viewport(width,width===390?844:900);
    for(const id of ids){
      await navigate('questionnaire.html?id='+id);
      await evaluate(`document.querySelector('#begin').click()`);
      await evaluate(`document.querySelector('#answers-form').requestSubmit()`);
      await check(`${id}/${width}: missing answers blocked`,`!!document.querySelector('#answer-error').textContent&&document.querySelector('.question-progress').textContent.includes('Question 1 ')`);
      if(id==='pss10')await screenshot('questionnaire-pss10-'+width);
      const completed=await evaluate(`(()=>{let count=0;while(document.querySelector('#answers-form')&&count++<40){const f=document.querySelector('#answers-form');const names=[...new Set([...f.querySelectorAll('input')].map(i=>i.name))];for(const name of names){const inputs=[...f.querySelectorAll('input')].filter(i=>i.name===name);inputs[0].click();if(inputs[0].type==='checkbox')inputs[inputs.length-1].click();}f.requestSubmit();}return {complete:!!document.querySelector('#restart'),count,overflow:document.documentElement.scrollWidth>innerWidth,total:document.querySelector('.score-total strong')?.textContent};})()`);
      assert.equal(completed.complete,true,`${id} completes`);assert.equal(completed.overflow,false,`${id} no overflow`);
      // Independent expected totals for the UI selections: first choice for every item,
      // and both first/last for every Beck group.
      const expected={hamilton:'0',attitudes:'12',lsas:'0',asrs:'0',rosenberg:'25','estime-sociale':'105',tas20:'40',pss10:'16',beck:'39'};
      if(id!=='horn')assert.equal(completed.total,expected[id],`${id} UI-to-score binding`);
      records.push(`${id}/${width}: all questions completed, expected result, no overflow`);
      if(id==='pss10')await screenshot('questionnaire-result-'+width);
      await check(`${id}/${width}: answers not stored`,`localStorage.length===0&&sessionStorage.length===1&&sessionStorage.getItem('hypnosite.access.v1')==='granted'`);
      await evaluate(`document.querySelector('#revise').click()`);
      await check(`${id}/${width}: revise retains answer in memory`,`!!document.querySelector('input:checked')`);
      await cmd('Page.reload');await sleep(300);
      await check(`${id}/${width}: reload clears progress`,`!!document.querySelector('#begin')&&!document.querySelector('input:checked')`);
    }
  }
  await navigate('questionnaire.html?id=valeurs');await evaluate(`document.querySelector('#begin').click()`);
  await evaluate(`document.querySelectorAll('select').forEach(s=>s.value='HU');document.querySelector('#values-form').requestSubmit()`);
  await check('Values reject duplicate selections',`!!document.querySelector('#values-error').textContent`);
  await evaluate(`document.querySelectorAll('select').forEach((s,i)=>s.selectedIndex=i+1);document.querySelector('#values-form').requestSubmit()`);
  await evaluate(`document.querySelector('#positions-form').requestSubmit()`);
  await check('Values require explicit positions',`!!document.querySelector('#values-error').textContent`);
  await evaluate(`document.querySelectorAll('[data-position]').forEach(b=>b.click());document.querySelector('#positions-form').requestSubmit()`);
  await check('Values produce target without invented score',`!!document.querySelector('.values-target svg')&&!document.querySelector('.score-total')&&document.querySelectorAll('.values-legend li').length===6`);
  await screenshot('values-result-390');
  await evaluate(`document.querySelector('[data-lock]').click()`);await sleep(300);
  await check('Lock clears access session',`location.pathname.endsWith('/acces.html')&&sessionStorage.length===0`);
  await navigate('index.html');await check('Homepage is guarded',`location.pathname.endsWith('/acces.html')`);
  await navigate('acces.html?next=https%3A%2F%2Fevil.example%2F');await enter();
  await check('External return URL is rejected',`location.pathname.endsWith('/index.html')`);
  assert.equal(errors.length,0,JSON.stringify(errors));
  assert.equal(requests.filter(r=>!r.url.startsWith(origin)&&!r.url.startsWith('data:')).length,0,'No third-party requests');
  assert.equal(requests.filter(r=>r.method!=='GET').length,0,'No answer POST requests');
  records.push('No runtime errors, third-party requests, or answer submissions');
});
fs.writeFileSync(path.join(root,'qa/interactive-check.json'),JSON.stringify({passed:true,checks:records.length,records},null,2));
console.log(`${records.length} interactive checks passed.`);
