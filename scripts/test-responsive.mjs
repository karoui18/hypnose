import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {withBrowser,root,sleep} from './browser-session.mjs';
const cases=[];
await withBrowser(async({evaluate,viewport,navigate,screenshot})=>{
  const fits=async(name,width)=>{const size=await evaluate('({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})');assert.ok(size.scrollWidth<=size.width,JSON.stringify({name,size}));cases.push({name,width});};
  for(const width of [320,390,768,1024,1440]){
    await viewport(width,width<=390?844:900);
    await navigate('acces.html');await fits('access',width);await screenshot('access-final-'+width);
    await evaluate(`document.querySelector('#password').value='SebRocks!2026';document.querySelector('#access-form').requestSubmit()`);await sleep(350);
    await navigate('tests.html');await evaluate(`document.querySelector('[data-questionnaire="hamilton"]').click()`);
    await fits('modal',width);assert.equal(await evaluate('document.querySelector("dialog").getBoundingClientRect().width<=innerWidth'),true);await screenshot('modal-final-'+width);
    await navigate('questionnaire.html?id=hamilton');await evaluate(`document.querySelector('#begin').click();for(let i=0;i<13;i++){document.querySelector('#answers-form input').click();document.querySelector('#answers-form').requestSubmit();}`);
    await fits('long-question',width);await screenshot('questionnaire-final-'+width);
    await evaluate(`document.querySelector('#answers-form input').click();document.querySelector('#answers-form').requestSubmit()`);await fits('result',width);await screenshot('result-final-'+width);
    await navigate('questionnaire.html?id=valeurs');await evaluate(`document.querySelector('#begin').click();document.querySelectorAll('select').forEach((s,i)=>s.selectedIndex=i+1);document.querySelector('#values-form').requestSubmit();document.querySelectorAll('input[type=range]').forEach(i=>{i.value=0;i.dispatchEvent(new Event('input',{bubbles:true}))});document.querySelector('#positions-form').requestSubmit()`);
    await fits('values-center',width);await screenshot('values-final-'+width);
  }
});
fs.writeFileSync(path.join(root,'qa/responsive-interactive-check.json'),JSON.stringify({passed:true,cases},null,2));
console.log(`${cases.length} interactive layouts fit 320–1440px.`);
