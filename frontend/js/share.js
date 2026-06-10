// share.js — part of Functional WOD frontend
// Generates a branded PNG of a workout via Canvas and shares it (Web Share API) or downloads it.
// Viral loop: every shared image carries the app branding + URL.

var SHARE_THEMES={
  functional:{bg:'#0d0f12',card:'#15181d',accent:'#f5c518',text:'#f2f2f2',muted:'#9aa0a8',logo:'\u26A1',title:'FUNCTIONAL WOD'},
  swimming:{bg:'#071a2e',card:'#0c2540',accent:'#22d3ee',text:'#eef6fb',muted:'#8fb3c9',logo:'\uD83C\uDFCA',title:'SWIM SESSION'}
};
var SHARE_URL='funcional-production.up.railway.app';

function _shareTheme(){return SHARE_THEMES[currentSport]||SHARE_THEMES.functional;}

// Measure total height needed before creating canvas
function _shareLayout(workout){
  var rows=0,blocks=0;
  if(workout.warmup&&workout.warmup.exercises&&workout.warmup.exercises.length){blocks++;rows+=workout.warmup.exercises.length;}
  (workout.blocks||[]).forEach(function(b){blocks++;rows+=(b.exercises||[]).length;});
  var extra=0;
  if(workout.pattern)extra+=70;
  if(currentSport==='swimming'&&calcTotalMeters(workout)>0)extra+=70;
  // header 240 + per-block header 110 + per-row 64 + footer 140 + paddings
  return 240+blocks*110+rows*64+extra+170;
}

function generateWorkoutImage(workout,cb){
  var th=_shareTheme();
  var W=1080,H=Math.max(_shareLayout(workout),900);
  var c=document.createElement('canvas');c.width=W;c.height=H;
  var x=c.getContext('2d');

  // Background
  x.fillStyle=th.bg;x.fillRect(0,0,W,H);
  // Subtle top accent bar
  x.fillStyle=th.accent;x.fillRect(0,0,W,10);

  var pad=60,y=110;

  // Header: logo + title
  x.font='64px sans-serif';x.textBaseline='middle';
  x.fillText(th.logo,pad,y);
  x.fillStyle=th.text;x.font='800 56px Arial, sans-serif';
  x.fillText(th.title,pad+90,y);
  // Date (right aligned)
  var d=workout.date||new Date().toISOString().slice(0,10);
  x.font='600 30px Arial, sans-serif';x.fillStyle=th.muted;x.textAlign='right';
  x.fillText(d,W-pad,y);
  x.textAlign='left';
  y+=110;

  function sectionHeader(badge,config){
    // Badge pill
    x.font='700 28px Arial, sans-serif';
    var bw=x.measureText(badge).width+48;
    x.fillStyle=th.accent;
    _shareRoundRect(x,pad,y-26,bw,52,26);x.fill();
    x.fillStyle=th.bg;x.fillText(badge,pad+24,y+2);
    // Config text
    if(config){x.fillStyle=th.muted;x.font='600 28px Arial, sans-serif';x.fillText(config,pad+bw+24,y+2);}
    y+=78;
  }
  function exerciseRow(i,name,reps){
    x.fillStyle=th.card;
    _shareRoundRect(x,pad,y-24,W-pad*2,52,10);x.fill();
    x.fillStyle=th.accent;x.font='700 26px Arial, sans-serif';
    x.fillText(String(i+1).padStart(2,'0'),pad+20,y+2);
    x.fillStyle=th.text;x.font='600 28px Arial, sans-serif';
    var nm=String(name||'');if(nm.length>42)nm=nm.slice(0,41)+'\u2026';
    x.fillText(nm,pad+80,y+2);
    if(reps){x.fillStyle=th.muted;x.font='600 26px Arial, sans-serif';x.textAlign='right';x.fillText(String(reps),W-pad-20,y+2);x.textAlign='left';}
    y+=64;
  }

  if(workout.warmup&&workout.warmup.exercises&&workout.warmup.exercises.length){
    sectionHeader('E.C.',(workout.warmup.rounds||3)+' Rounds');
    workout.warmup.exercises.forEach(function(ex,i){exerciseRow(i,ex.name,ex.reps);});
    y+=32;
  }
  (workout.blocks||[]).forEach(function(b){
    sectionHeader(b.modality||('BLOCK '+(b.label||'')),(b.label?('Block '+b.label+'  '):'')+(b.config||''));
    (b.exercises||[]).forEach(function(ex,i){exerciseRow(i,ex.name,ex.reps);});
    y+=32;
  });

  if(workout.pattern){
    x.fillStyle=th.accent;x.font='700 30px Arial, sans-serif';
    x.fillText('Pattern: '+workout.pattern,pad,y);y+=70;
  }
  if(currentSport==='swimming'){
    var meters=calcTotalMeters(workout);
    if(meters>0){
      x.fillStyle=th.accent;x.font='800 34px Arial, sans-serif';
      x.fillText('Total: '+meters+'m ('+(meters/1000).toFixed(1)+' km)',pad,y);y+=70;
    }
  }

  // Footer branding
  x.strokeStyle=th.card;x.lineWidth=2;
  x.beginPath();x.moveTo(pad,H-110);x.lineTo(W-pad,H-110);x.stroke();
  x.font='40px sans-serif';x.fillText(th.logo,pad,H-58);
  x.fillStyle=th.text;x.font='800 30px Arial, sans-serif';
  x.fillText(th.title,pad+60,H-58);
  x.fillStyle=th.muted;x.font='600 26px Arial, sans-serif';x.textAlign='right';
  x.fillText(SHARE_URL,W-pad,H-58);
  x.textAlign='left';

  c.toBlob(function(blob){cb(blob);},'image/png');
}

function _shareRoundRect(x,px,py,w,h,r){
  x.beginPath();
  x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);
  x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath();
}

function _shareBlob(blob,workout){
  var th=_shareTheme();
  var fname=(currentSport==='swimming'?'swim-session-':'wod-')+(workout.date||'today')+'.png';
  var file=new File([blob],fname,{type:'image/png'});
  if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:th.title,text:th.title+' \u2014 '+SHARE_URL})
      .catch(function(){/* user cancelled — no-op */});
  }else{
    // Fallback: direct download
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);a.download=fname;
    document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},1000);
    showToast('Image downloaded','success');
  }
}

// Share the currently displayed workout (Today view)
function shareWorkout(){
  var w=currentWorkouts[activeVariant];
  if(!w){showToast('No workout to share','warning');return;}
  generateWorkoutImage(w,function(blob){
    if(!blob){showToast('Could not generate image','error');return;}
    _shareBlob(blob,w);
  });
}

// Share a workout from history (modal)
function shareHistoryWorkout(id){
  var w=_hCache[id];
  if(!w){showToast('Workout not found','warning');return;}
  generateWorkoutImage(w,function(blob){
    if(!blob){showToast('Could not generate image','error');return;}
    _shareBlob(blob,w);
  });
}
