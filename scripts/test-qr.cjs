const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const qrcode=require('../js/vendor/qrcode.js');
const jsQR=require('./vendor/jsQR.js');
const questions=require('../content/questionnaires.json');
const results=[];
for(const q of questions){
  const url=`https://example.test/hypnose/questionnaire.html?id=${q.id}`;
  const code=qrcode(0,'M');code.addData(url,'Byte');code.make();
  const count=code.getModuleCount(),scale=6,quiet=4,size=(count+quiet*2)*scale;
  const rgba=new Uint8ClampedArray(size*size*4).fill(255);
  for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(code.isDark(row,col))for(let y=0;y<scale;y++)for(let x=0;x<scale;x++){
    const p=(((row+quiet)*scale+y)*size+(col+quiet)*scale+x)*4;rgba[p]=rgba[p+1]=rgba[p+2]=0;
  }
  const decoded=jsQR(rgba,size,size);assert.equal(decoded?.data,url);results.push({id:q.id,decoded:true});
}
fs.writeFileSync(path.join(__dirname,'../qa/qr-check.json'),JSON.stringify(results,null,2));
console.log(`${results.length} QR codes independently decoded to the exact questionnaire URL.`);
