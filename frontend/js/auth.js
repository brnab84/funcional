// auth.js — part of Functional WOD frontend
function showAuth(){
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  applySportTheme(currentSport);
}
function showApp(){
  // Drop a consumed ?invite= param so reloading while logged in doesn't re-open registration
  try{var _u=new URL(window.location.href);if(_u.searchParams.has('invite')){_u.searchParams.delete('invite');window.history.replaceState({},document.title,_u.pathname+_u.search+_u.hash);}}catch(e){}
  window.__inviteCode=null;
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('today-date').textContent=new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'}).toUpperCase();
  if(currentUser){
    document.getElementById('nav-username').textContent=currentUser.name;
    var adminBtn=document.getElementById('nav-admin');
    if(adminBtn)adminBtn.style.display=(currentUser.role==='admin')?'':'none';
    var coachBtn=document.getElementById('nav-coach');
    if(coachBtn)coachBtn.style.display=(currentUser.role==='coach'||currentUser.role==='admin')?'':'none';
    var assignedBtn=document.getElementById('nav-assigned');
    if(assignedBtn)assignedBtn.style.display=(currentUser.coachId)?'':'none';
    // Athletes linked to a coach only follow assigned workouts \u2014 hide self-generation views
    var coached=isCoachedAthlete();
    var todayNav=document.querySelector('.nav-btn[data-view="today"]');
    var libNav=document.querySelector('.nav-btn[data-view="library"]');
    var setNav=document.querySelector('.nav-btn[data-view="settings"]');
    if(todayNav)todayNav.style.display=coached?'none':'';
    if(libNav)libNav.style.display=coached?'none':'';
    if(setNav)setNav.style.display=coached?'none':'';
    var roleLabel=currentUser.role==='admin'?'Admin':currentUser.role==='coach'?'Profesor':(currentUser.coachId?'Alumno (con profesor)':'Atleta (entrena solo)');
    document.getElementById('settings-user-info').textContent=currentUser.name+' \u00B7 '+roleLabel+' \u00B7 '+currentUser.email+' \u00B7 v'+VERSION;
    loadUserSettings();
  }
  applySportTheme(currentSport);
  markActivity();
  if(isCoachedAthlete()){switchView('assigned');}else{loadToday();}
}
// True for an athlete who has been linked to a coach (not coaches/admins)
function isCoachedAthlete(){
  return !!(currentUser&&currentUser.coachId&&currentUser.role!=='coach'&&currentUser.role!=='admin');
}

