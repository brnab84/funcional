// tools.js — per-sport "pro" calculators (frontend-only).
// Strong: 1RM estimator (Epley) + plate calculator. Swimming: CSS pace zones.

function openToolsModal(){
  var mc=document.getElementById('modal-content');
  if(currentSport==='strong'){mc.innerHTML=_strongToolsHtml();_wireStrongTools();}
  else if(currentSport==='swimming'){mc.innerHTML=_swimToolsHtml();_wireSwimTools();}
  else return;
  document.getElementById('modal').classList.remove('hidden');
}

// ── Strong ──
function _strongToolsHtml(){
  var u=(((currentUser&&currentUser.settings&&currentUser.settings.sportConfig)||{}).strong||{}).units||'kg';
  return '<h2 class="modal-title">Herramientas — Strong</h2>'
    +'<div class="tool-section"><h3 class="tool-h">Estimar 1RM</h3>'
    +'<div class="tool-row"><input id="rm-w" type="number" inputmode="decimal" placeholder="Peso ('+u+')"><input id="rm-r" type="number" inputmode="numeric" placeholder="Reps"></div>'
    +'<div id="rm-out" class="tool-out"></div></div>'
    +'<div class="tool-section"><h3 class="tool-h">Calculadora de discos</h3>'
    +'<div class="tool-row"><input id="pl-t" type="number" inputmode="decimal" placeholder="Peso total ('+u+')"><select id="pl-bar" class="manual-select"><option value="20">Barra 20</option><option value="15">Barra 15</option><option value="10">Barra 10</option></select></div>'
    +'<div id="pl-out" class="tool-out"></div></div>';
}
function _wireStrongTools(){
  var u=(((currentUser&&currentUser.settings&&currentUser.settings.sportConfig)||{}).strong||{}).units||'kg';
  function calcRM(){
    var w=parseFloat(document.getElementById('rm-w').value),r=parseInt(document.getElementById('rm-r').value,10);
    var out=document.getElementById('rm-out');
    if(!w||!r||r<1){out.innerHTML='';return;}
    var rm=r===1?w:w*(1+r/30); // Epley
    var pcts=[95,90,85,80,75,70,65,60];
    out.innerHTML='<div class="tool-big">1RM ≈ '+Math.round(rm)+' '+u+'</div>'
      +'<div class="tool-grid">'+pcts.map(function(p){return '<span class="tool-cell">'+p+'%<b>'+Math.round(rm*p/100)+'</b></span>';}).join('')+'</div>';
  }
  function calcPlates(){
    var t=parseFloat(document.getElementById('pl-t').value),bar=parseFloat(document.getElementById('pl-bar').value);
    var out=document.getElementById('pl-out');
    if(!t||t<bar){out.innerHTML=t?'<div class="tool-note">Menos que la barra.</div>':'';return;}
    var perSide=(t-bar)/2;var plates=[25,20,15,10,5,2.5,1.25];var rem=perSide;var used=[];
    plates.forEach(function(p){var n=Math.floor(rem/p+1e-9);if(n>0){used.push(n+'×'+p);rem-=n*p;}});
    var leftover=Math.round(rem*100)/100;
    out.innerHTML='<div class="tool-big">Por lado: '+(used.length?used.join('  '):'—')+'</div>'
      +'<div class="tool-note">'+perSide+' '+u+' por lado · barra '+bar+(leftover>0?(' · sobran '+leftover):'')+'</div>';
  }
  ['rm-w','rm-r'].forEach(function(id){document.getElementById(id).addEventListener('input',calcRM);});
  ['pl-t','pl-bar'].forEach(function(id){document.getElementById(id).addEventListener('input',calcPlates);});
}

// ── Swimming ──
function _swimToolsHtml(){
  return '<h2 class="modal-title">Herramientas — Swimming</h2>'
    +'<div class="tool-section"><h3 class="tool-h">Zonas de ritmo (CSS / 100 m)</h3>'
    +'<div class="tool-row"><input id="css-m" type="number" inputmode="numeric" placeholder="min" min="0"><input id="css-s" type="number" inputmode="numeric" placeholder="seg" min="0" max="59"></div>'
    +'<p class="card-hint">Tu ritmo umbral por 100 m</p>'
    +'<div id="css-out" class="tool-out"></div></div>';
}
function _fmtSec(s){s=Math.max(0,Math.round(s));var m=Math.floor(s/60),x=s%60;return m+":"+String(x).padStart(2,'0');}
function _wireSwimTools(){
  function calc(){
    var m=parseInt(document.getElementById('css-m').value,10)||0,s=parseInt(document.getElementById('css-s').value,10)||0;
    var css=m*60+s;var out=document.getElementById('css-out');
    if(css<=0){out.innerHTML='';return;}
    var zones=[['A1 (suave)',css+12],['A2 (umbral)',css+4],['A3 (VO2)',Math.max(1,css-2)],['Sprint',Math.max(1,css-6)]];
    out.innerHTML='<div class="tool-big">CSS '+_fmtSec(css)+' /100</div>'
      +'<div class="tool-grid">'+zones.map(function(z){return '<span class="tool-cell">'+z[0]+'<b>'+_fmtSec(z[1])+'</b></span>';}).join('')+'</div>';
  }
  ['css-m','css-s'].forEach(function(id){document.getElementById(id).addEventListener('input',calc);});
}
