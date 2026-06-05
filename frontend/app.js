const API='';
var VERSION='...';
let token=localStorage.getItem('wod_token');
let currentUser=null,currentWorkouts=[],activeVariant=1,currentSport='functional';
let pendingPhotos=[],editingWorkout=null;

function authHeader(){return token?{'Authorization':'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
async function apiCall(url,options={}){
  const res=await fetch(API+url,{...options,headers:{...authHeader(),...(options.headers||{})}});
  const data=await res.json();
  if(res.status===401){logout();return null;}
  return{ok:res.ok,data,status:res.status};
}

function showAuth(){document.getElementById('auth-screen').classList.remove('hidden');document.getElementById('app').classList.add('hidden');}
function showApp(){
  document.getElementById('auth-screen').classList.add('hidden');document.getElementById('app').classList.remove('hidden');
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).toUpperCase();
  if(currentUser){
    document.getElementById('nav-username').textContent=currentUser.name;
    document.getElementById('settings-user-info').textContent=currentUser.name+' · '+currentUser.email+' · v'+VERSION;
    loadUserSettings();
  }
  loadToday();
  fetch(API+'/api/health').then(function(r){return r.json();}).then(function(d){
    if(d.version){VERSION=d.version;document.querySelectorAll('.version-label').forEach(function(el){el.textContent='v'+d.version;});}
  }).catch(function(){});
}
async function login(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  showAuthError('');
  const btn=document.getElementById('btn-login');btn.textContent='Logging in...';btn.disabled=true;
  const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await r.json();
  btn.textContent='Login';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  showApp();
}
async function register(){
  const name=document.getElementById('reg-name').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const password=document.getElementById('reg-password').value;
  showAuthError('');
  if(password.length<6)return showAuthError('Password must be at least 6 characters');
  const btn=document.getElementById('btn-register');btn.textContent='Creating...';btn.disabled=true;
  const r=await fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
  const data=await r.json();
  btn.textContent='Create account';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  showApp();
}
function logout(){token=null;currentUser=null;localStorage.removeItem('wod_token');localStorage.removeItem('wod_user');showAuth();}
function showAuthError(msg){const el=document.getElementById('auth-error');el.textContent=msg;el.classList.toggle('hidden',!msg);}

function modalityBadgeClass(m){
  m=(m||'').toUpperCase();
  if(m.includes('EMOM'))return'badge-emom';if(m.includes('OTM'))return'badge-otm';
  if(m.includes('AMRAP')&&!m.includes('MINI'))return'badge-amrap';if(m.includes('FOR TIME'))return'badge-fortime';
  if(m.includes('ROUNDS'))return'badge-rounds';if(m.includes('TABATA'))return'badge-tabata';
  if(m.includes('DESCENDING'))return'badge-descending';if(m.includes('ZONE'))return'badge-zones';
  if(m.includes('MINI'))return'badge-miniamrap';return'badge-rounds';
}
function catDot(cat){return'<span class="ex-category-dot dot-'+(cat||'lower')+'"></span>';}

function renderWorkout(workout,editable){
  if(!workout)return'<div class="empty-state"><h3>No workout</h3></div>';
  let html='<div class="workout-card">';
  if(workout.warmup&&workout.warmup.exercises&&workout.warmup.exercises.length){
    html+='<div class="card-header"><div class="card-header-left"><span class="card-badge badge-warmup">E.C.</span><span class="card-config">'+(workout.warmup.rounds||3)+' Rounds</span></div>'+(editable?'<button class="btn-edit-section" onclick="editWarmup()">Edit</button>':'')+'</div>';
    html+='<div class="exercise-table">'+workout.warmup.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+catDot(ex.category)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  }
  (workout.blocks||[]).forEach(function(block,bi){
    html+='<div class="section-label">Block '+block.label+'</div>';
    html+='<div class="card-header"><div class="card-header-left"><span class="card-badge '+modalityBadgeClass(block.modality)+'">'+block.modality+'</span><span class="card-config">'+(block.config||'')+'</span></div>'+(editable?'<button class="btn-edit-section" onclick="editBlock('+bi+')">Edit</button>':'')+(workout.source==='ai'?'<span class="card-source-ai">AI</span>':'')+'</div>';
    html+='<div class="exercise-table">'+block.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+catDot(ex.category)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  });
  if(workout.pattern)html+='<div class="section-label" style="color:var(--accent);border-top:none">Pattern: '+workout.pattern+'</div>';
  return html+'</div>';
}

// ── TODAY ──────────────────────────────────────────────────
async function loadToday(){
  var display=document.getElementById('workout-display');
  display.innerHTML='<div class="loading-state"><div class="spinner"></div><p>Generating workouts...</p></div>';
  var r=await apiCall('/api/workouts/today?sport='+currentSport);
  if(!r)return;
  currentWorkouts=r.data.workouts||[];
  if(!currentWorkouts.length){
    display.innerHTML='<div class="empty-state"><h3>No workouts</h3><p>Go to <strong>Library</strong> and click <strong>Seed defaults</strong> first</p></div>';
    document.querySelector('.action-bar').style.display='none';
    return;
  }
  // Show approved today count
  if(r.data.approvedToday>0){
    showAiStatus(r.data.approvedToday+' workout(s) already approved today');
    setTimeout(hideAiStatus,3000);
  }
  resetTabs();
  showVariant(0);
}

function resetTabs(){
  var tabs=document.querySelectorAll('.vtab');
  tabs.forEach(function(t,i){
    if(currentWorkouts[i]){
      t.style.display='';
      t.textContent='Option '+(i+1);
      t.classList.remove('active','approved');
    } else {
      t.style.display='none';
    }
  });
  document.querySelector('.action-bar').style.display='';
}

function showVariant(idx){
  if(!currentWorkouts[idx])return;
  activeVariant=idx;
  document.querySelectorAll('.vtab').forEach(function(tab,i){tab.classList.toggle('active',i===idx);});
  var w=currentWorkouts[idx];
  document.getElementById('workout-display').innerHTML=renderWorkout(w,true);
  var btn=document.getElementById('btn-approve');
  btn.textContent='Approve this workout';
  btn.disabled=false;
}

async function approveWorkout(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var btn=document.getElementById('btn-approve');btn.disabled=true;btn.textContent='Saving...';
  var r=await apiCall('/api/workouts/'+w._id+'/approve',{method:'PUT'});
  if(!r||!r.ok){btn.disabled=false;btn.textContent='Error - retry';return;}
  // Remove approved from suggestions list
  currentWorkouts.splice(activeVariant,1);
  if(currentWorkouts.length===0){
    resetTabs();
    document.querySelectorAll('.vtab').forEach(function(t){t.style.display='none';});
    document.getElementById('workout-display').innerHTML='<div class="empty-state"><h3>Workout Approved!</h3><p>Click refresh to generate new options, or check History</p></div>';
    document.querySelector('.action-bar').style.display='none';
  } else {
    resetTabs();
    showVariant(0);
  }
  showAiStatus('Workout approved and saved to history!');setTimeout(hideAiStatus,3000);
}

async function regenerateWorkouts(){
  await apiCall('/api/workouts/regenerate',{method:'POST',body:JSON.stringify({sport:currentSport})});
  currentWorkouts=[];
  loadToday();
}

async function generateAiVariant(){
  var btn=document.getElementById('btn-ai');btn.disabled=true;showAiStatus('Asking AI coach...');
  var r=await apiCall('/api/workouts/ai',{method:'POST',body:JSON.stringify({sport:currentSport})});
  btn.disabled=false;
  if(!r||!r.ok){showAiStatus((r&&r.data&&r.data.message?r.data.message:'AI error'),true);setTimeout(hideAiStatus,6000);return;}
  // Add AI workout to current options
  currentWorkouts.push(r.data.workout);
  resetTabs();
  showVariant(currentWorkouts.length-1);
  showAiStatus('AI workout ready!');setTimeout(hideAiStatus,4000);
}

function showAiStatus(msg,isError){var el=document.getElementById('ai-status');el.textContent=msg;el.className='ai-status'+(isError?' error':'');}
function hideAiStatus(){document.getElementById('ai-status').className='ai-status hidden';}

// ── EDIT ──────────────────────────────────────────────────
function editWarmup(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var warmup=w.warmup;
  var html='<h3 style="margin-bottom:12px">Edit Warm-up</h3>';
  html+='<label class="field">Rounds: <input type="number" id="edit-warmup-rounds" value="'+(warmup.rounds||3)+'" min="1" max="10" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"></label>';
  html+='<div style="margin-top:12px">';
  warmup.exercises.forEach(function(ex,i){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">';
    html+='<input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
    html+='<input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center">';
    html+='<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button>';
    html+='</div>';
  });
  html+='</div>';
  html+='<button onclick="saveWarmupEdit()" class="btn-save-settings" style="margin-top:12px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;
  document.getElementById('modal').classList.remove('hidden');
}

async function saveWarmupEdit(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var rounds=parseInt(document.getElementById('edit-warmup-rounds').value)||3;
  var rows=document.querySelectorAll('#modal-content .edit-row');
  var exercises=[];
  rows.forEach(function(row){
    var name=row.querySelector('.edit-name').value.trim();
    var reps=row.querySelector('.edit-reps').value.trim();
    if(name)exercises.push({name:name,reps:reps,category:'conditioning'});
  });
  w.warmup={rounds:rounds,exercises:exercises};
  var r=await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({warmup:w.warmup})});
  document.getElementById('modal').classList.add('hidden');
  showVariant(activeVariant);
}

