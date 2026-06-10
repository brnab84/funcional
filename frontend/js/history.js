// history.js — part of Functional WOD frontend
async function loadHistory(page){
  page=page||1;var list=document.getElementById('history-list');
  list.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var hRes=await apiCall('/api/workouts/history?sport='+currentSport+'&page='+page+'&limit=50');
  var sRes=await apiCall('/api/workouts/stats?sport='+currentSport);
  if(!hRes)return;
  document.getElementById('history-stats').innerHTML='<span class="stat-chip">Total: <span>'+(sRes&&sRes.data?sRes.data.total:0)+'</span></span><span class="stat-chip">Month: <span>'+(sRes&&sRes.data?sRes.data.lastMonth:0)+'</span></span>';
  var workouts=hRes.data.workouts||[];
  if(!workouts.length){list.innerHTML='<div class="empty-state"><h3>No History</h3><p>Approve a workout to start</p></div>';return;}
  list.innerHTML=workouts.map(function(w){
    return'<div class="history-item" id="hist-'+w._id+'"><button class="hist-main" onclick="openHistoryModal(\''+w._id+'\')"><span class="hist-date">'+w.date+'</span><div class="hist-modalities">'+(w.blocks||[]).map(function(b){return'<span class="hist-badge">'+b.modality+'</span>';}).join('')+(w.pattern?'<span class="hist-badge">'+w.pattern+'</span>':'')+'</div></button><button class="hist-delete" onclick="deleteHistoryItem(\''+w._id+'\')" title="Delete">x</button></div>';
  }).join('');
  var pages=hRes.data.pages||1;
  document.getElementById('history-pagination').innerHTML=pages>1?Array.from({length:pages},function(_,i){return'<button class="page-btn '+(i+1===page?'active':'')+'" onclick="loadHistory('+(i+1)+')">'+(i+1)+'</button>';}).join(''):'';
}
var _hCache={};
async function openHistoryModal(id){
  if(!_hCache[id]){var r=await apiCall('/api/workouts/history?sport='+currentSport+'&limit=100');if(r&&r.data&&r.data.workouts)r.data.workouts.forEach(function(w){_hCache[w._id]=w;});}
  var w=_hCache[id];if(!w)return;
  document.getElementById('modal-content').innerHTML='<p class="eyebrow" style="margin-bottom:12px">'+w.date+'</p>'+renderWorkout(w,false)+'<button class="btn-manual" onclick="shareHistoryWorkout(\''+w._id+'\')" style="margin-top:14px;width:100%">&#128228; Share as image</button>';
  document.getElementById('modal').classList.remove('hidden');
}
async function deleteHistoryItem(id){
  if(!confirm('Delete this workout?'))return;
  var r=await apiCall('/api/workouts/'+id,{method:'DELETE'});
  if(r&&r.ok){var el=document.getElementById('hist-'+id);if(el)el.remove();delete _hCache[id];showToast('Workout deleted','info');}
}

