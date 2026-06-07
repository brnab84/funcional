// edit.js — part of Functional WOD frontend
function editWarmup(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var wu=w.warmup;
  var html='<h3 style="margin-bottom:12px">Edit Warm-up</h3>';
  html+='<label class="field">Rounds: <input type="number" id="edit-warmup-rounds" value="'+(wu.rounds||3)+'" min="1" max="10" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"></label>';
  html+='<div style="margin-top:12px">';
  wu.exercises.forEach(function(ex){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center"><input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button></div>';
  });
  html+='</div><button onclick="saveWarmupEdit()" class="btn-save-settings" style="margin-top:12px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;document.getElementById('modal').classList.remove('hidden');
}
async function saveWarmupEdit(){
  var w=currentWorkouts[activeVariant];if(!w)return;
  var rounds=parseInt(document.getElementById('edit-warmup-rounds').value)||3;
  var rows=document.querySelectorAll('#modal-content .edit-row');var exercises=[];
  rows.forEach(function(row){var n=row.querySelector('.edit-name').value.trim();var r=row.querySelector('.edit-reps').value.trim();if(n)exercises.push({name:n,reps:r,category:'conditioning'});});
  w.warmup={rounds:rounds,exercises:exercises};
  await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({warmup:w.warmup})});
  document.getElementById('modal').classList.add('hidden');showVariant(activeVariant);
  showToast('Warmup updated','success');
}
function editBlock(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;var block=w.blocks[bi];
  var html='<h3 style="margin-bottom:12px">Edit Block '+block.label+'</h3>';
  html+='<div style="display:flex;gap:8px;margin-bottom:12px"><select id="edit-block-modality" style="height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;">';
  ['EMOM','OTM','AMRAP','FOR TIME','ROUNDS','TABATA','DESCENDING','ZONES'].forEach(function(m){html+='<option'+(block.modality===m?' selected':'')+'>'+m+'</option>';});
  html+='</select><input id="edit-block-config" value="'+(block.config||'')+'" placeholder="Config" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"></div>';
  html+='<div id="edit-block-exercises">';
  block.exercises.forEach(function(ex){
    html+='<div class="edit-row" style="display:flex;gap:8px;margin-bottom:8px;align-items:center"><input class="edit-name" value="'+ex.name+'" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" value="'+(ex.reps||'')+'" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button></div>';
  });
  html+='</div><button onclick="addEditRow()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:6px 12px;cursor:pointer;margin-bottom:12px">+ Add</button>';
  html+='<button onclick="saveBlockEdit('+bi+')" class="btn-save-settings" style="margin-top:8px">Save</button>';
  document.getElementById('modal-content').innerHTML=html;document.getElementById('modal').classList.remove('hidden');
}
function addEditRow(){
  var c=document.getElementById('edit-block-exercises');var d=document.createElement('div');d.className='edit-row';d.style='display:flex;gap:8px;margin-bottom:8px;align-items:center';
  d.innerHTML='<input class="edit-name" placeholder="Exercise" style="flex:1;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;"><input class="edit-reps" placeholder="Reps" style="width:60px;height:32px;border-radius:6px;border:1px solid var(--border);background:var(--bg3);color:var(--text);padding:0 8px;text-align:center"><button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--accent2);cursor:pointer;font-size:1.2rem">x</button>';
  c.appendChild(d);
}
async function saveBlockEdit(bi){
  var w=currentWorkouts[activeVariant];if(!w)return;
  w.blocks[bi].modality=document.getElementById('edit-block-modality').value;
  w.blocks[bi].config=document.getElementById('edit-block-config').value;
  var rows=document.querySelectorAll('#edit-block-exercises .edit-row');var exercises=[];
  rows.forEach(function(row){var n=row.querySelector('.edit-name').value.trim();var r=row.querySelector('.edit-reps').value.trim();if(n)exercises.push({name:n,reps:r,category:'conditioning'});});
  w.blocks[bi].exercises=exercises;
  await apiCall('/api/workouts/'+w._id+'/edit',{method:'PUT',body:JSON.stringify({blocks:w.blocks})});
  document.getElementById('modal').classList.add('hidden');showVariant(activeVariant);
  showToast('Block updated','success');
}

