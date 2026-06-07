var API='';
var VERSION='...';
var token=localStorage.getItem('wod_token');
var currentUser=null,currentWorkouts=[],activeVariant=0;
var currentSport=localStorage.getItem('wod_sport')||'functional';
var pendingPhotos=[];
var currentTheme=localStorage.getItem('wod_theme')||'dark';
var exerciseCache=[];
var SESSION_TIMEOUT=5*60*1000; // 5 minutes

function markActivity(){
  if(token)localStorage.setItem('wod_last_activity',Date.now().toString());
}
function checkInactivity(){
  if(!token)return;
  var last=parseInt(localStorage.getItem('wod_last_activity')||'0');
  if(last===0){markActivity();return;}
  var elapsed=Date.now()-last;
  if(elapsed>SESSION_TIMEOUT){
    // Session expired
    token=null;currentUser=null;
    localStorage.removeItem('wod_token');
    localStorage.removeItem('wod_user');
    localStorage.removeItem('wod_last_activity');
    showToast('Session expired ('+Math.round(elapsed/60000)+' min inactive)','warning');
    setTimeout(function(){showAuth();},1500);
  }
}
['click','keydown','scroll','touchstart'].forEach(function(evt){
  document.addEventListener(evt,markActivity,{passive:true});
});
// Check on visibility change (user returns to app after being away)
document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible')checkInactivity();
});
// Check every 30 seconds
setInterval(checkInactivity,30000);

// Toast notifications
var toastTimer=null;
function showToast(msg,type){
  type=type||'success';
  var icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  var el=document.getElementById('toast');
  var iconEl=document.getElementById('toast-icon');
  var msgEl=document.getElementById('toast-msg');
  iconEl.textContent=icons[type]||icons.success;
  msgEl.textContent=msg;
  el.className='toast toast-'+type;
  // Force reflow
  el.offsetHeight;
  el.classList.add('visible');
  if(toastTimer)clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){el.classList.remove('visible');},3500);
}

// Sport configurations
var SPORTS={
  functional:{
    logo:'\u26A1',title:'FUNCTIONAL WOD',todayTitle:"TODAY'S WOD",
    themeColor:'#0d0f12',bodyClass:'sport-functional'
  },
  swimming:{
    logo:'\uD83C\uDFCA',title:'SWIM SESSION',todayTitle:"TODAY'S SESSION",
    themeColor:'#071a2e',bodyClass:'sport-swimming'
  }
};

function getSportConfig(){return SPORTS[currentSport]||SPORTS.functional;}

function applySportTheme(sport){
  currentSport=sport;
  var cfg=getSportConfig();
  // Body class
  document.body.className=cfg.bodyClass+' theme-'+currentTheme;
  // Meta theme
  var meta=document.getElementById('meta-theme');
  if(meta)meta.content=cfg.themeColor;
  // Auth screen
  var al=document.getElementById('auth-logo');if(al)al.textContent=cfg.logo;
  var at=document.getElementById('auth-title');if(at)at.textContent=cfg.title;
  // Nav
  var nl=document.getElementById('nav-logo');if(nl)nl.textContent=cfg.logo;
  var nt=document.getElementById('nav-title');if(nt)nt.textContent=cfg.title;
  // Today
  var tt=document.getElementById('today-title');if(tt)tt.textContent=cfg.todayTitle;
  // Update sport-specific category order for library
  document.title=cfg.title;
  // Page title
  document.title=cfg.title;
  // Highlight sport button
  document.querySelectorAll('.auth-sport-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.sport===sport);
  });
  localStorage.setItem('wod_sport',sport);
  // Show/hide swimming-specific settings
  var swimCard=document.getElementById('swim-rest-card');
  if(swimCard)swimCard.style.display=(sport==='swimming')?'':'none';
}

function applyTheme(theme){
  currentTheme=theme;localStorage.setItem('wod_theme',theme);
  document.body.classList.remove('theme-dark','theme-ambient','theme-dim');
  document.body.classList.add('theme-'+theme);
  document.querySelectorAll('.theme-btn').forEach(function(b){b.classList.toggle('active',b.dataset.theme===theme);});
}

