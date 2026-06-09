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
}

function renderStudents(students){
  var listEl=document.getElementById('coach-students');
  if(students.length===0){
    listEl.innerHTML='<p style="color:var(--muted)">No athletes yet. Add one by their email above.</p>';
    return;
  }
  listEl.innerHTML=students.map(function(s){
    var sportsList=(s.sports||[]).map(function(sp){return sp.type;}).join(', ')||'none';
    return '<div class="coach-row" data-id="'+s._id+'">'
      +'<div><strong>'+escapeHtml(s.name)+'</strong>'
      +'<span class="coach-row-sub">'+escapeHtml(s.email)+' · '+sportsList+'</span></div>'
      +'<div class="coach-row-right">'
      +'<button class="btn-remove-student" data-id="'+s._id+'" data-name="'+escapeHtml(s.name)+'" title="Remove athlete">&#10005;</button>'
      +'</div></div>';
  }).join('');
  listEl.querySelectorAll('.btn-remove-student').forEach(function(btn){
    btn.addEventListener('click',function(){removeStudent(btn.dataset.id,btn.dataset.name);});
  });
}

async function addStudent(){
  var input=document.getElementById('coach-student-email');
  var email=(input.value||'').trim();
  if(!email){showToast('Enter the athlete\'s email','warning');return;}
  var btn=document.getElementById('btn-add-student');
  btn.disabled=true;btn.textContent='Adding...';
  var r=await apiCall('/api/coach/students/add',{method:'POST',body:JSON.stringify({email:email})});
  btn.disabled=false;btn.textContent='+ Add athlete';
  if(!r||!r.ok){showToast((r&&r.data)?r.data.message:'Could not add athlete','error');return;}
  input.value='';
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
