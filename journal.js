let model;
let historyLimit=50;
const $=s=>document.querySelector(s);
const fmt=x=>Number(x).toLocaleString('ja-JP',{minimumFractionDigits:2,maximumFractionDigits:2});
const date=t=>new Date(t*1000).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})+' JST';
const shortDate=t=>new Date(t*1000).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
const delta=(n,unit)=>n==null?'比較記録なし':(Math.abs(n)<.005?'±':n>0?'+':'−')+fmt(Math.abs(n))+(unit?' '+unit:'');
function elapsed(seconds){const s=Math.max(0,Math.floor(seconds));if(s<60)return s+'秒';const minutes=Math.floor(s/60),h=Math.floor(minutes/60);return (s%60?'約':'')+(h?h+'時間':'')+(minutes%60||!h?(minutes%60)+'分':'')}
function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e}
function valueNode(value,unit,cls){const e=text('div',fmt(value),cls);if(unit)e.append(text('span',unit,'unit'));return e}
function setValue(id,value,unit){const target=$(id);target.replaceChildren(document.createTextNode(fmt(value)),text('span',unit,'unit'))}
// opts.when formats axis/aria times; opts.title labels each point (for records without a real clock time).
function plot(target,records,label,unit,compact=false,opts={}){
  target.replaceChildren();
  const when=opts.when||date,tickLabel=opts.when||shortDate,pointLabel=opts.title||(r=>date(r.measured_at)+' / '+fmt(r.value)+' '+unit);
  const rows=records.filter(r=>Number.isFinite(r.value)&&Number.isFinite(r.measured_at));
  if(!rows.length){target.append(text('p','この期間の記録はありません。','chart-empty'));return}
  const ns='http://www.w3.org/2000/svg',width=compact?480:900,height=compact?204:270;
  const left=62,right=width-22,top=28,bottom=height-42;
  const vals=rows.map(r=>r.value),min=Math.min(...vals),max=Math.max(...vals);
  const pad=Math.max((max-min)*.2,Math.abs(max)*.003,.02),lo=min-pad,hi=max+pad;
  const first=rows[0].measured_at,last=rows[rows.length-1].measured_at,span=last-first;
  const x=t=>span?left+(t-first)/span*(right-left):(left+right)/2;
  const y=v=>bottom-(v-lo)/(hi-lo)*(bottom-top);
  const svg=document.createElementNS(ns,'svg');
  function node(tag,attrs,body){const el=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,String(v));if(body!=null)el.textContent=body;svg.append(el);return el}
  svg.setAttribute('viewBox','0 0 '+width+' '+height);svg.setAttribute('class','chart-svg');
  svg.setAttribute('role','img');svg.setAttribute('aria-label',label+'の推移、'+rows.length+'回の測定。'+when(first)+'から'+when(last));
  const axisDecimals=(hi-lo)<.05?3:2;
  node('text',{x:left,y:13},unit||'値');
  for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3,yy=y(v);node('line',{x1:left,y1:yy,x2:right,y2:yy,class:'grid'});node('text',{x:left-8,y:yy+4,'text-anchor':'end'},v.toFixed(axisDecimals))}
  const tick=(t,xx,anchor)=>node('text',{x:xx,y:height-13,'text-anchor':anchor},tickLabel(t));
  if(span){tick(first,left,'start');tick(last,right,'end')}else tick(first,(left+right)/2,'middle');
  const coords=rows.map(r=>[x(r.measured_at),y(r.value)]);
  if(rows.length>1&&span){
    node('path',{d:'M '+coords[0][0]+' '+bottom+' L '+coords.map(p=>p.join(' ')).join(' L ')+' L '+coords[coords.length-1][0]+' '+bottom+' Z',class:'area'});
    node('polyline',{points:coords.map(p=>p.join(',')).join(' '),class:'trend'});
  }
  rows.forEach((r,i)=>{const c=node('circle',{cx:coords[i][0],cy:coords[i][1],r:rows.length>100?2:4,class:'point'});const title=document.createElementNS(ns,'title');title.textContent=pointLabel(r);c.append(title)});
  target.append(svg);
  if(!span)target.append(text('p','この時点の記録を表示しています。次の測定から変化を比較できます。','chart-single'));
}
function renderWeight(){
  const w=model.metrics.find(m=>m.metric==='1');
  $('#empty').hidden=!!w;$('#overview').hidden=!w;if($('#weight-card'))$('#weight-card').hidden=!w;
  $('#started').textContent=w?date(w.first.measured_at):'—';
  $('#weigh-ins').textContent=w?w.count+' 回':'0 回';
  $('#metric-count').textContent=model.metrics.length+' 項目';
  if(!w)return;
  setValue('#first-weight',w.first.value,w.unit);setValue('#latest-weight',w.value,w.unit);
  $('#first-date').textContent=date(w.first.measured_at)+(w.first.attrib===2?' / 手入力':' / Withings記録');$('#latest-date').textContent='測定 '+date(w.measured_at);
  $('#start-change').textContent=delta(w.delta_from_first,w.change_unit);
  $('#previous-change').textContent=delta(w.delta_from_previous,w.change_unit);
  $('#previous-date').textContent=w.previous?'比較元 '+date(w.previous.measured_at):'次の測定から比較します';
  $('#record-span').textContent=w.count>1?elapsed(w.measured_at-w.first.measured_at):'最初の測定';
  $('#weight-chart-caption').textContent=w.count+'回の測定 / '+date(w.first.measured_at)+' 〜 '+date(w.measured_at);
  plot($('#weight-chart'),w.history,'体重',w.unit);
  const src='/weight-card.png?t='+model.last_sync;
  if($('#weight-card')&&$('#weight-card').getAttribute('src')!==src)$('#weight-card').src=src;
}
function renderMetrics(){
  const target=$('#metrics');target.replaceChildren();
  for(const m of model.metrics.filter(m=>m.metric!=='1')){
    const card=document.createElement('article');card.className='metric panel';
    const top=text('div','','metric-top');top.append(text('h3',m.label),text('span',m.count+' 回','metric-count'));
    card.append(top,valueNode(m.value,m.unit,'metric-value'),text('p','最新の測定 '+date(m.measured_at),'metric-date'));
    const chart=document.createElement('div');plot(chart,m.history,m.label,m.unit,true);card.append(chart);
    const deltas=text('div','','metric-deltas');
    for(const [caption,n]of [['最初の記録から',m.delta_from_first],['前回の記録から',m.delta_from_previous]]){
      const block=document.createElement('div');block.append(text('small',caption),text('strong',delta(n,m.change_unit)));deltas.append(block);
    }
    card.append(deltas,text('p','最初の記録 '+fmt(m.first.value)+' '+m.unit+' / '+date(m.first.measured_at)+(m.previous?'\n前回の測定 '+date(m.previous.measured_at):''),'metric-baseline'));
    target.append(card);
  }
  if(!target.children.length)target.append(text('p','体重以外の測定データは、取得でき次第ここに表示します。','subtle'));
}
function renderHistory(){
  if(!model)return;
  const m=model.metrics.find(m=>m.metric===$('#metric-select').value);
  const tbody=$('#history-body');tbody.replaceChildren();$('#show-more').hidden=true;
  if(!m){$('#chart').replaceChildren();$('#range-summary').textContent='測定データはまだありません。';return}
  const days=Number($('#range').value),now=Date.now()/1000;
  const records=m.history.filter(r=>!days||r.measured_at>=now-days*86400);
  plot($('#chart'),records,m.label,m.unit);
  if(records.length){
    const first=records[0],last=records[records.length-1];
    $('#range-summary').textContent=records.length+'件 / '+date(first.measured_at)+' → '+date(last.measured_at)+' ｜ 期間内の最初から '+delta(last.measured_at>first.measured_at?last.value-first.value:null,m.change_unit);
  }else $('#range-summary').textContent='選択した期間に測定データはありません。';
  const previousByRow=new Map();let previousTime=null,previousGroup=null,currentGroup=null;
  for(const r of m.history){
    if(r.measured_at!==previousTime){previousGroup=currentGroup;previousTime=r.measured_at}
    previousByRow.set(r,previousGroup);currentGroup=r;
  }
  for(const r of [...records].reverse().slice(0,historyLimit)){
    const prev=previousByRow.get(r),tr=document.createElement('tr');
    const diff=text('td',delta(prev?r.value-prev.value:null,m.change_unit));
    if(prev)diff.title='比較元 '+date(prev.measured_at);
    tr.append(text('td',date(r.measured_at)),text('td',fmt(r.value)+(m.unit?' '+m.unit:'')),diff,text('td',r.attrib===0?'実測（端末確認済み）':r.attrib===2?'手入力':'Withings記録（属性 '+r.attrib+'）'));
    tbody.append(tr);
  }
  $('#show-more').hidden=records.length<=historyLimit;
  $('#show-more').textContent='過去の記録をさらに表示（残り'+Math.max(0,records.length-historyLimit)+'件）';
}