function authHeader(){return token?{'Authorization':'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
async function apiCall(url,options){
  options=options||{};
  try{
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},15000);
    var res=await fetch(API+url,{method:options.method||'GET',headers:Object.assign({},authHeader(),options.headers||{}),body:options.body||undefined,signal:controller.signal});
    clearTimeout(timeout);
    var data=await res.json();
    if(res.status===401){logout();return null;}
    return{ok:res.ok,data:data,status:res.status};
  }catch(e){
    if(e.name==='AbortError')return{ok:false,data:{message:'Request timed out'},status:408};
    return{ok:false,data:{message:e.message||'Network error'},status:0};
  }
}

function showAuth(){
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  applySportTheme(currentSport);
}
function showApp(){
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).toUpperCase();
  if(currentUser){
    document.getElementById('nav-username').textContent=currentUser.name;
    document.getElementById('settings-user-info').textContent=currentUser.name+' \u00B7 '+currentUser.email+' \u00B7 '+currentSport+' \u00B7 v'+VERSION;
    loadUserSettings();
  }
  applySportTheme(currentSport);
  markActivity();
  loadToday();
}

async function login(){
  var email=document.getElementById('login-email').value.trim();
  var password=document.getElementById('login-password').value;
  showAuthError('');
  var btn=document.getElementById('btn-login');btn.textContent='Logging in...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
  var data=await r.json();
  btn.textContent='Login';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  showApp();
}
async function register(){
  var name=document.getElementById('reg-name').value.trim();
  var email=document.getElementById('reg-email').value.trim();
  var password=document.getElementById('reg-password').value;
  showAuthError('');
  if(password.length<6)return showAuthError('Password must be at least 6 characters');
  var btn=document.getElementById('btn-register');btn.textContent='Creating...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,email:email,password:password})});
  var data=await r.json();
  btn.textContent='Create account';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  showApp();
}
function logout(){
  localStorage.removeItem('wod_last_activity');
  token=null;currentUser=null;
  localStorage.removeItem('wod_token');localStorage.removeItem('wod_user');
  showAuth();
}
function showAuthError(msg){var el=document.getElementById('auth-error');el.textContent=msg;el.classList.toggle('hidden',!msg);}

function showResetForm(){
  document.getElementById('tab-login').classList.add('hidden');
  document.getElementById('tab-register').classList.add('hidden');
  document.getElementById('tab-reset').classList.remove('hidden');
  document.querySelector('.auth-tabs').style.display='none';
  showAuthError('');
}
function showLoginForm(){
  document.getElementById('tab-login').classList.remove('hidden');
  document.getElementById('tab-register').classList.add('hidden');
  document.getElementById('tab-reset').classList.add('hidden');
  document.querySelector('.auth-tabs').style.display='';
  document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='login');});
  showAuthError('');
}
async function resetPassword(){
  var email=document.getElementById('reset-email').value.trim();
  var pw=document.getElementById('reset-password').value;
  var confirm=document.getElementById('reset-confirm').value;
  showAuthError('');
  if(!email)return showAuthError('Enter your email');
  if(pw.length<6)return showAuthError('Password must be at least 6 characters');
  if(pw!==confirm)return showAuthError('Passwords do not match');
  var btn=document.getElementById('btn-reset');btn.textContent='Resetting...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,newPassword:pw})});
  var data=await r.json();
  btn.textContent='Reset Password';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  showLoginForm();
  document.getElementById('login-email').value=email;
  showAuthError('');
  showToast('Password updated! Login with your new password','success');
}

function modalityBadgeClass(m){
  m=(m||'').toUpperCase();
  if(m.includes('EMOM'))return'badge-emom';if(m.includes('OTM'))return'badge-otm';
  if(m.includes('AMRAP')&&!m.includes('MINI'))return'badge-amrap';if(m.includes('FOR TIME'))return'badge-fortime';
  if(m.includes('ROUNDS'))return'badge-rounds';if(m.includes('TABATA'))return'badge-tabata';
  if(m.includes('DESCENDING'))return'badge-descending';if(m.includes('ZONE'))return'badge-zones';
  if(m.includes('MINI'))return'badge-miniamrap';
  if(m.includes('SPRINT'))return'badge-sprint';if(m.includes('ENDUR'))return'badge-endurance';
  if(m.includes('TECH'))return'badge-technique';if(m.includes('INTERVAL'))return'badge-intervals';
  if(m.includes('EASY'))return'badge-easy';return'badge-rounds';
}
function catDot(cat){return'<span class="ex-category-dot dot-'+(cat||'lower')+'"></span>';}

