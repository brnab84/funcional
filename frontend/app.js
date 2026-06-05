const API='';
let token=localStorage.getItem('wod_token');
let currentUser=null,currentWorkouts=[],activeVariant=1,currentSport='functional';
function authHeader(){return token?{'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
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
  if(currentUser){document.getElementById('settings-user-info').textContent=`${currentUser.name} · ${currentUser.email}`;loadUserSettings();}
  loadToday();
}
async function login(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  showAuthError('');
  const r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
  const data=await r.json();
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
  const r=await fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
  const data=await r.json();
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
function catDot(cat){return`<span class="ex-category-dot dot-${cat||'lower'}"></span>`;}
function renderWorkout(workout){
  if(!workout)return`<div class="empty-state"><h3>No workout</h3></div>`;
  let html=`<div class="workout-card">`;
  if(workout.warmup?.exercises?.length){
    html+=`<div class="card-header"><div class="card-header-left"><span class="card-badge badge-warmup">E.C.</span><span class="card-config">${workout.warmup.rounds||3} Rounds</span></div></div>
    <div class="exercise-table">${workout.warmup.exercises.map((ex,i)=>`<div class="ex-row"><span class="ex-num">${String(i+1).padStart(2,'0')}</span><span class="ex-name">${catDot(ex.category)}${ex.name}</span><span class="ex-reps">${ex.reps||''}</span></div>`).join('')}</div>`;
  }
  (workout.blocks||[]).forEach(block=>{
    html+=`<div class="section-label">Block ${block.label}</div>
    <div class="card-header"><div class="card-header-left"><span class="card-badge ${modalityBadgeClass(block.modality)}">${block.modality}</span><span class="card-config">${block.config||''}</span></div>${workout.source==='ai'?'<span class="card-source-ai">AI</span>':''}</div>
    <div class="exercise-table">${block.exercises.map((ex,i)=>`<div class="ex-row"><span class="ex-num">${String(i+1).padStart(2,'0')}</span><span class="ex-name">${catDot(ex.category)}${ex.name}</span><span class="ex-reps">${ex.reps||''}</span></div>`).join('')}</div>`;
  });
  if(workout.pattern)html+=`<div class="section-label" style="color:var(--accent);border-top:none">Pattern: ${workout.pattern}</div>`;
  return html+`</div>`;
}
async function loadToday(){
  const display=document.getElementById('workout-display');
  display.innerHTML=`<div class="loading-state"><div class="spinner"></div><p>Generating workouts...</p></div>`;
  const r=await apiCall(`/api/workouts/today?sport=${currentSport}`);
  if(!r)return;
  currentWorkouts=r.data.workouts||[];
  if(!currentWorkouts.length){display.innerHTML=`<div class="empty-state"><h3>No workouts</h3><p>Go to Library → Seed defaults</p></div>`;return;}
  updateVariantTabs();showVariant(1);
}
function updateVariantTabs(){
  document.querySelectorAll('.vtab').forEach((tab,i)=>{
    const w=currentWorkouts.find(w=>w.variant===i+1);
    tab.classList.remove('active','approved');
    if(w?.status==='approved')tab.classList.add('approved');
  });
}
function showVariant(v){
  activeVariant=v;
  document.querySelectorAll('.vtab').forEach((tab,i)=>tab.classList.toggle('active',i+1===v));
  const w=currentWorkouts.find(w=>w.variant===v);
  document.getElementById('workout-display').innerHTML=renderWorkout(w);
  const btn=document.getElementById('btn-approve');
  btn.textContent=w?.status==='approved'?'✓ Approved':'✓ Approve this workout';
  btn.disabled=w?.status==='approved';
}
async function approveWorkout(){
  const w=currentWorkouts.find(w=>w.variant===activeVariant);if(!w)return;
  const btn=document.getElementById('btn-approve');btn.disabled=true;btn.textContent='Saving...';
  const r=await apiCall(`/api/workouts/${w._id}/approve`,{method:'PUT'});if(!r)return;
  currentWorkouts=currentWorkouts.map(cw=>({...cw,status:cw._id===w._id?'approved':(cw.status==='approved'?'rejected':cw.status)}));
  updateVariantTabs();btn.textContent='✓ Approved';showAiStatus('Saved to history!');setTimeout(hideAiStatus,3000);
}
async function generateAiVariant(){
  const btn=document.getElementById('btn-ai');btn.disabled=true;showAiStatus('Asking AI coach...');
  const r=await apiCall('/api/workouts/ai',{method:'POST',body:JSON.stringify({sport:currentSport,variant:3})});
  btn.disabled=false;
  if(!r||!r.ok){showAiStatus((r?.data?.message||'AI error')+' — using local.',true);setTimeout(hideAiStatus,5000);return;}
  const idx=currentWorkouts.findIndex(w=>w.variant===3);
  if(idx>=0)currentWorkouts[idx]=r.data.workout;else currentWorkouts.push(r.data.workout);
  document.querySelectorAll('.vtab')[2].textContent='AI Option';showVariant(3);showAiStatus('AI workout ready!');setTimeout(hideAiStatus,4000);
}
function showAiStatus(msg,isError=false){const el=document.getElementById('ai-status');el.textContent=msg;el.className=`ai-status${isError?' error':''}`;}
function hideAiStatus(){document.getElementById('ai-status').className='ai-status hidden';}
async function loadHistory(page=1){
  const list=document.getElementById('history-list');
  list.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  const[hRes,sRes]=await Promise.all([apiCall(`/api/workouts/history?sport=${currentSport}&page=${page}&limit=20`),apiCall(`/api/workouts/stats?sport=${currentSport}`)]);
  if(!hRes)return;
  document.getElementById('history-stats').innerHTML=`<span class="stat-chip">Total: <span>${sRes?.data?.total||0}</span></span><span class="stat-chip">This month: <span>${sRes?.data?.lastMonth||0}</span></span>`;
  if(!hRes.data.workouts?.length){list.innerHTML=`<div class="empty-state"><h3>No History Yet</h3><p>Approve a workout to start</p></div>`;return;}
  list.innerHTML=hRes.data.workouts.map(w=>`<button class="history-item" onclick="openHistoryModal('${w._id}')"><span class="hist-date">${w.date}</span><div class="hist-modalities">${(w.blocks||[]).map(b=>`<span class="hist-badge">${b.modality}</span>`).join('')}${w.source==='ai'?'<span class="hist-badge" style="color:var(--blue)">AI</span>':''}${w.pattern?`<span class="hist-badge">${w.pattern}</span>`:''}</div><span class="hist-arrow">›</span></button>`).join('');
  document.getElementById('history-pagination').innerHTML=hRes.data.pages>1?Array.from({length:hRes.data.pages},(_,i)=>`<button class="page-btn ${i+1===page?'active':''}" onclick="loadHistory(${i+1})">${i+1}</button>`).join(''):'';
}
const _hCache={};
async function openHistoryModal(id){
  if(!_hCache[id]){const r=await apiCall(`/api/workouts/history?sport=${currentSport}&limit=100`);if(r?.data?.workouts)r.data.workouts.forEach(w=>_hCache[w._id]=w);}
  const w=_hCache[id];if(!w)return;
  document.getElementById('modal-content').innerHTML=`<p class="eyebrow" style="margin-bottom:12px">${w.date}</p>${renderWorkout(w)}`;
  document.getElementById('modal').classList.remove('hidden');
}
async function loadLibrary(){
  const list=document.getElementById('exercise-list');
  list.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  const r=await apiCall(`/api/exercises?sport=${currentSport}`);if(!r)return;
  const exercises=r.data.exercises||[];
  if(!exercises.length){list.innerHTML=`<div class="empty-state"><h3>Empty Library</h3><p>Click "Seed defaults"</p></div>`;return;}
  list.innerHTML=exercises.map(ex=>`<div class="ex-pill" id="ex-${ex._id}"><span class="ex-pill-name"><span class="ex-category-dot dot-${ex.category}"></span>${ex.name}</span><button class="ex-pill-delete" onclick="deleteExercise('${ex._id}')">×</button></div>`).join('');
}
async function addExercise(){
  const name=document.getElementById('ex-name').value.trim();const category=document.getElementById('ex-category').value;if(!name)return;
  await apiCall('/api/exercises',{method:'POST',body:JSON.stringify({name,category,sport:currentSport})});
  document.getElementById('ex-name').value='';loadLibrary();
}
async function deleteExercise(id){await apiCall(`/api/exercises/${id}`,{method:'DELETE'});document.getElementById(`ex-${id}`)?.remove();}
async function seedDefaults(){
  const btn=document.getElementById('btn-seed');btn.textContent='Seeding...';btn.disabled=true;
  const r=await apiCall('/api/exercises/seed',{method:'POST',body:JSON.stringify({sport:currentSport})});
  loadLibrary();btn.textContent=r?.data?.message==='Already seeded'?'Already seeded':'✓ Seeded';
  setTimeout(()=>{btn.textContent='Seed defaults';btn.disabled=false;},2000);
}
function loadUserSettings(){
  if(!currentUser?.settings)return;
  const s=currentUser.settings;
  const count=s.blockCount||2;
  document.querySelectorAll('.bc-btn').forEach(btn=>btn.classList.toggle('active',parseInt(btn.dataset.count)===count));
  renderBlockModalities(count,s.blockModalities||{});
  const days=s.avoidRepeatDays||7;
  document.getElementById('avoid-days').value=days;document.getElementById('days-label').textContent=days;
  renderSportList();
}
function renderBlockModalities(count,modalities){
  const labels=['A','B','C','D'].slice(0,count);
  const opts=['random','EMOM','OTM','AMRAP','ROUNDS','FOR TIME','TABATA'];
  document.getElementById('block-modalities').innerHTML=labels.map(label=>`<label class="field" style="margin-top:10px"><span>Block ${label} modality</span><select class="block-mod-select" data-label="${label}">${opts.map(o=>`<option value="${o}" ${(modalities[label]||'random')===o?'selected':''}>${o==='random'?'Random':o}</option>`).join('')}</select></label>`).join('');
}
function renderSportList(){
  document.getElementById('sport-list').innerHTML=(currentUser?.sports||[]).map(s=>`<div class="sport-pill"><span class="ex-category-dot" style="background:var(--accent)"></span>${s.type}</div>`).join('');
}
async function saveSetting(){
  const blockCount=parseInt(document.querySelector('.bc-btn.active')?.dataset.count||2);
  const blockModalities={};
  document.querySelectorAll('.block-mod-select').forEach(sel=>blockModalities[sel.dataset.label]=sel.value);
  const avoidRepeatDays=parseInt(document.getElementById('avoid-days').value);
  const r=await apiCall('/api/auth/settings',{method:'PUT',body:JSON.stringify({blockCount,blockModalities,avoidRepeatDays})});
  if(r?.ok){currentUser.settings=r.data.settings;localStorage.setItem('wod_user',JSON.stringify(currentUser));const st=document.getElementById('settings-status');st.textContent='✓ Saved';st.className='settings-status';setTimeout(()=>st.className='settings-status hidden',2500);}
}
async function addSport(){
  const sport=document.getElementById('new-sport').value.trim().toLowerCase();if(!sport)return;
  const r=await apiCall('/api/auth/add-sport',{method:'POST',body:JSON.stringify({sport})});
  if(r?.ok){currentUser.sports=r.data.sports;localStorage.setItem('wod_user',JSON.stringify(currentUser));document.getElementById('new-sport').value='';const sel=document.getElementById('sport-selector');if(!sel.querySelector(`option[value="${sport}"]`)){const opt=document.createElement('option');opt.value=sport;opt.textContent=sport.charAt(0).toUpperCase()+sport.slice(1);sel.appendChild(opt);}renderSportList();}
}
function switchView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn[data-view]').forEach(b=>b.classList.remove('active'));
  document.getElementById(`view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`).classList.add('active');
  if(name==='history')loadHistory();if(name==='library')loadLibrary();
}
document.addEventListener('DOMContentLoaded',()=>{
  const saved=localStorage.getItem('wod_user');
  if(token&&saved){currentUser=JSON.parse(saved);showApp();}else{showAuth();}
  document.querySelectorAll('.auth-tab').forEach(tab=>tab.addEventListener('click',()=>{
    document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));tab.classList.add('active');
    document.getElementById('tab-login').classList.toggle('hidden',tab.dataset.tab!=='login');
    document.getElementById('tab-register').classList.toggle('hidden',tab.dataset.tab!=='register');showAuthError('');
  }));
  document.getElementById('btn-login').addEventListener('click',login);
  document.getElementById('login-password').addEventListener('keydown',e=>{if(e.key==='Enter')login();});
  document.getElementById('btn-register').addEventListener('click',register);
  document.getElementById('btn-logout').addEventListener('click',logout);
  document.querySelectorAll('.nav-btn[data-view]').forEach(btn=>btn.addEventListener('click',()=>switchView(btn.dataset.view)));
  document.getElementById('sport-selector').addEventListener('change',e=>{
    currentSport=e.target.value;
    const view=document.querySelector('.view.active')?.id?.replace('view-','');
    if(view==='today')loadToday();if(view==='history')loadHistory();if(view==='library')loadLibrary();
  });
  document.querySelectorAll('.vtab').forEach((tab,i)=>tab.addEventListener('click',()=>showVariant(i+1)));
  document.getElementById('btn-approve').addEventListener('click',approveWorkout);
  document.getElementById('btn-regenerate').addEventListener('click',async()=>{
    await Promise.all(currentWorkouts.map(w=>apiCall(`/api/workouts/${w._id}/reject`,{method:'PUT'})));
    currentWorkouts=[];loadToday();
  });
  document.getElementById('btn-ai').addEventListener('click',generateAiVariant);
  document.getElementById('btn-add-ex').addEventListener('click',addExercise);
  document.getElementById('ex-name').addEventListener('keydown',e=>{if(e.key==='Enter')addExercise();});
  document.getElementById('btn-seed').addEventListener('click',seedDefaults);
  document.querySelectorAll('.bc-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.bc-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
    renderBlockModalities(parseInt(btn.dataset.count),currentUser?.settings?.blockModalities||{});
  }));
  document.getElementById('avoid-days').addEventListener('input',e=>document.getElementById('days-label').textContent=e.target.value);
  document.getElementById('btn-save-settings').addEventListener('click',saveSetting);
  document.getElementById('btn-add-sport').addEventListener('click',addSport);
  document.getElementById('new-sport').addEventListener('keydown',e=>{if(e.key==='Enter')addSport();});
  document.getElementById('modal-close').addEventListener('click',()=>document.getElementById('modal').classList.add('hidden'));
  document.getElementById('modal-overlay').addEventListener('click',()=>document.getElementById('modal').classList.add('hidden'));
});
