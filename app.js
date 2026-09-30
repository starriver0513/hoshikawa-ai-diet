const pastDay=d=>d.replaceAll('-','/');
const kg1=v=>Number(v).toLocaleString('ja-JP',{minimumFractionDigits:1,maximumFractionDigits:1});
// The notes are kept to 0.1 kg, so the difference is shown at the same precision.
const kgDelta=n=>{const d=Math.round(n*10)/10;return (d===0?'±':d>0?'+':'−')+kg1(Math.abs(d))+' kg'};
// Hand-kept notes before Withings: one panel per year. Records without a clock time are placed at noon
// on the chart only, and are never shown with a time.
function renderPast(){
  const target=$('#past-weights');target.replaceChildren();
  const rows=Array.isArray(model.past_weights)?model.past_weights:[];
  if(!rows.length){target.append(text('p','過去の体重の記録はまだありません。','subtle'));return}
  const years=new Map();
  for(const r of rows){const y=r.date.slice(0,4);if(!years.has(y))years.set(y,[]);years.get(y).push(r)}
  for(const [year,records]of years){
    const panel=document.createElement('article');panel.className='panel past-year';
    const first=records[0],last=records[records.length-1];
    const top=text('div','','chart-caption');top.append(text('h3',year+'年'),text('span',pastDay(first.date)+' 〜 '+pastDay(last.date),'subtle'));
    panel.append(top);
    if(records.length>1)panel.append(text('p','最初 '+kg1(first.value)+' kg（'+pastDay(first.date)+'）→ 最後 '+kg1(last.value)+' kg（'+pastDay(last.date)+'）｜ 差 '+kgDelta(last.value-first.value),'range-summary'));
    const points=records.map(r=>({measured_at:Date.parse(r.date+'T'+(r.time||'12:00')+':00+09:00')/1000,value:r.value,label:pastDay(r.date)+(r.time?' '+r.time:'')+' / '+kg1(r.value)+' kg'}));
    points.sort((a,b)=>a.measured_at-b.measured_at);
    const chart=document.createElement('div');
    plot(chart,points,year+'年の過去の体重','kg',matchMedia('(max-width:540px)').matches,{when:t=>new Date(t*1000).toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}),title:r=>r.label});
    panel.append(chart);
    const table=document.createElement('table'),head=document.createElement('tr'),body=document.createElement('tbody');
    for(const h of ['日付','体重','時刻','時間帯・メモ'])head.append(text('th',h));
    const thead=document.createElement('thead');thead.append(head);
    for(const r of records){
      const tr=document.createElement('tr');
      tr.append(text('td',pastDay(r.date)),text('td',kg1(r.value)+' kg'),text('td',r.time||'—'),text('td',[r.period,r.note].filter(Boolean).join(' / ')||'—'));
      body.append(tr);
    }
    table.append(thead,body);
    const scroll=text('div','','table-scroll');scroll.append(table);panel.append(scroll);
    target.append(panel);
  }
}
let publicLoading=false,hashScrolled=false;
async function loadPublic(){
  if(publicLoading)return;publicLoading=true;
  try{
    const response=await fetch('data.json?t='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('記録を取得できませんでした。');
    const next=await response.json();
    if(!Array.isArray(next.metrics))throw Error('ページの更新を待っています。');
    model=next;renderWeight();renderPast();renderMetrics();
    const selected=$('#metric-select').value;$('#metric-select').replaceChildren();
    for(const m of model.metrics){const option=text('option',m.label);option.value=m.metric;$('#metric-select').append(option)}
    if(model.metrics.some(m=>m.metric===selected))$('#metric-select').value=selected;
    renderHistory();
    $('#status').textContent=model.last_sync?'最終更新 '+date(model.last_sync):'最初の記録を待っています';
    $('#message').textContent='';
    // Sections are filled after load, so honour a shared #anchor (e.g. #past-weight) once they exist.
    if(!hashScrolled&&location.hash){hashScrolled=true;document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView()}
  }catch(error){$('#message').textContent='最新の記録を読み込めませんでした。少し待つと自動で再確認します。'}
  finally{publicLoading=false}
}
$('#metric-select').onchange=$('#range').onchange=()=>{historyLimit=50;renderHistory()};
$('#show-more').onclick=()=>{historyLimit+=50;renderHistory()};
loadPublic();setInterval(loadPublic,60000);
