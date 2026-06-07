// ui.js — part of Functional WOD frontend
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

