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
    themeColor:'#0d0f12',bodyClass:'sport-functional',
    manualModalities:["EMOM","OTM","AMRAP","ROUNDS","FOR TIME","TABATA"],
    blockModalities:['random','EMOM','OTM','AMRAP','ROUNDS','FOR TIME','TABATA'],
    settings:[
      {key:'timeDomain',label:'Dominio de tiempo',type:'single',options:['corto','medio','largo'],def:'medio'},
      {key:'level',label:'Nivel',type:'single',options:['RX','intermedio','scaled'],def:'intermedio'},
      {key:'equipment',label:'Equipamiento',type:'multi',options:['peso corporal','mancuerna','kettlebell','barra','anillas','cajón','soga','remo'],def:['peso corporal','mancuerna','kettlebell','barra']}
    ]
  },
  swimming:{
    logo:'\uD83C\uDFCA',title:'SWIM SESSION',todayTitle:"TODAY'S SESSION",
    themeColor:'#071a2e',bodyClass:'sport-swimming',
    manualModalities:["SPRINT","ENDURANCE","TECHNIQUE","INTERVALS"],
    blockModalities:['random','A1-A2','A2-A3','A3 SPRINT','A3 QUEBRADO','TECHNIQUE','ENDURANCE','PROGRESSIVE','DESCENDING'],
    settings:[
      {key:'volume',label:'Volumen objetivo (m)',type:'single',options:['1500','2500','3500'],def:'2500'},
      {key:'strokeFocus',label:'Foco de estilo',type:'single',options:['crol','todos','combinado'],def:'todos'},
      {key:'equipment',label:'Equipamiento',type:'multi',options:['aletas','manoplas','pull-buoy','snorkel','tabla'],def:[]},
      {key:'level',label:'Nivel',type:'single',options:['principiante','intermedio','avanzado'],def:'intermedio'}
    ]
  },
  strong:{
    logo:'\uD83C\uDFCB\uFE0F',title:'STRONG',todayTitle:"TODAY'S LIFT",
    themeColor:'#120d0e',bodyClass:'sport-strong',
    manualModalities:["PIR\u00C1MIDE","FUERZA","4x8","3x10","3x12","SUPERSET","RONDAS","AL FALLO"],
    blockModalities:['random','PIR\u00C1MIDE','FUERZA','4x8','3x10','3x12','SUPERSET','RONDAS','AL FALLO','ISOM\u00C9TRICO'],
    settings:[
      {key:'units',label:'Unidades',type:'single',options:['kg','lb'],def:'kg'},
      {key:'goal',label:'Objetivo',type:'single',options:['fuerza','hipertrofia','potencia'],def:'hipertrofia'},
      {key:'progression',label:'Progresi\u00F3n',type:'single',options:['5x5','5-3-1','doble','RPE'],def:'doble'},
      {key:'split',label:'Split',type:'single',options:['full body','torso-pierna','PPL','grupo muscular'],def:'PPL'}
    ]
  }
};

function getSportConfig(){return SPORTS[currentSport]||SPORTS.functional;}

