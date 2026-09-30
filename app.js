'use strict';
const $=id=>document.getElementById(id);
const date=ts=>new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(ts*1000));
const change=d=>d===null?'—':`${d>0?'+':''}${Number(d).toFixed(2)} kg`;
fetch('./data.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json()}).then(d=>{
 if(!d.latest)return;
 $('empty').hidden=true;$('card').hidden=false;$('history-section').hidden=false;
 $('measured').textContent=`${date(d.latest.measured_at)} 測定`;
 $('card-image').src=`./weight-card.png?v=${encodeURIComponent(d.revision)}`;
 $('card-image').alt=`${Number(d.latest.value).toFixed(2)} kg。前の測定日比 ${change(d.latest.delta)}`;
 $('caption').textContent=`${Number(d.latest.value).toFixed(2)} kg ／ 前の測定日比 ${change(d.latest.delta)}`;
 const daily=new Map();d.history.forEach(r=>daily.set(date(r.measured_at),r));const records=[...daily.entries()];
 records.map(([day,r],i)=>({day,value:r.value,delta:i?Math.round((r.value-records[i-1][1].value)*100)/100:null})).reverse().slice(0,90).forEach(r=>{const tr=document.createElement('tr');[r.day,`${Number(r.value).toFixed(2)} kg`,change(r.delta)].forEach((s,i)=>{const td=document.createElement('td');td.textContent=s;if(i===2&&r.delta<0)td.className='down';tr.appendChild(td)});$('history').appendChild(tr)});
 $('update-note').textContent='Withings体重計の測定データをもとに更新しています。同じ日に複数回測定した場合は、最後の値を表示します。';
}).catch(()=>{$('update-note').textContent='記録を読み込めませんでした。時間をおいてページを開き直してください。'});