function renderWorkout(workout,editable){
  if(!workout)return'<div class="empty-state"><h3>No workout</h3></div>';
  var html='<div class="workout-card">';
  if(workout.warmup&&workout.warmup.exercises&&workout.warmup.exercises.length){
    html+='<div class="card-header">';
    html+='<div class="card-header-left"><span class="card-badge badge-warmup">E.C.</span><span class="card-config">'+(workout.warmup.rounds||3)+' Rounds</span></div>';
    if(editable)html+='<button class="btn-edit-section" onclick="editWarmup()">edit</button>';
    html+='</div>';
    html+='<div class="exercise-table">'+workout.warmup.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+catDot(ex.category)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  }
  (workout.blocks||[]).forEach(function(block,bi){
    html+='<div class="section-label">Block '+block.label+'</div>';
    html+='<div class="card-header">';
    html+='<div class="card-header-left"><span class="card-badge '+modalityBadgeClass(block.modality)+'">'+block.modality+'</span><span class="card-config">'+(block.config||'')+'</span></div>';
    if(workout.source==='ai')html+='<span class="card-source-ai">AI</span>';
    if(editable)html+='<button class="btn-edit-section" onclick="editBlock('+bi+')">edit</button>';
    html+='</div>';
    html+='<div class="exercise-table">'+block.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+catDot(ex.category)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  });
  if(workout.pattern)html+='<div class="section-label" style="color:var(--accent);border-top:none">Pattern: '+workout.pattern+'</div>';
  return html+'</div>';
}
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
async function openManualBuilder(){
  var r=await apiCall("/api/exercises?sport="+currentSport);
  exerciseCache=(r&&r.data&&r.data.exercises)?r.data.exercises:[];
  var mods=currentSport==="swimming"?["SPRINT","ENDURANCE","TECHNIQUE","INTERVALS"]:["EMOM","OTM","AMRAP","ROUNDS","FOR TIME","TABATA"];
  window._manualMods=mods;window._blockCount=0;

  var h="<h3 style=\"margin-bottom:16px\">Create Workout</h3><div class=\"manual-builder\" id=\"manual-builder\">";
  h+="<div class=\"manual-section\"><div class=\"manual-section-header\"><span class=\"manual-section-title\">Warm-up</span>";
  h+="<div class=\"manual-row\"><label style=\"font-size:0.78rem;color:var(--muted)\">Rounds</label>";
  h+="<input type=\"number\" id=\"m-warmup-rounds\" value=\"3\" min=\"1\" max=\"10\" class=\"manual-input manual-input-sm\"></div></div>";
  h+="<div id=\"m-warmup-list\"></div>";
  h+="<button class=\"manual-btn-add\" data-action=\"add-ex\" data-target=\"warmup\">+ Add exercise</button></div>";
  h+="<div id=\"m-blocks-container\"></div>";
  h+="<button class=\"manual-btn-add\" data-action=\"add-block\" style=\"border-color:var(--accent);color:var(--accent)\">+ Add Block</button>";
  h+="<button class=\"btn-approve\" data-action=\"save-manual\" style=\"margin-top:12px\">Save Workout</button></div>";

  document.getElementById("modal-content").innerHTML=h;
  document.getElementById("modal").classList.remove("hidden");

  // Event delegation for manual builder
  document.getElementById("modal-content").addEventListener("click",handleManualClick);

  addManualExRow("warmup");
  addManualBlock();
}

function handleManualClick(e){
  var btn=e.target.closest("[data-action]");if(!btn)return;
  var action=btn.dataset.action;
  if(action==="add-ex")addManualExRow(btn.dataset.target);
  if(action==="add-block")addManualBlock();
  if(action==="remove-row"){var row=btn.closest(".manual-row");if(row)row.remove();}
  if(action==="remove-block"){var sec=btn.closest(".manual-section");if(sec)sec.remove();}
  if(action==="save-manual")saveManualWorkout();
}

