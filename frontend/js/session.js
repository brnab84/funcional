// session.js — part of Functional WOD frontend
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