function editBlock(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var block=w.blocks[bi];
  var html='<h3 style="margin-bottom:12px">Edit Block '+block.label+'</h3>';
  html+='<div style="display:flex;gap:8px;margin-bottom:12px">';
  html+='<select id="edit-block-modality" style="height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
  ['EMOM','OTM','AMRAP','FOR TIME','ROUNDS','TABATA','DESCENDING','ZONES'].forEach(function(m){
    html+='<option'+(block.modality===m?' selected':'')+'>'+m+'</option>';
  });
  html+='</select>';
  html+='<input id="edit-block-config" value="'+(block.config||'')+'" placeholder="Config (e.g. 7\')" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
  html+='</div>';
  html+='<div id="edit-block-exercises">';
  block.exercises.forEach(function(ex){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">';
    html+='<input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
    html+='<input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center">';
    html+='<button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button>';
    html+='</div>';
  });
  html+='</div>';
  html+='<button onclick="addEditRow()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 12px;cursor:pointer;margin-bottom:12px">+ Add exercise</button>';
  html+='<button onclick="saveBlockEdit('+bi+')" class="btn-save-settings" style="margin-top:8px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;
  document.getElementById('modal').classList.remove('hidden');
}

function addEditRow(){
  var container=document.getElementById('edit-block-exercises');
  var div=document.createElement('div');
  div.className='edit-row';
  div.style='display:flex;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML='<input class="edit-name" placeholder="Exercise name" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" placeholder="Reps" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button>';
  container.appendChild(div);
}