function addManualExRow(target){
  var container=document.getElementById("m-"+target+"-list");if(!container)return;
  var div=document.createElement("div");div.className="manual-row";
  var dlId="dl-"+target+"-"+Date.now();
  div.innerHTML="<input class=\"manual-input m-ex-name\" list=\""+dlId+"\" placeholder=\"Exercise name\">"
    +"<datalist id=\""+dlId+"\">"+exerciseCache.map(function(e){return"<option value=\""+e.name+"\">";}).join("")+"</datalist>"
    +"<input class=\"manual-input manual-input-sm m-ex-reps\" placeholder=\"Reps\">"
    +"<button class=\"manual-btn-remove\" data-action=\"remove-row\">\u00d7</button>";
  container.appendChild(div);
}

function addManualBlock(){
  window._blockCount++;
  var label=String.fromCharCode(64+window._blockCount);
  var container=document.getElementById("m-blocks-container");
  var div=document.createElement("div");div.className="manual-section";div.id="m-block-"+label;
  div.innerHTML="<div class=\"manual-section-header\"><span class=\"manual-section-title\">Block "+label+"</span>"
    +"<button class=\"manual-btn-remove\" data-action=\"remove-block\" style=\"font-size:1.2rem\">\u00d7</button></div>"
    +"<div class=\"manual-row\"><select class=\"manual-select m-block-mod\">"+window._manualMods.map(function(m){return"<option>"+m+"</option>";}).join("")+"</select>"
    +"<input class=\"manual-input m-block-config\" placeholder=\"Config\"></div>"
    +"<div id=\"m-block-"+label+"-list\"></div>"
    +"<button class=\"manual-btn-add\" data-action=\"add-ex\" data-target=\"block-"+label+"\">+ Add exercise</button>";
  container.appendChild(div);
  addManualExRow("block-"+label);
  addManualExRow("block-"+label);
}

async function saveManualWorkout(){
  var warmupRounds=parseInt(document.getElementById("m-warmup-rounds").value)||1;
  var warmupExs=[];
  document.querySelectorAll("#m-warmup-list .manual-row").forEach(function(row){
    var name=row.querySelector(".m-ex-name").value.trim();
    var reps=row.querySelector(".m-ex-reps").value.trim();
    if(name){var cat="conditioning";var f=exerciseCache.find(function(e){return e.name===name;});if(f)cat=f.category;warmupExs.push({name:name,reps:reps,category:cat});}
  });
  var blocks=[];
  document.querySelectorAll("#m-blocks-container .manual-section").forEach(function(sec){
    var label=sec.querySelector(".manual-section-title").textContent.replace("Block ","");
    var mod=sec.querySelector(".m-block-mod").value;
    var config=sec.querySelector(".m-block-config").value;
    var exs=[];
    sec.querySelectorAll(".manual-row").forEach(function(row){
      var ne=row.querySelector(".m-ex-name");var re=row.querySelector(".m-ex-reps");
      if(ne&&re){var n=ne.value.trim();var r=re.value.trim();if(n){var cat="conditioning";var f=exerciseCache.find(function(e){return e.name===n;});if(f)cat=f.category;exs.push({name:n,reps:r,category:cat});}}
    });
    if(exs.length>0)blocks.push({label:label,modality:mod,config:config,exercises:exs});
  });
  if(warmupExs.length===0&&blocks.length===0){showToast("Add at least one exercise","error");return;}
  var r=await apiCall("/api/workouts/manual",{method:"POST",body:JSON.stringify({sport:currentSport,warmup:{rounds:warmupRounds,exercises:warmupExs},blocks:blocks,pattern:"MANUAL"})});
  document.getElementById("modal").classList.add("hidden");
  if(r&&r.ok){currentWorkouts.push(r.data.workout);resetTabs();showVariant(currentWorkouts.length-1);showToast("Manual workout created","success");}
  else{showToast(r&&r.data?r.data.message:"Error","error");}
}


