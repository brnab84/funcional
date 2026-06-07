// library.js — part of Functional WOD frontend
async function loadLibrary(){
  var list=document.getElementById('exercise-list');
  list.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  var r=await apiCall('/api/exercises?sport='+currentSport);if(!r)return;
  var exercises=r.data.exercises||[];
  if(!exercises.length){list.innerHTML='<div class="empty-state"><h3>Empty Library</h3><p>Click Seed defaults</p></div>';return;}
  var cats={};exercises.forEach(function(ex){(cats[ex.category]=cats[ex.category]||[]).push(ex);});
  var catLabels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power',
    stroke:'Stroke',kick:'Kick',drill:'Drill',pull:'Pull',sprint:'Sprint',endurance:'Endurance',rest:'Rest'};
  var order=['lower','upper','core','conditioning','power'];
  var sorted=Object.keys(cats).sort(function(a,b){var ia=order.indexOf(a),ib=order.indexOf(b);return(ia<0?99:ia)-(ib<0?99:ib);});
  list.innerHTML=sorted.map(function(cat){
    return'<div class="ex-category-group"><div class="ex-cat-header">'+(catLabels[cat]||cat)+' <span class="ex-cat-count">'+cats[cat].length+'</span></div><div class="ex-cat-items">'+cats[cat].map(function(ex){
      return'<div class="ex-pill" id="ex-'+ex._id+'"><span class="ex-pill-name"><span class="ex-category-dot dot-'+ex.category+'"></span>'+ex.name+'</span><button class="ex-pill-delete" onclick="deleteExercise(\''+ex._id+'\')">x</button></div>';
    }).join('')+'</div></div>';
  }).join('');
}
async function addExercise(){var n=document.getElementById('ex-name').value.trim();var c=document.getElementById('ex-category').value;if(!n)return;await apiCall('/api/exercises',{method:'POST',body:JSON.stringify({name:n,category:c,sport:currentSport})});document.getElementById('ex-name').value='';loadLibrary();showToast('Exercise added','success');}
async function deleteExercise(id){if(!confirm('Remove this exercise?'))return;await apiCall('/api/exercises/'+id,{method:'DELETE'});loadLibrary();showToast('Exercise removed','info');}
async function seedDefaults(){
  var btn=document.getElementById('btn-seed');btn.textContent='Seeding...';btn.disabled=true;
  var r=await apiCall('/api/exercises/seed',{method:'POST',body:JSON.stringify({sport:currentSport})});
  if(r&&r.ok){btn.textContent='Seeded '+r.data.count;loadLibrary();showToast(r.data.count+' exercises loaded','success');}
  else{btn.textContent='Error';showToast(r&&r.data?r.data.message:'Seed failed','error');}
  setTimeout(function(){btn.textContent='Seed defaults';btn.disabled=false;},3000);
}
async function loadCategories(){
  var r=await apiCall('/api/exercises/categories?sport='+currentSport);if(!r||!r.ok)return;
  var sel=document.getElementById('ex-category');var labels={lower:'Lower Body',upper:'Upper Body',core:'Core',conditioning:'Conditioning',power:'Power'};
  var cur=sel.value;sel.innerHTML=r.data.categories.map(function(c){return'<option value="'+c+'">'+(labels[c]||c)+'</option>';}).join('')+'<option value="__new__">+ New category...</option>';
  if(r.data.categories.includes(cur))sel.value=cur;
}
function handleCategoryChange(){
  var sel=document.getElementById('ex-category');
  if(sel.value==='__new__'){var nc=prompt('New category name:');if(nc&&nc.trim()){var v=nc.trim().toLowerCase();var o=document.createElement('option');o.value=v;o.textContent=nc.trim();sel.insertBefore(o,sel.querySelector('option[value="__new__"]'));sel.value=v;}else{sel.value=sel.options[0].value;}}
}
function togglePhotoPanel(){document.getElementById('photo-panel').classList.toggle('hidden');}
function handlePhotoSelect(files){
  pendingPhotos=[];var preview=document.getElementById('photo-preview');preview.innerHTML='';
  Array.from(files).forEach(function(file){var reader=new FileReader();reader.onload=function(e){var data=e.target.result.split(',')[1];pendingPhotos.push({data:data,mediaType:file.type||'image/jpeg'});preview.innerHTML+='<div class="photo-thumb"><img src="'+e.target.result+'"><span>'+file.name+'</span></div>';document.getElementById('btn-analyze').disabled=false;};reader.readAsDataURL(file);});
}
async function analyzePhotos(){
  if(!pendingPhotos.length)return;var btn=document.getElementById('btn-analyze');btn.textContent='Analyzing...';btn.disabled=true;
  var r=await apiCall('/api/upload/photo',{method:'POST',body:JSON.stringify({images:pendingPhotos,sport:currentSport})});
  btn.textContent='Analyze with AI';btn.disabled=false;var results=document.getElementById('photo-results');
  if(!r||!r.ok){results.innerHTML='<p style="color:var(--accent2)">'+(r&&r.data?r.data.message:'Error')+'</p>';results.classList.remove('hidden');return;}
  results.innerHTML='<div class="photo-result-box"><p style="color:var(--green);font-weight:700">Done!</p><p>'+(r.data.added?r.data.added.length:0)+' new, '+(r.data.skipped?r.data.skipped.length:0)+' existing</p></div>';
  results.classList.remove('hidden');loadLibrary();
}

