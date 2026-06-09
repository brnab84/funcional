// assigned.js — athlete inbox of workouts sent by their coach (read-only + approve)

async function loadAssigned(){
  var listEl=document.getElementById('assigned-list');
  if(!listEl)return;
  listEl.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/workouts/assigned?sport='+currentSport);
  if(!r||!r.ok){
    listEl.innerHTML='<p style="color:var(--accent2)">'+((r&&r.data)?r.data.message:'Error loading assigned workouts')+'</p>';
    return;
  }
  var workouts=r.data.workouts||[];
  if(workouts.length===0){
    listEl.innerHTML='<p style="color:var(--muted)">No workouts from your coach yet.</p>';
    return;
  }
  listEl.innerHTML=workouts.map(function(w){
    var done=w.status==='approved';
    var header='<div class="assigned-item-head"><span class="assigned-date">'+w.date+'</span>'
      +(done?'<span class="assigned-done">&#10003; Done</span>'
            :'<button class="btn-approve assigned-approve" data-id="'+w._id+'">Mark as done</button>')+'</div>';
    return '<div class="assigned-item'+(done?' is-done':'')+'">'+header+renderWorkout(w,false)+'</div>';
  }).join('');
  listEl.querySelectorAll('.assigned-approve').forEach(function(btn){
    btn.addEventListener('click',function(){approveAssigned(btn.dataset.id,btn);});
  });
}

async function approveAssigned(id,btn){
  btn.disabled=true;btn.textContent='Saving...';
  var r=await apiCall('/api/workouts/'+id+'/approve',{method:'PUT',body:JSON.stringify({})});
  if(!r||!r.ok){
    btn.disabled=false;btn.textContent='Mark as done';
    showToast((r&&r.data)?r.data.message:'Could not save','error');
    return;
  }
  showToast('Workout marked as done','success');
  loadAssigned();
}