function editWarmup(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var wu=w.warmup;
  var html='<h3 style="margin-bottom:12px">Edit Warm-up</h3>';
  html+='<label class="field">Rounds: <input type="number" id="edit-warmup-rounds" value="'+(wu.rounds||3)+'" min="1" max="10" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"></label>';
  html+='<div style="margin-top:12px">';
  wu.exercises.forEach(function(ex){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center"><input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button></div>';
  });
  html+='</div><button onclick="saveWarmupEdit()" class="btn-save-settings" style="margin-top:12px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;document.getElementById('modal').classList.remove('hidden');
}
async function saveWarmupEdit(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var rounds=parseInt(document.getElementById('edit-warmup-rounds').value)||3;
  var rows=document.querySelectorAll('#modal-content .edit-row');var exercises=[];
  rows.forEach(function(row){var n=row.querySelector('.edit-name').value.trim();var r=row.querySelector('.edit-reps').value.trim();if(n)exercises.push({name:n,reps:r,category:'conditioning'});});
  w.warmup={rounds:rounds,exercises:exercises};
  await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({warmup:w.warmup})});
  document.getElementById('modal').classList.add('hidden');showVariant(activeVariant);
  showToast('Warmup updated','success');
}
function editBlock(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;var block=w.blocks[bi];
  var html='<h3 style="margin-bottom:12px">Edit Block '+block.label+'</h3>';
  html+='<div style="display:flex;gap:8px;margin-bottom:12px"><select id="edit-block-modality" style="height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
  ['EMOM','OTM','AMRAP','FOR TIME','ROUNDS','TABATA','DESCENDING','ZONES'].forEach(function(m){html+='<option'+(block.modality===m?' selected':'')+'>'+m+'</option>';});
  html+='</select><input id="edit-block-config" value="'+(block.config||'')+'" placeholder="Config" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"></div>';
  html+='<div id="edit-block-exercises">';
  block.exercises.forEach(function(ex){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center"><input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button></div>';
  });
  html+='</div><button onclick="addEditRow()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 12px;cursor:pointer;margin-bottom:12px">+ Add</button>';
  html+='<button onclick="saveBlockEdit('+bi+')" class="btn-save-settings" style="margin-top:8px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;document.getElementById('modal').classList.remove('hidden');
}
function addEditRow(){
  var c=document.getElementById('edit-block-exercises');var d=document.createElement('div');d.className='edit-row';d.style='display:flex;gap:8px;margin-bottom:8px;align-items:center';
  d.innerHTML='<input class="edit-name" placeholder="Exercise" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" placeholder="Reps" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button>';
  c.appendChild(d);
}
async function saveBlockEdit(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;
  w.blocks[bi].modality=document.getElementById('edit-block-modality').value;
  w.blocks[bi].config=document.getElementById('edit-block-config').value;
  var rows=document.querySelectorAll('#edit-block-exercises .edit-row');var exercises=[];
  rows.forEach(function(row){var n=row.querySelector('.edit-name').value.trim();var r=row.querySelector('.edit-reps').value.trim();if(n)exercises.push({name:n,reps:r,category:'conditioning'});});
  w.blocks[bi].exercises=exercises;
  await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({blocks:w.blocks})});
  document.getElementById('modal').classList.add('hidden');showVariant(activeVariant);
  showToast('Block updated','success');
}

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
  document.getElementById('modal-content').innerHTML='<p class="eyebrow" style="margin-bottom:12px">'+w.date+'</p>'+renderWorkout(w,false);
  document.getElementById('modal').classList.remove('hidden');
}
async function deleteHistoryItem(id){
  if(!confirm('Delete this workout?'))return;
  var r=await apiCall('/api/workouts/'+id,{method:'DELETE'});
  if(r&&r.ok){var el=document.getElementById('hist-'+id);if(el)el.remove();delete _hCache[id];showToast('Workout deleted','info');}
}

