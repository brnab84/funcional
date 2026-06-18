// render.js — part of Functional WOD frontend
function modalityBadgeClass(m){
  m=(m||'').toUpperCase();
  if(m.includes('EMOM'))return'badge-emom';if(m.includes('OTM'))return'badge-otm';
  if(m.includes('AMRAP')&&!m.includes('MINI'))return'badge-amrap';if(m.includes('FOR TIME'))return'badge-fortime';
  if(m.includes('ROUNDS'))return'badge-rounds';if(m.includes('TABATA'))return'badge-tabata';
  if(m.includes('DESCENDING'))return'badge-descending';if(m.includes('ZONE'))return'badge-zones';
  if(m.includes('MINI'))return'badge-miniamrap';
  if(m.includes('A3')||m.includes('SPRINT')||m.includes('MAX')||m.includes('QUEBRADO'))return'badge-sprint';
  if(m.includes('A1')||m.includes('A2'))return'badge-intervals';
  if(m.includes('ENDUR'))return'badge-endurance';
  if(m.includes('TECH')||m.includes('DRILL'))return'badge-technique';
  if(m.includes('PROG')||m.includes('DESC'))return'badge-intervals';
  if(m.includes('EASY')||m.includes('RECOV'))return'badge-easy';return'badge-rounds';
}
function catDot(cat){return'<span class="ex-category-dot dot-'+(cat||'lower')+'"></span>';}


// Calculate total meters for swimming workouts
function calcTotalMeters(workout){
  if(!workout)return 0;
  var total=0;
  var parseMeters=function(ex){
    // Check explicit meters field first
    if(ex.meters)return parseInt(ex.meters)||0;
    // Parse from reps string: "4x200m" → 800, "300m" → 300, "1x500m" → 500
    var reps=String(ex.reps||'');
    var m1=reps.match(/(\d+)\s*x\s*(\d+)\s*m/i);
    if(m1)return parseInt(m1[1])*parseInt(m1[2]);
    var m2=reps.match(/^(\d+)\s*m/i);
    if(m2)return parseInt(m2[1]);
    // "200m + 100m" pattern
    var m3=reps.match(/(\d+)m/gi);
    if(m3){var s=0;m3.forEach(function(x){s+=parseInt(x);});return s;}
    return 0;
  };
  if(workout.warmup&&workout.warmup.exercises){
    var wuRounds=workout.warmup.rounds||1;
    workout.warmup.exercises.forEach(function(ex){total+=parseMeters(ex)*wuRounds;});
  }
  (workout.blocks||[]).forEach(function(block){
    block.exercises.forEach(function(ex){total+=parseMeters(ex);});
  });
  // Check totalMeters from AI import
  if(workout.totalMeters&&workout.totalMeters>total)total=workout.totalMeters;
  return total;
}

function renderWorkout(workout,editable){
  if(!workout)return'<div class="empty-state"><h3>No workout</h3></div>';
  var html='<div class="workout-card">';
  // Source badge at top
  if(workout.source==='ai')html+='<div style="padding:8px 14px;text-align:right"><span class="card-badge" style="background:rgba(245,197,24,0.2);color:#f5c518;border:1px solid rgba(245,197,24,0.4);font-size:0.7rem">AI Generated</span></div>';
  if(workout.source==='imported')html+='<div style="padding:8px 14px;text-align:right"><span class="card-badge" style="background:rgba(46,213,115,0.2);color:#2ed573;border:1px solid rgba(46,213,115,0.4);font-size:0.7rem">Imported</span></div>';
  if(workout.source==='manual')html+='<div style="padding:8px 14px;text-align:right"><span class="card-badge" style="background:rgba(30,144,255,0.2);color:#1e90ff;border:1px solid rgba(30,144,255,0.4);font-size:0.7rem">Manual</span></div>';
  if(workout.source==='assigned'){var coachName=(workout.assignedBy&&workout.assignedBy.name)?(' · '+workout.assignedBy.name):'';html+='<div style="padding:8px 14px;text-align:right"><span class="card-badge" style="background:rgba(155,89,255,0.2);color:#9b59ff;border:1px solid rgba(155,89,255,0.4);font-size:0.7rem">&#128100; From Coach'+coachName+'</span></div>';}
  if(currentSport==='functional'){var _lvl=(((currentUser&&currentUser.settings&&currentUser.settings.sportConfig)||{}).functional||{}).level;if(_lvl){var _lc=_lvl==='RX'?'#f5c518':(_lvl==='scaled'?'#9ca3af':'#1e90ff');var _lt=_lvl==='RX'?'RX':(_lvl==='scaled'?'SCALED':'INTERMEDIO');html+='<div style="padding:6px 14px 0;text-align:right"><span class="card-badge" style="background:rgba(0,0,0,0.25);color:'+_lc+';border:1px solid '+_lc+';font-size:0.7rem;letter-spacing:1px">'+_lt+'</span></div>';}}
  if(workout.warmup&&workout.warmup.exercises&&workout.warmup.exercises.length){
    html+='<div class="card-header">';
    html+='<div class="card-header-left"><span class="card-badge badge-warmup">E.C.</span><span class="card-config">'+(workout.warmup.rounds||3)+' Rounds</span></div>';
    if(editable)html+='<button class="btn-edit-section" onclick="editWarmup()">edit</button>';
    html+='</div>';
    html+='<div class="exercise-table">'+workout.warmup.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+exerciseIconHtml(ex.name,ex.category,currentSport)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  }
  (workout.blocks||[]).forEach(function(block,bi){
    html+='<div class="section-label">Block '+block.label+'</div>';
    html+='<div class="card-header">';
    html+='<div class="card-header-left"><span class="card-badge '+modalityBadgeClass(block.modality)+'">'+block.modality+'</span><span class="card-config">'+(block.config||'')+'</span></div>';
    if(workout.source==='ai')html+='<span class="card-source-ai">AI</span>';if(workout.source==='imported')html+='<span class="card-source-ai" style="background:rgba(46,213,115,0.15);color:var(--green);border-color:var(--green)">IMPORTED</span>';if(workout.source==='manual')html+='<span class="card-source-ai" style="background:rgba(30,144,255,0.15);color:var(--blue);border-color:var(--blue)">MANUAL</span>';
    if(editable)html+='<button class="btn-edit-section" onclick="editBlock('+bi+')">edit</button>';
    html+='</div>';
    html+='<div class="exercise-table">'+block.exercises.map(function(ex,i){
      return'<div class="ex-row"><span class="ex-num">'+String(i+1).padStart(2,'0')+'</span><span class="ex-name">'+exerciseIconHtml(ex.name,ex.category,currentSport)+ex.name+'</span><span class="ex-reps">'+(ex.reps||'')+'</span></div>';
    }).join('')+'</div>';
  });
  if(workout.pattern)html+='<div class="section-label" style="color:var(--accent);border-top:none">Pattern: '+workout.pattern+'</div>';
  if(currentSport==='swimming'){
    var meters=calcTotalMeters(workout);
    if(meters>0){
      var km=(meters/1000).toFixed(1);
      html+='<div class="section-label" style="color:var(--green);border-top:none;font-size:0.9rem;font-weight:700">Total: '+meters+'m ('+km+' km)</div>';
    }
  }
  return html+'</div>';
}