async function saveBlockEdit(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;
  w.blocks[bi].modality=document.getElementById('edit-block-modality').value;
  w.blocks[bi].config=document.getElementById('edit-block-config').value;
  var rows=document.querySelectorAll('#edit-block-exercises .edit-row');
  var exercises=[];
  rows.forEach(function(row){
    var name=row.querySelector('.edit-name').value.trim();
    var reps=row.querySelector('.edit-reps').value.trim();
    if(name)exercises.push({name:name,reps:reps,category:'conditioning'});
  });
  w.blocks[bi].exercises=exercises;
  await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({blocks:w.blocks})});
  document.getElementById('modal').classList.add('hidden');
  showVariant(activeVariant);
}

// ── HISTORY ──────────────────────────────────────────────
async function loadHistory(page){
  page=page||1;
  var list=document.getElementById('history-list');
  list.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var hRes=await apiCall('/api/workouts/history?sport='+currentSport+'&page='+page+'&limit=50');
  var sRes=await apiCall('/api/workouts/stats?sport='+currentSport);
  if(!hRes)return;
  document.getElementById('history-stats').innerHTML='<span class="stat-chip">Total: <span>'+(sRes&&sRes.data?sRes.data.total:0)+'</span></span><span class="stat-chip">Month: <span>'+(sRes&&sRes.data?sRes.data.lastMonth:0)+'</span></span>';
  var workouts=hRes.data.workouts||[];
  if(!workouts.length){list.innerHTML='<div class="empty-state"><h3>No History Yet</h3><p>Approve a workout to start building your log</p></div>';return;}
  list.innerHTML=workouts.map(function(w){
    return'<div class="history-item" id="hist-'+w._id+'"><button class="hist-main" onclick="openHistoryModal(\''+w._id+'\')"><span class="hist-date">'+w.date+'</span><div class="hist-modalities">'+(w.blocks||[]).map(function(b){return'<span class="hist-badge">'+b.modality+'</span>';}).join('')+(w.pattern?'<span class="hist-badge">'+w.pattern+'</span>':'')+'</div></button><button class="hist-delete" onclick="deleteHistoryItem(\''+w._id+'\')" title="Delete">x</button></div>';
  }).join('');
  var pages=hRes.data.pages||1;
  document.getElementById('history-pagination').innerHTML=pages>1?Array.from({length:pages},function(_,i){return'<button class="page-btn '+(i+1===page?'active':'')+'" onclick="loadHistory('+(i+1)+')">'+(i+1)+'</button>';}).join(''):'';
}

