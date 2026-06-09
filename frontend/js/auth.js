// auth.js — part of Functional WOD frontend
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
    var adminBtn=document.getElementById('nav-admin');
    if(adminBtn)adminBtn.style.display=(currentUser.role==='admin')?'':'none';
    var coachBtn=document.getElementById('nav-coach');
    if(coachBtn)coachBtn.style.display=(currentUser.role==='coach'||currentUser.role==='admin')?'':'none';
    var assignedBtn=document.getElementById('nav-assigned');
    if(assignedBtn)assignedBtn.style.display=(currentUser.coachId)?'':'none';
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
  var roleBtn=document.querySelector('.auth-role-btn.active');
  var role=roleBtn?roleBtn.dataset.role:'athlete';
  var btn=document.getElementById('btn-register');btn.textContent='Creating...';btn.disabled=true;
  var r=await fetch(API+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,email:email,password:password,role:role})});
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


