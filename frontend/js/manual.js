// manual.js — part of Functional WOD frontend
async function openManualBuilder(){
  var r=await apiCall("/api/exercises?sport="+currentSport);
  exerciseCache=(r&&r.data&&r.data.exercises)?r.data.exercises:[];
  var mods=currentSport==="swimming"?["SPRINT","ENDURANCE","TECHNIQUE","INTERVALS"]:["EMOM","OTM","AMRAP","ROUNDS","FOR TIME","TABATA"];
  window._manualMods=mods;window._blockCount=0;

  var h="<h3 style=\"margin-bottom:16px\">Create Workout</h3><div class=\"manual-builder\" id=\"manual-builder\">";
  h+="<div class=\"manual-section\"><div class=\"manual-section-header\"><span class=\"manual-section-title\">Warm-up</span>";
  h+="<div class=\"manual-row\"><label style=\"font-size:0.78rem;color:var(--muted)\">Rounds</label>";
  h+="<input type=\"number\" id=\"m-warmup-rounds\" value=\"3\" min=\"1\" max=\"10\" class=\"manual-input manual-input-sm\"></div></div>";
  h+="<div id=\"m-warmup-list\"></div>";
  h+="<button class=\"manual-btn-add\" data-action=\"add-ex\" data-target=\"warmup\">+ Add exercise</button></div>";
  h+="<div id=\"m-blocks-container\"></div>";
  h+="<button class=\"manual-btn-add\" data-action=\"add-block\" style=\"border-color:var(--accent);color:var(--accent)\">+ Add Block</button>";
  h+="<button class=\"btn-approve\" data-action=\"save-manual\" style=\"margin-top:12px\">Save Workout</button></div>";

  document.getElementById("modal-content").innerHTML=h;
  document.getElementById("modal").classList.remove("hidden");

  // Event delegation for manual builder
  document.getElementById("modal-content").addEventListener("click",handleManualClick);

  addManualExRow("warmup");
  addManualBlock();
}

function handleManualClick(e){
  var btn=e.target.closest("[data-action]");if(!btn)return;
  var action=btn.dataset.action;
  if(action==="add-ex")addManualExRow(btn.dataset.target);
  if(action==="add-block")addManualBlock();
  if(action==="remove-row"){var row=btn.closest(".manual-row");if(row)row.remove();}
  if(action==="remove-block"){var sec=btn.closest(".manual-section");if(sec)sec.remove();}
  if(action==="save-manual")saveManualWorkout();
}

function addManualExRow(target){
  var container=document.getElementById("m-"+target+"-list");if(!container)return;
  var div=document.createElement("div");div.className="manual-row";
  var dlId="dl-"+target+"-"+Date.now();
  div.innerHTML="<input class=\"manual-input m-ex-name\" list=\""+dlId+"\" placeholder=\"Exercise name\">"
    +"<datalist id=\""+dlId+"\">"+exerciseCache.map(function(e){return"<option value=\""+e.name+"\">";}).join("")+"</datalist>"
    +"<input class=\"manual-input manual-input-sm m-ex-reps\" placeholder=\"Reps\">"
    +"<button class=\"manual-btn-remove\" data-action=\"remove-row\">\u00d7</button>";
  container.appendChild(div);
}

function addManualBlock(){
  window._blockCount++;
  var label=String.fromCharCode(64+window._blockCount);
  var container=document.getElementById("m-blocks-container");
  var div=document.createElement("div");div.className="manual-section";div.id="m-block-"+label;
  div.innerHTML="<div class=\"manual-section-header\"><span class=\"manual-section-title\">Block "+label+"</span>"
    +"<button class=\"manual-btn-remove\" data-action=\"remove-block\" style=\"font-size:1.2rem\">\u00d7</button></div>"
    +"<div class=\"manual-row\"><select class=\"manual-select m-block-mod\">"+window._manualMods.map(function(m){return"<option>"+m+"</option>";}).join("")+"</select>"
    +"<input class=\"manual-input m-block-config\" placeholder=\"Config\"></div>"
    +"<div id=\"m-block-"+label+"-list\"></div>"
    +"<button class=\"manual-btn-add\" data-action=\"add-ex\" data-target=\"block-"+label+"\">+ Add exercise</button>";
  container.appendChild(div);
  addManualExRow("block-"+label);
  addManualExRow("block-"+label);
}

async function saveManualWorkout(){
  var warmupRounds=parseInt(document.getElementById("m-warmup-rounds").value)||1;
  var warmupExs=[];
  document.querySelectorAll("#m-warmup-list .manual-row").forEach(function(row){
    var name=row.querySelector(".m-ex-name").value.trim();
    var reps=row.querySelector(".m-ex-reps").value.trim();
    if(name){var cat="conditioning";var f=exerciseCache.find(function(e){return e.name===name;});if(f)cat=f.category;warmupExs.push({name:name,reps:reps,category:cat});}
  });
  var blocks=[];
  document.querySelectorAll("#m-blocks-container .manual-section").forEach(function(sec){
    var label=sec.querySelector(".manual-section-title").textContent.replace("Block ","");
    var mod=sec.querySelector(".m-block-mod").value;
    var config=sec.querySelector(".m-block-config").value;
    var exs=[];
    sec.querySelectorAll(".manual-row").forEach(function(row){
      var ne=row.querySelector(".m-ex-name");var re=row.querySelector(".m-ex-reps");
      if(ne&&re){var n=ne.value.trim();var r=re.value.trim();if(n){var cat="conditioning";var f=exerciseCache.find(function(e){return e.name===n;});if(f)cat=f.category;exs.push({name:n,reps:r,category:cat});}}
    });
    if(exs.length>0)blocks.push({label:label,modality:mod,config:config,exercises:exs});
  });
  if(warmupExs.length===0&&blocks.length===0){showToast("Add at least one exercise","error");return;}
  var r=await apiCall("/api/workouts/manual",{method:"POST",body:JSON.stringify({sport:currentSport,warmup:{rounds:warmupRounds,exercises:warmupExs},blocks:blocks,pattern:"MANUAL",source:"manual"})});
  document.getElementById("modal").classList.add("hidden");
  if(r&&r.ok){currentWorkouts.push(r.data.workout);resetTabs();showVariant(currentWorkouts.length-1);showToast("Manual workout created","success");}
  else{showToast(r&&r.data?r.data.message:"Error","error");}
}



// ── IMPORT WORKOUT (photo/text → AI → preview → save) ──