var _hCache={};
async function openHistoryModal(id){
  if(!_hCache[id]){
    var r=await apiCall('/api/workouts/history?sport='+currentSport+'&limit=100');
    if(r&&r.data&&r.data.workouts)r.data.workouts.forEach(function(w){_hCache[w._id]=w;});
  }
  var w=_hCache[id];if(!w)return;
  document.getElementById('modal-content').innerHTML='<p class="eyebrow" style="margin-bottom:12px">'+w.date+'</p>'+renderWorkout(w,false);
  document.getElementById('modal').classList.remove('hidden');
}

async function deleteHistoryItem(id){
  if(!confirm('Delete this workout from history?'))return;
  var r=await apiCall('/api/workouts/'+id,{method:'DELETE'});
  if(r&&r.ok){
    var el=document.getElementById('hist-'+id);
    if(el)el.remove();
    delete _hCache[id];
  }
}

// ── LIBRARY ──────────────────────────────────────────────
async function loadLibrary(){
  var list=document.getElementById('exercise-list');
  list.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/exercises?sport='+currentSport);if(!r)return;
  var exercises=r.data.exercises||[];
  if(!exercises.length){list.innerHTML='<div class="empty-state"><h3>Empty Library</h3><p>Click "Seed defaults" to load exercises</p></div>';return;}
  var cats={};
  exercises.forEach(function(ex){(cats[ex.category]=cats[ex.category]||[]).push(ex);});
  var catLabels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power'};
  var order=['lower','upper','core','conditioning','power'];
  var sortedCats=Object.keys(cats).sort(function(a,b){var ia=order.indexOf(a),ib=order.indexOf(b);return(ia<0?99:ia)-(ib<0?99:ib);});
  list.innerHTML=sortedCats.map(function(cat){
    return'<div class="ex-category-group"><div class="ex-cat-header">'+(catLabels[cat]||cat.charAt(0).toUpperCase()+cat.slice(1))+' <span class="ex-cat-count">'+cats[cat].length+'</span></div><div class="ex-cat-items">'+cats[cat].map(function(ex){
      return'<div class="ex-pill" id="ex-'+ex._id+'"><span class="ex-pill-name"><span class="ex-category-dot dot-'+ex.category+'"></span>'+ex.name+'</span><button class="ex-pill-delete" onclick="deleteExercise(\''+ex._id+'\')">x</button></div>';
    }).join('')+'</div></div>';
  }).join('');
}
async function addExercise(){
  var name=document.getElementById('ex-name').value.trim();var category=document.getElementById('ex-category').value;if(!name)return;
  await apiCall('/api/exercises',{method:'POST',body:JSON.stringify({name:name,category:category,sport:currentSport})});
  document.getElementById('ex-name').value='';loadLibrary();
}
async function deleteExercise(id){await apiCall('/api/exercises/'+id,{method:'DELETE'});loadLibrary();}
async function seedDefaults(){
  var btn=document.getElementById('btn-seed');btn.textContent='Seeding...';btn.disabled=true;
  var r=await apiCall('/api/exercises/seed',{method:'POST',body:JSON.stringify({sport:currentSport})});
  if(r&&r.ok){btn.textContent='Seeded '+r.data.count;loadLibrary();}
  else{btn.textContent='Error';alert('Seed failed: '+(r&&r.data?r.data.message:'unknown'));}
  setTimeout(function(){btn.textContent='Seed defaults';btn.disabled=false;},3000);
}

async function loadCategories(){
  var r=await apiCall('/api/exercises/categories?sport='+currentSport);
  if(!r||!r.ok)return;
  var sel=document.getElementById('ex-category');
  var labels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power'};
  var current=sel.value;
  sel.innerHTML=r.data.categories.map(function(c){return'<option value="'+c+'">'+(labels[c]||c.charAt(0).toUpperCase()+c.slice(1))+'</option>';}).join('')+'<option value="__new__">+ New category...</option>';
  if(r.data.categories.includes(current))sel.value=current;
}

function handleCategoryChange(){
  var sel=document.getElementById('ex-category');
  if(sel.value==='__new__'){
    var newCat=prompt('New category name:');
    if(newCat&&newCat.trim()){
      var val=newCat.trim().toLowerCase();
      var opt=document.createElement('option');opt.value=val;opt.textContent=newCat.trim();
      sel.insertBefore(opt,sel.querySelector('option[value="__new__"]'));sel.value=val;
    } else {sel.value=sel.options[0].value;}
  }
}