async function login(){
  var email=document.getElementById('login-email').value.trim();
  var password=document.getElementById('login-password').value;
  showAuthError('');
  var btn=document.getElementById('btn-login');btn.textContent='Logging in...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
  var data=await r.json();
  btn.textContent='Login';btn.disabled=false;
  if(!r.ok){
    if(r.status===403&&data.needsVerification){showVerifyForm(data.email);return;}
    return showAuthError(data.message);
  }
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  showApp();
}
async function register(){
  var name=document.getElementById('reg-name').value.trim();
  var email=document.getElementById('reg-email').value.trim();
  var password=document.getElementById('reg-password').value;
  showAuthError('');
  var pwErr=passwordError(password);
  if(pwErr)return showAuthError(pwErr);
  var roleBtn=document.querySelector('.auth-role-btn.active');
  var role=roleBtn?roleBtn.dataset.role:'athlete';
  var body={name:name,email:email,password:password};
  if(window.__inviteCode){body.inviteCode=window.__inviteCode;}else{body.role=role;}
  var btn=document.getElementById('btn-register');btn.textContent='Creating...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  var data=await r.json();
  btn.textContent='Create account';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  if(data.needsVerification){showVerifyForm(data.email,data.mailSent);return;}
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

// Password policy (mirrors backend utils/password.js): 8+ chars, lower+upper+number
function passwordError(pw){
  if(!pw||pw.length<8)return'Password must be at least 8 characters';
  if(!/[a-z]/.test(pw))return'Add a lowercase letter';
  if(!/[A-Z]/.test(pw))return'Add an uppercase letter';
  if(!/[0-9]/.test(pw))return'Add a number';
  return null;
}
function renderPwHints(pw,id){
  var el=document.getElementById(id);if(!el)return;
  pw=pw||'';
  var rules=[
    {ok:pw.length>=8,t:'8+ characters'},
    {ok:/[a-z]/.test(pw)&&/[A-Z]/.test(pw),t:'Upper & lowercase'},
    {ok:/[0-9]/.test(pw),t:'A number'}
  ];
  el.innerHTML=rules.map(function(r){return'<span class="pw-rule '+(r.ok?'ok':'')+'">'+(r.ok?'✓':'○')+' '+r.t+'</span>';}).join('');
}

// Invite link: validate the coach code, then switch to a locked athlete registration
async function handleInvite(code){
  try{
    var r=await fetch(API+'/api/auth/invite/'+encodeURIComponent(code));
    var data=await r.json();
    if(!r.ok){showToast('Invite link invalid or expired','error');return;}
    window.__inviteCode=code;
    document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='register');});
    document.getElementById('tab-login').classList.add('hidden');
    document.getElementById('tab-register').classList.remove('hidden');
    var rs=document.getElementById('auth-role-selector');if(rs)rs.style.display='none';
    var banner=document.getElementById('invite-banner');
    if(banner){banner.textContent='Invited by '+data.coachName+' — create your athlete account';banner.classList.remove('hidden');}
  }catch(e){}
}

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
  var tv=document.getElementById('tab-verify');if(tv)tv.classList.add('hidden');
  document.querySelector('.auth-tabs').style.display='';
  document.querySelectorAll('.auth-tab').forEach(function(t){t.classList.toggle('active',t.dataset.tab==='login');});
  showAuthError('');
}

// ── Email verification flow ──
function showVerifyForm(email,mailSent){
  window.__verifyEmail=email;
  document.getElementById('tab-login').classList.add('hidden');
  document.getElementById('tab-register').classList.add('hidden');
  document.getElementById('tab-reset').classList.add('hidden');
  document.getElementById('tab-verify').classList.remove('hidden');
  var tabs=document.querySelector('.auth-tabs');if(tabs)tabs.style.display='none';
  var msg=document.getElementById('verify-msg');
  if(msg)msg.textContent=(mailSent===false)
    ? 'We could not send the email. Tap "Resend code" to try again.'
    : 'We emailed a 6-digit code to '+email+'. Enter it to activate your account.';
  showAuthError('');
  var ci=document.getElementById('verify-code');if(ci){ci.value='';ci.focus();}
}

async function verifyCode(){
  var code=(document.getElementById('verify-code').value||'').trim();
  if(code.length<6)return showAuthError('Enter the 6-digit code');
  showAuthError('');
  var btn=document.getElementById('btn-verify');btn.textContent='Verifying...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:window.__verifyEmail,code:code})});
  var data=await r.json();
  btn.textContent='Verify & enter';btn.disabled=false;
  if(!r.ok)return showAuthError(data.message);
  token=data.token;currentUser=data.user;
  localStorage.setItem('wod_token',token);localStorage.setItem('wod_user',JSON.stringify(currentUser));
  var tabs=document.querySelector('.auth-tabs');if(tabs)tabs.style.display='';
  showApp();
}

async function resendCode(){
  if(!window.__verifyEmail)return;
  var btn=document.getElementById('btn-resend-code');btn.disabled=true;btn.textContent='Sending...';
  var r=await fetch(API+'/api/auth/resend-code',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:window.__verifyEmail})});
  var data=await r.json();
  btn.disabled=false;btn.textContent='Resend code';
  if(!r.ok)return showAuthError(data.message);
  showToast('Code sent — check your email','success');
}
async function resetPassword(){
  var email=document.getElementById('reset-email').value.trim();
  var pw=document.getElementById('reset-password').value;
  var confirm=document.getElementById('reset-confirm').value;
  showAuthError('');
  if(!email)return showAuthError('Enter your email');
  var pwErr=passwordError(pw);
  if(pwErr)return showAuthError(pwErr);
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


