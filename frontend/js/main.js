// main.js — part of Functional WOD frontend
function switchView(name){
  document.querySelectorAll('.view').forEach(function(v){v.classList.remove('active');});
  document.querySelectorAll('.nav-btn[data-view]').forEach(function(b){b.classList.remove('active');});
  document.getElementById('view-'+name).classList.add('active');
  document.querySelector('[data-view="'+name+'"]').classList.add('active');
  if(name==='history')loadHistory();if(name==='library'){loadLibrary();loadCategories();}if(name==='admin')loadAdmin();if(name==='coach')loadCoach();if(name==='assigned')loadAssigned();
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
  // Register role selector (Athlete / Coach)
  document.querySelectorAll('.auth-role-btn').forEach(function(btn){btn.addEventListener('click',function(){
    document.querySelectorAll('.auth-role-btn').forEach(function(b){b.classList.remove('active');});btn.classList.add('active');
  });});
  // Coach panel: add athlete
  var btnAddStudent=document.getElementById('btn-add-student');
  if(btnAddStudent)btnAddStudent.addEventListener('click',addStudent);
  var coachEmail=document.getElementById('coach-student-email');
  if(coachEmail)coachEmail.addEventListener('keydown',function(e){if(e.key==='Enter')addStudent();});
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
  document.getElementById('btn-import').addEventListener('click',openImportModal);
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
























