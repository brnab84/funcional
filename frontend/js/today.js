// today.js — part of Functional WOD frontend
async function loadToday(){
  var display=document.getElementById('workout-display');
  display.innerHTML='<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';
  try{
    var r=await apiCall('/api/workouts/today?sport='+currentSport);
    if(!r){display.innerHTML='<div class="empty-state"><h3>Connection error</h3></div>';document.querySelector('.action-bar').style.display='none';return;}
    if(!r.ok){display.innerHTML='<div class="empty-state"><h3>Error</h3><p>'+(r.data?r.data.message:'Server error')+'</p></div>';document.querySelector('.action-bar').style.display='none';return;}
    currentWorkouts=r.data.workouts||[];
    if(!currentWorkouts.length){
      display.innerHTML='<div class="empty-state"><h3>No workouts yet</h3><p>Click the refresh button to generate options or + Manual to create one</p></div>';
      document.querySelector('.action-bar').style.display='none';return;
    }
    if(r.data.approvedToday>0){showToast(r.data.approvedToday+' approved today','info');}
    resetTabs();showVariant(0);
  }catch(e){
    display.innerHTML='<div class="empty-state"><h3>Error loading</h3><p>'+e.message+'</p></div>';
    document.querySelector('.action-bar').style.display='none';
  }
}

function resetTabs(){
  document.querySelectorAll('.vtab').forEach(function(t,i){
    if(currentWorkouts[i]){t.style.display='';t.textContent='Option '+(i+1);t.classList.remove('active','approved');}
    else{t.style.display='none';}
  });
  document.querySelector('.action-bar').style.display='';
}
function showVariant(idx){
  if(!currentWorkouts[idx])return;
  activeVariant=idx;
  document.querySelectorAll('.vtab').forEach(function(tab,i){tab.classList.toggle('active',i===idx);});
  document.getElementById('workout-display').innerHTML=renderWorkout(currentWorkouts[idx],true);
  var btn=document.getElementById('btn-approve');btn.textContent='Approve this workout';btn.disabled=false;
}
async function approveWorkout(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var btn=document.getElementById('btn-approve');btn.disabled=true;btn.textContent='Saving...';
  var r=await apiCall('/api/workouts/'+w._id+'/approve',{method:'PUT'});
  if(!r||!r.ok){btn.disabled=false;btn.textContent='Error';return;}
  currentWorkouts.splice(activeVariant,1);
  if(currentWorkouts.length===0){
    document.querySelectorAll('.vtab').forEach(function(t){t.style.display='none';});
    document.getElementById('workout-display').innerHTML='<div class="empty-state"><h3>Approved!</h3><p>Click refresh for new options</p></div>';
    document.querySelector('.action-bar').style.display='none';
  }else{resetTabs();showVariant(0);}
  showToast('Workout approved and saved to history','success');
}
async function regenerateWorkouts(){
  var display=document.getElementById('workout-display');
  display.innerHTML='<div class="loading-state"><div class="spinner"></div><p>Generating...</p></div>';
  var r=await apiCall('/api/workouts/regenerate',{method:'POST',body:JSON.stringify({sport:currentSport})});
  if(!r||!r.ok){
    display.innerHTML='<div class="empty-state"><h3>Error</h3><p>'+(r&&r.data?r.data.message:'Unknown error')+'</p></div>';
    return;
  }
  currentWorkouts=r.data.workouts||[];
  if(!currentWorkouts.length){
    display.innerHTML='<div class="empty-state"><h3>No exercises</h3><p>Go to Library and Seed defaults first</p></div>';
    return;
  }
  resetTabs();showVariant(0);
}
async function generateAiVariant(){
  var btn=document.getElementById('btn-ai');btn.disabled=true;showAiStatus('Asking AI...');
  var r=await apiCall('/api/workouts/ai',{method:'POST',body:JSON.stringify({sport:currentSport})});
  btn.disabled=false;
  if(!r||!r.ok){showToast(r&&r.data?r.data.message:'AI error','error');return;}
  currentWorkouts.push(r.data.workout);resetTabs();showVariant(currentWorkouts.length-1);
  showToast('AI workout generated','success');
}
function showAiStatus(msg,err){var el=document.getElementById('ai-status');el.textContent=msg;el.className='ai-status'+(err?' error':'');}
function hideAiStatus(){document.getElementById('ai-status').className='ai-status hidden';}


// ── MANUAL WORKOUT BUILDER ─────────────────
