// coach.js — "My Athletes" panel (only for role=coach/admin)
// Lets a coach link already-registered athletes by email and manage them.

async function loadCoach(){
  var listEl=document.getElementById('coach-students');
  if(!listEl)return;
  listEl.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/coach/students');
  if(!r||!r.ok){
    listEl.innerHTML='<p style="color:var(--accent2)">'+((r&&r.data)?r.data.message:'Error loading athletes')+'</p>';
    return;
  }
  renderStudents(r.data.students||[]);
  loadAvailable();
}

function renderStudents(students){
  var listEl=document.getElementById('coach-students');
  if(students.length===0){
    listEl.innerHTML='<p style="color:var(--muted)">No athletes yet. Add one from the list below.</p>';
    return;
  }
  listEl.innerHTML=students.map(function(s){
    var sportsList=(s.sports||[]).map(function(sp){return sp.type;}).join(', ')||'none';
    return '<div class="coach-row" data-id="'+s._id+'">'
      +'<div><strong>'+escapeHtml(s.name)+'</strong>'
      +'<span class="coach-row-sub">'+escapeHtml(s.email)+' · '+sportsList+'</span></div>'
      +'<div class="coach-row-right">'
      +'<button class="btn-send-wod" data-id="'+s._id+'" data-name="'+escapeHtml(s.name)+'">&#128235; Send WOD</button>'
      +'<button class="btn-remove-student" data-id="'+s._id+'" data-name="'+escapeHtml(s.name)+'" title="Remove athlete">&#10005;</button>'
      +'</div></div>';
  }).join('');
  listEl.querySelectorAll('.btn-remove-student').forEach(function(btn){
    btn.addEventListener('click',function(){removeStudent(btn.dataset.id,btn.dataset.name);});
  });
  listEl.querySelectorAll('.btn-send-wod').forEach(function(btn){
    btn.addEventListener('click',function(){openSendWod(btn.dataset.id,btn.dataset.name);});
  });
}

// ── Send WOD to a student ───────────────────────────
var sendWodState={studentId:null,studentName:'',sport:'functional',preview:null};

function openSendWod(studentId,studentName){
  sendWodState={studentId:studentId,studentName:studentName,sport:'functional',preview:null};
  renderSendWodModal();
  document.getElementById('modal').classList.remove('hidden');
}

function renderSendWodModal(){
  var st=sendWodState;
  var sportBtns='<div class="sendwod-sports">'
    +'<button class="sendwod-sport'+(st.sport==='functional'?' active':'')+'" data-sport="functional">&#9889; Functional</button>'
    +'<button class="sendwod-sport'+(st.sport==='swimming'?' active':'')+'" data-sport="swimming">&#127946; Swimming</button>'
    +'</div>';
  var preview=st.preview
    ? '<div class="sendwod-preview">'+renderWorkout({sport:st.sport,warmup:st.preview.warmup,blocks:st.preview.blocks,pattern:st.preview.pattern},false)+'</div>'
    : '<p class="card-hint" style="margin:14px 0">Pick a sport and generate a workout from your library to preview before sending.</p>';
  var actions='<div class="sendwod-actions">'
    +'<button class="btn-manual" id="sendwod-generate">'+(st.preview?'&#8634; Regenerate':'Generate')+'</button>'
    +(st.preview?'<button class="btn-approve" id="sendwod-send">Send to '+escapeHtml(st.studentName)+'</button>':'')
    +'</div>';
  document.getElementById('modal-content').innerHTML=
    '<h2 class="modal-title">Send WOD to '+escapeHtml(st.studentName)+'</h2>'+sportBtns+preview+actions;

  document.querySelectorAll('.sendwod-sport').forEach(function(b){
    b.addEventListener('click',function(){sendWodState.sport=b.dataset.sport;sendWodState.preview=null;renderSendWodModal();});
  });
  var genBtn=document.getElementById('sendwod-generate');
  if(genBtn)genBtn.addEventListener('click',generateSendWod);
  var sendBtn=document.getElementById('sendwod-send');
  if(sendBtn)sendBtn.addEventListener('click',confirmSendWod);
}