// ── PHOTO UPLOAD ────────────────────────────────────────
function togglePhotoPanel(){document.getElementById('photo-panel').classList.toggle('hidden');}
function handlePhotoSelect(files){
  pendingPhotos=[];
  var preview=document.getElementById('photo-preview');preview.innerHTML='';
  Array.from(files).forEach(function(file){
    var reader=new FileReader();
    reader.onload=function(e){
      var data=e.target.result.split(',')[1];
      pendingPhotos.push({data:data,mediaType:file.type||'image/jpeg',name:file.name});
      preview.innerHTML+='<div class="photo-thumb"><img src="'+e.target.result+'"><span>'+file.name+'</span></div>';
      document.getElementById('btn-analyze').disabled=false;
    };
    reader.readAsDataURL(file);
  });
}
async function analyzePhotos(){
  if(!pendingPhotos.length)return;
  var btn=document.getElementById('btn-analyze');btn.textContent='Analyzing...';btn.disabled=true;
  var r=await apiCall('/api/upload/photo',{method:'POST',body:JSON.stringify({images:pendingPhotos,sport:currentSport})});
  btn.textContent='Analyze with AI';btn.disabled=false;
  var results=document.getElementById('photo-results');
  if(!r||!r.ok){results.innerHTML='<p style="color:var(--accent2)">'+(r&&r.data?r.data.message:'Error')+'</p>';results.classList.remove('hidden');return;}
  results.innerHTML='<div class="photo-result-box"><p style="color:var(--green);font-weight:700">Analysis complete</p><p>'+(r.data.added?r.data.added.length:0)+' new exercises added, '+(r.data.skipped?r.data.skipped.length:0)+' already existed</p></div>';
  results.classList.remove('hidden');loadLibrary();
}

// ── SETTINGS ────────────────────────────────────────────
function loadUserSettings(){
  if(!currentUser||!currentUser.settings)return;
  var s=currentUser.settings;
  document.querySelectorAll('.bc-btn').forEach(function(btn){btn.classList.toggle('active',parseInt(btn.dataset.count)===(s.blockCount||2));});
  renderBlockModalities(s.blockCount||2,s.blockModalities||{});
  document.getElementById('avoid-days').value=s.avoidRepeatDays||7;
  document.getElementById('days-label').textContent=s.avoidRepeatDays||7;
  renderSportList();
}
function renderBlockModalities(count,modalities){
  var labels=['A','B','C','D'].slice(0,count);
  var opts=['random','EMOM','OTM','AMRAP','ROUNDS','FOR TIME','TABATA'];
  document.getElementById('block-modalities').innerHTML=labels.map(function(label){
    return'<label class="field" style="margin-top:12px"><span>Block '+label+'</span><select class="block-mod-select" data-label="'+label+'">'+opts.map(function(o){return'<option value="'+o+'"'+((modalities[label]||'random')===o?' selected':'')+'>'+(o==='random'?'Random':o)+'</option>';}).join('')+'</select></label>';
  }).join('');
}
function renderSportList(){
  document.getElementById('sport-list').innerHTML=(currentUser&&currentUser.sports?currentUser.sports:[]).map(function(s){return'<div class="sport-pill"><span class="ex-category-dot" style="background:var(--accent)"></span>'+s.type+'</div>';}).join('');
}
async function saveSetting(){
  var blockCount=parseInt((document.querySelector('.bc-btn.active')||{}).dataset.count)||2;
  var blockModalities={};
  document.querySelectorAll('.block-mod-select').forEach(function(sel){blockModalities[sel.dataset.label]=sel.value;});
  var avoidRepeatDays=parseInt(document.getElementById('avoid-days').value);
  var r=await apiCall('/api/auth/settings',{method:'PUT',body:JSON.stringify({blockCount:blockCount,blockModalities:blockModalities,avoidRepeatDays:avoidRepeatDays})});
  if(r&&r.ok){currentUser.settings=r.data.settings;localStorage.setItem('wod_user',JSON.stringify(currentUser));var st=document.getElementById('settings-status');st.textContent='Saved!';st.className='settings-status';setTimeout(function(){st.className='settings-status hidden';},2500);}
}
async function addSport(){
  var sport=document.getElementById('new-sport').value.trim().toLowerCase();if(!sport)return;
  var r=await apiCall('/api/auth/add-sport',{method:'POST',body:JSON.stringify({sport:sport})});
  if(r&&r.ok){currentUser.sports=r.data.sports;localStorage.setItem('wod_user',JSON.stringify(currentUser));document.getElementById('new-sport').value='';var sel=document.getElementById('sport-selector');if(!sel.querySelector('option[value="'+sport+'"]')){var opt=document.createElement('option');opt.value=sport;opt.textContent=sport.charAt(0).toUpperCase()+sport.slice(1);sel.appendChild(opt);}renderSportList();}
}

