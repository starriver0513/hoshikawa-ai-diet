let publicLoading=false;
async function loadPublic(){
  if(publicLoading)return;publicLoading=true;
  try{
    const response=await fetch('data.json?t='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw Error('記録を取得できませんでした。');
    const next=await response.json();
    if(!Array.isArray(next.metrics))throw Error('ページの更新を待っています。');
    model=next;renderWeight();renderMetrics();
    const selected=$('#metric-select').value;$('#metric-select').replaceChildren();
    for(const m of model.metrics){const option=text('option',m.label);option.value=m.metric;$('#metric-select').append(option)}
    if(model.metrics.some(m=>m.metric===selected))$('#metric-select').value=selected;
    renderHistory();
    $('#status').textContent=model.last_sync?'最終更新 '+date(model.last_sync):'最初の記録を待っています';
    $('#message').textContent='';
  }catch(error){$('#message').textContent='最新の記録を読み込めませんでした。少し待つと自動で再確認します。'}
  finally{publicLoading=false}
}
$('#metric-select').onchange=$('#range').onchange=()=>{historyLimit=50;renderHistory()};
$('#show-more').onclick=()=>{historyLimit+=50;renderHistory()};
loadPublic();setInterval(loadPublic,60000);