async function loadLibrary(){
  var list=document.getElementById('exercise-list');
  list.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/exercises?sport='+currentSport);if(!r)return;
  var exercises=r.data.exercises||[];
  if(!exercises.length){list.innerHTML='<div class="empty-state"><h3>Empty Library</h3><p>Click Seed defaults</p></div>';return;}
  var cats={};exercises.forEach(function(ex){(cats[ex.category]=cats[ex.category]||[]).push(ex);});
  var catLabels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power',
    stroke:'Stroke',kick:'Kick',drill:'Drill',pull:'Pull',sprint:'Sprint',endurance:'Endurance',rest:'Rest'};
  var order=['lower','upper','core','conditioning','power'];
  var sorted=Object.keys(cats).sort(function(a,b){var ia=order.indexOf(a),ib=order.indexOf(b);return(ia<0?99:ia)-(ib<0?99:ib);});
  list.innerHTML=sorted.map(function(cat){
    return'<div class="ex-category-group"><div class="ex-cat-header">'+(catLabels[cat]||cat)+' <span class="ex-cat-count">'+cats[cat].length+'</span></div><div class="ex-cat-items">'+cats[cat].map(function(ex){
      return'<div class="ex-pill" id="ex-'+ex._id+'"><span class="ex-pill-name"><span class="ex-category-dot dot-'+ex.category+'"></span>'+ex.name+'</span><button class="ex-pill-delete" onclick="deleteExercise(\''+ex._id+'\')">x</button></div>';
    }).join('')+'</div></div>';
  }).join('');
}
async function addExercise(){var n=document.getElementById('ex-name').value.trim();var c=document.getElementById('ex-category').value;if(!n)return;await apiCall('/api/exercises',{method:'POST',body:JSON.stringify({name:n,category:c,sport:currentSport})});document.getElementById('ex-name').value='';loadLibrary();showToast('Exercise added','success');}
async function deleteExercise(id){if(!confirm('Remove this exercise?'))return;await apiCall('/api/exercises/'+id,{method:'DELETE'});loadLibrary();showToast('Exercise removed','info');}
async function seedDefaults(){
  var btn=document.getElementById('btn-seed');btn.textContent='Seeding...';btn.disabled=true;
  var r=await apiCall('/api/exercises/seed',{method:'POST',body:JSON.stringify({sport:currentSport})});
  if(r&&r.ok){btn.textContent='Seeded '+r.data.count;loadLibrary();showToast(r.data.count+' exercises loaded','success');}
  else{btn.textContent='Error';showToast(r&&r.data?r.data.message:'Seed failed','error');}
  setTimeout(function(){btn.textContent='Seed defaults';btn.disabled=false;},3000);
}
async function loadCategories(){
  var r=await apiCall('/api/exercises/categories?sport='+currentSport);if(!r||!r.ok)return;
  var sel=document.getElementById('ex-category');var labels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power'};
  var cur=sel.value;sel.innerHTML=r.data.categories.map(function(c){return'<option value="'+c+'">'+(labels[c]||c)+'</option>';}).join('')+'<option value="__new__">+ New category...</option>';
  if(r.data.categories.includes(cur))sel.value=cur;
}
function handleCategoryChange(){
  var sel=document.getElementById('ex-category');
  if(sel.value==='__new__'){var nc=prompt('New category name:');if(nc&&nc.trim()){var v=nc.trim().toLowerCase();var o=document.createElement('option');o.value=v;o.textContent=nc.trim();sel.insertBefore(o,sel.querySelector('option[value="__new__"]'));sel.value=v;}else{sel.value=sel.options[0].value;}}
}
function togglePhotoPanel(){document.getElementById('photo-panel').classList.toggle('hidden');}
function handlePhotoSelect(files){
  pendingPhotos=[];var preview=document.getElementById('photo-preview');preview.innerHTML='';
  Array.from(files).forEach(function(file){var reader=new FileReader();reader.onload=function(e){var data=e.target.result.split(',')[1];pendingPhotos.push({data:data,mediaType:file.type||'image/jpeg'});preview.innerHTML+='<div class="photo-thumb"><img src="'+e.target.result+'"><span>'+file.name+'</span></div>';document.getElementById('btn-analyze').disabled=false;};reader.readAsDataURL(file);});
}
async function analyzePhotos(){
  if(!pendingPhotos.length)return;var btn=document.getElementById('btn-analyze');btn.textContent='Analyzing...';btn.disabled=true;
  var r=await apiCall('/api/upload/photo',{method:'POST',body:JSON.stringify({images:pendingPhotos,sport:currentSport})});
  btn.textContent='Analyze with AI';btn.disabled=false;var results=document.getElementById('photo-results');
  if(!r||!r.ok){results.innerHTML='<p style="color:var(--accent2)">'+(r&&r.data?r.data.message:'Error')+'</p>';results.classList.remove('hidden');return;}
  results.innerHTML='<div class="photo-result-box"><p style="color:var(--green);font-weight:700">Done!</p><p>'+(r.data.added?r.data.added.length:0)+' new, '+(r.data.skipped?r.data.skipped.length:0)+' existing</p></div>';
  results.classList.remove('hidden');loadLibrary();
}