// ── NAV ─────────────────────────────────────────────────
function switchView(name){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.querySelectorAll('.nav-btn[data-view]').forEach(function(b){b.classList.remove('active');});
  document.getElementById('view-'+name).classList.add('active');
  document.querySelector('[data-view="'+name+'"]').classList.add('active');
  if(name==='history')loadHistory();
  if(name==='library'){loadLibrary();loadCategories();}
}

// ── INIT ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',function(){
  var saved=localStorage.getItem('wod_user');
  if(token&&saved){currentUser=JSON.parse(saved);showApp();}else{showAuth();}

  document.querySelectorAll('.auth-tab').forEach(function(tab){tab.addEventListener('click',function(){
    document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');
    document.getElementById('tab-login').classList.toggle('hidden',tab.dataset.tab!=='login');
    document.getElementById('tab-register').classList.toggle('hidden',tab.dataset.tab!=='register');showAuthError('');
  });});
  document.getElementById('btn-login').addEventListener('click',login);
  document.getElementById('login-password').addEventListener('keydown',function(e){if(e.key==='Enter')login();});
  document.getElementById('btn-register').addEventListener('click',register);
  document.getElementById('btn-logout').addEventListener('click',logout);
  document.querySelectorAll('.nav-btn[data-view]').forEach(function(btn){btn.addEventListener('click',function(){switchView(btn.dataset.view);});});
  document.getElementById('sport-selector').addEventListener('change',function(e){
    currentSport=e.target.value;
    var view=(document.querySelector('.view.active')||{}).id;
    if(view)view=view.replace('view-','');
    if(view==='today')loadToday();if(view==='history')loadHistory();if(view==='library'){loadLibrary();loadCategories();}
  });
  document.querySelectorAll('.vtab').forEach(function(tab,i){tab.addEventListener('click',function(){showVariant(i);});});
  document.getElementById('btn-approve').addEventListener('click',approveWorkout);
  document.getElementById('btn-regenerate').addEventListener('click',regenerateWorkouts);
  document.getElementById('btn-ai').addEventListener('click',generateAiVariant);
  document.getElementById('btn-add-ex').addEventListener('click',addExercise);
  document.getElementById('ex-name').addEventListener('keydown',function(e){if(e.key==='Enter')addExercise();});
  document.getElementById('btn-seed').addEventListener('click',seedDefaults);
  document.getElementById('ex-category').addEventListener('change',handleCategoryChange);
  document.getElementById('btn-upload-photo').addEventListener('click',togglePhotoPanel);
  document.getElementById('photo-input').addEventListener('change',function(e){handlePhotoSelect(e.target.files);});
  document.getElementById('btn-analyze').addEventListener('click',analyzePhotos);
  var drop=document.getElementById('photo-drop');
  if(drop){
    drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('drag-over');});
    drop.addEventListener('dragleave',function(){drop.classList.remove('drag-over');});
    drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('drag-over');handlePhotoSelect(e.dataTransfer.files);});
  }
  document.querySelectorAll('.bc-btn').forEach(function(btn){btn.addEventListener('click',function(){
    document.querySelectorAll('.bc-btn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');
    renderBlockModalities(parseInt(btn.dataset.count),(currentUser&&currentUser.settings?currentUser.settings.blockModalities:{})||{});
  });});
  document.getElementById('avoid-days').addEventListener('input',function(e){document.getElementById('days-label').textContent=e.target.value;});
  document.getElementById('btn-save-settings').addEventListener('click',saveSetting);
  document.getElementById('btn-add-sport').addEventListener('click',addSport);
  document.getElementById('new-sport').addEventListener('keydown',function(e){if(e.key==='Enter')addSport();});
  document.getElementById('modal-close').addEventListener('click',function(){document.getElementById('modal').classList.add('hidden');});
  document.getElementById('modal-overlay').addEventListener('click',function(){document.getElementById('modal').classList.add('hidden');});
});