async function generateSendWod(){
  var st=sendWodState;
  var btn=document.getElementById('sendwod-generate');
  btn.disabled=true;btn.textContent='Generating...';
  var r=await apiCall('/api/coach/students/'+st.studentId+'/generate',{method:'POST',body:JSON.stringify({sport:st.sport})});
  if(!r||!r.ok){
    btn.disabled=false;btn.textContent='Generate';
    showToast((r&&r.data)?r.data.message:'Could not generate','error');
    return;
  }
  sendWodState.preview=r.data.workout;
  renderSendWodModal();
}

async function confirmSendWod(){
  var st=sendWodState;
  if(!st.preview)return;
  var btn=document.getElementById('sendwod-send');
  btn.disabled=true;btn.textContent='Sending...';
  var body=JSON.stringify({sport:st.sport,warmup:st.preview.warmup,blocks:st.preview.blocks,pattern:st.preview.pattern});
  var r=await apiCall('/api/coach/students/'+st.studentId+'/assign',{method:'POST',body:body});
  if(!r||!r.ok){
    btn.disabled=false;btn.textContent='Send to '+st.studentName;
    showToast((r&&r.data)?r.data.message:'Could not send','error');
    return;
  }
  document.getElementById('modal').classList.add('hidden');
  showToast('Workout sent to '+st.studentName,'success');
}

// ── Available athlete accounts (pick from existing, no free-text email) ──
var availableCache=[];

async function loadAvailable(){
  var el=document.getElementById('coach-available');
  if(!el)return;
  el.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/coach/available-athletes');
  if(!r||!r.ok){el.innerHTML='<p style="color:var(--accent2)">'+((r&&r.data)?r.data.message:'Error loading accounts')+'</p>';return;}
  availableCache=r.data.athletes||[];
  renderAvailable(availableCache);
}

function renderAvailable(list){
  var el=document.getElementById('coach-available');
  if(!el)return;
  if(list.length===0){el.innerHTML='<p style="color:var(--muted)">No available athlete accounts (they must register as Athlete and not already have a coach).</p>';return;}
  el.innerHTML=list.map(function(a){
    var sportsList=(a.sports||[]).map(function(sp){return sp.type;}).join(', ')||'none';
    return '<div class="coach-row">'
      +'<div><strong>'+escapeHtml(a.name)+'</strong>'
      +'<span class="coach-row-sub">'+escapeHtml(a.email)+' · '+sportsList+'</span></div>'
      +'<div class="coach-row-right">'
      +'<button class="btn-add btn-add-available" data-email="'+escapeHtml(a.email)+'">+ Add</button>'
      +'</div></div>';
  }).join('');
  el.querySelectorAll('.btn-add-available').forEach(function(btn){
    btn.addEventListener('click',function(){addStudentByEmail(btn.dataset.email,btn);});
  });
}

function filterAvailable(q){
  q=(q||'').trim().toLowerCase();
  if(!q){renderAvailable(availableCache);return;}
  renderAvailable(availableCache.filter(function(a){
    return (a.name||'').toLowerCase().indexOf(q)>=0||(a.email||'').toLowerCase().indexOf(q)>=0;
  }));
}

async function addStudentByEmail(email,btn){
  if(btn){btn.disabled=true;btn.textContent='Adding...';}
  var r=await apiCall('/api/coach/students/add',{method:'POST',body:JSON.stringify({email:email})});
  if(!r||!r.ok){
    if(btn){btn.disabled=false;btn.textContent='+ Add';}
    showToast((r&&r.data)?r.data.message:'Could not add athlete','error');return;
  }
  showToast('Athlete added','success');
  loadCoach();
}

async function removeStudent(id,name){
  if(!confirm('Remove '+name+' from your athletes?'))return;
  var r=await apiCall('/api/coach/students/'+id,{method:'DELETE'});
  if(!r||!r.ok){showToast((r&&r.data)?r.data.message:'Could not remove','error');return;}
  showToast('Athlete removed','info');
  loadCoach();
}

function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