function loadUserSettings(){
  if(!currentUser||!currentUser.settings)return;var s=currentUser.settings;
  document.querySelectorAll('.bc-btn').forEach(function(btn){btn.classList.toggle('active',parseInt(btn.dataset.count)===(s.blockCount||2));});
  renderBlockModalities(s.blockCount||2,s.blockModalities||{});
  if(s.theme){currentTheme=s.theme;applyTheme(s.theme);}
  // Load swim rest times
  var srt=s.swimRestTimes||{};
  if(document.getElementById('rest-50')){
    document.getElementById('rest-50').value=srt.d50||30;
    document.getElementById('rest-100').value=srt.d100||45;
    document.getElementById('rest-200').value=srt.d200||60;
    document.getElementById('rest-300').value=srt.d300||75;
    document.getElementById('rest-400').value=srt.d400||90;
    document.getElementById('rest-500').value=srt.d500||120;
    document.getElementById('pool-length').value=s.poolLength||25;
  }
  document.getElementById('avoid-days').value=s.avoidRepeatDays||7;document.getElementById('days-label').textContent=s.avoidRepeatDays||7;
}
function renderBlockModalities(count,mods){
  var labels=['A','B','C','D'].slice(0,count);
  var opts=['random','EMOM','OTM','AMRAP','ROUNDS','FOR TIME','TABATA'];
  document.getElementById('block-modalities').innerHTML=labels.map(function(label){
    return'<label class="field" style="margin-top:12px"><span>Block '+label+'</span><select class="block-mod-select" data-label="'+label+'">'+opts.map(function(o){return'<option value="'+o+'"'+((mods[label]||'random')===o?' selected':'')+'>'+(o==='random'?'Random':o)+'</option>';}).join('')+'</select></label>';
  }).join('');
}
async function saveSetting(){
  var bc=parseInt((document.querySelector('.bc-btn.active')||{}).dataset.count)||2;var bm={};
  document.querySelectorAll('.block-mod-select').forEach(function(sel){bm[sel.dataset.label]=sel.value;});
  var ad=parseInt(document.getElementById('avoid-days').value);
  var swimRestTimes=null;
  if(currentSport==='swimming'){
    swimRestTimes={
      d50:parseInt(document.getElementById('rest-50').value)||30,
      d100:parseInt(document.getElementById('rest-100').value)||45,
      d200:parseInt(document.getElementById('rest-200').value)||60,
      d300:parseInt(document.getElementById('rest-300').value)||75,
      d400:parseInt(document.getElementById('rest-400').value)||90,
      d500:parseInt(document.getElementById('rest-500').value)||120
    };
  }
  var poolLength=parseInt(document.getElementById('pool-length').value)||25;
  var r=await apiCall('/api/auth/settings',{method:'PUT',body:JSON.stringify({blockCount:bc,blockModalities:bm,avoidRepeatDays:ad,theme:currentTheme,poolLength:poolLength,swimRestTimes:swimRestTimes})});
  if(r&&r.ok){currentUser.settings=r.data.settings;localStorage.setItem('wod_user',JSON.stringify(currentUser));showToast('Settings saved','success');}
}

function switchView(name){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.querySelectorAll('.nav-btn[data-view]').forEach(function(b){b.classList.remove('active');});
  document.getElementById('view-'+name).classList.add('active');
  document.querySelector('[data-view="'+name+'"]').classList.add('active');
  if(name==='history')loadHistory();if(name==='library'){loadLibrary();loadCategories();}
}

// VERSION CHECK + CACHE BUST
async function checkVersion(){
  try{
    var r=await fetch(API+'/api/health');var d=await r.json();
    if(d.version){
      var stored=localStorage.getItem('wod_version');
      if(stored&&stored!==d.version){
        // New version detected — force logout + clean reload
        localStorage.setItem('wod_version',d.version);
        localStorage.removeItem('wod_token');
        localStorage.removeItem('wod_user');
        localStorage.removeItem('wod_last_activity');
        token=null;currentUser=null;
        if('caches' in window){var keys=await caches.keys();await Promise.all(keys.map(function(k){return caches.delete(k);}));}
        if('serviceWorker' in navigator){
          var regs=await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(function(r){return r.unregister();}));
        }
        window.location.replace(window.location.href);
        return;
      }
      localStorage.setItem('wod_version',d.version);
      VERSION=d.version;
      document.querySelectorAll('.version-label').forEach(function(el){el.textContent='v'+d.version;});
    }
  }catch(e){}
}

document.addEventListener('DOMContentLoaded',function(){
  // Apply theme immediately
  applySportTheme(currentSport);

  // Register SW
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(function(reg){
      // Check for updates every 60 seconds
      setInterval(function(){reg.update();},60000);
    }).catch(function(){});
    // Listen for SW update message - auto reload
    navigator.serviceWorker.addEventListener('message',function(e){
      if(e.data&&e.data.type==='SW_UPDATED'){window.location.reload(true);}
    });
  }

  // Check inactivity immediately on load
  checkInactivity();
  // Check version (cache bust if new)
  checkVersion();

  // Auth sport selector
  document.querySelectorAll('.auth-sport-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      applySportTheme(btn.dataset.sport);
    });
  });

  // Restore session
  var saved=localStorage.getItem('wod_user');
  if(token&&saved){currentUser=JSON.parse(saved);showApp();}else{showAuth();}

  // Auth tabs
  document.querySelectorAll('.auth-tab').forEach(function(tab){tab.addEventListener('click',function(){
    document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.remove('active');});tab.classList.add('active');
    document.getElementById('tab-login').classList.toggle('hidden',tab.dataset.tab!=='login');
    document.getElementById('tab-register').classList.toggle('hidden',tab.dataset.tab!=='register');showAuthError('');
  });});
  document.getElementById('btn-login').addEventListener('click',login);
  document.getElementById('login-password').addEventListener('keydown',function(e){if(e.key==='Enter')login();});
  document.getElementById('btn-register').addEventListener('click',register);
  document.getElementById('btn-show-reset').addEventListener('click',showResetForm);
  document.getElementById('btn-back-login').addEventListener('click',showLoginForm);
  document.getElementById('btn-reset').addEventListener('click',resetPassword);
  document.getElementById('reset-confirm').addEventListener('keydown',function(e){if(e.key==='Enter')resetPassword();});
  document.getElementById('btn-logout').addEventListener('click',logout);
  document.querySelectorAll('.nav-btn[data-view]').forEach(function(btn){btn.addEventListener('click',function(){switchView(btn.dataset.view);});});
  document.querySelectorAll('.vtab').forEach(function(tab,i){tab.addEventListener('click',function(){showVariant(i);});});
  document.getElementById('btn-approve').addEventListener('click',approveWorkout);
  document.getElementById('btn-regenerate').addEventListener('click',regenerateWorkouts);
  document.getElementById('btn-ai').addEventListener('click',generateAiVariant);
  document.getElementById('btn-manual').addEventListener('click',openManualBuilder);
  document.querySelectorAll('.theme-btn').forEach(function(btn){btn.addEventListener('click',function(){applyTheme(btn.dataset.theme);});});
  document.getElementById('btn-add-ex').addEventListener('click',addExercise);
  document.getElementById('ex-name').addEventListener('keydown',function(e){if(e.key==='Enter')addExercise();});
  document.getElementById('btn-seed').addEventListener('click',seedDefaults);
  document.getElementById('ex-category').addEventListener('change',handleCategoryChange);
  document.getElementById('btn-upload-photo').addEventListener('click',togglePhotoPanel);
  document.getElementById('photo-input').addEventListener('change',function(e){handlePhotoSelect(e.target.files);});
  document.getElementById('btn-analyze').addEventListener('click',analyzePhotos);
  var drop=document.getElementById('photo-drop');
  if(drop){drop.addEventListener('dragover',function(e){e.preventDefault();drop.classList.add('drag-over');});drop.addEventListener('dragleave',function(){drop.classList.remove('drag-over');});drop.addEventListener('drop',function(e){e.preventDefault();drop.classList.remove('drag-over');handlePhotoSelect(e.dataTransfer.files);});}
  document.querySelectorAll('.bc-btn').forEach(function(btn){btn.addEventListener('click',function(){document.querySelectorAll('.bc-btn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');renderBlockModalities(parseInt(btn.dataset.count),(currentUser&&currentUser.settings?currentUser.settings.blockModalities:{})||{});});});
  document.getElementById('avoid-days').addEventListener('input',function(e){document.getElementById('days-label').textContent=e.target.value;});
  document.getElementById('btn-save-settings').addEventListener('click',saveSetting);
  document.getElementById('modal-close').addEventListener('click',function(){document.getElementById('modal').classList.add('hidden');});
  document.getElementById('modal-overlay').addEventListener('click',function(){document.getElementById('modal').classList.add('hidden');});
});
















