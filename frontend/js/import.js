// import.js — part of Functional WOD frontend
function openImportModal(){
  var h="<h3 style=\"margin-bottom:16px\">Import Workout</h3>";
  h+="<div style=\"display:flex;flex-direction:column;gap:14px\">";

  // Photo upload
  h+="<div class=\"manual-section\">";
  h+="<span class=\"manual-section-title\" style=\"font-size:0.9rem\">From Photo</span>";
  h+="<input type=\"file\" id=\"import-file\" accept=\"image/*\" capture=\"environment\" multiple style=\"margin-top:8px;font-size:0.85rem;color:var(--text)\">";
  h+="<div id=\"import-preview\" style=\"display:flex;gap:6px;margin-top:8px;flex-wrap:wrap\"></div>";
  h+="</div>";

  // Text input
  h+="<div class=\"manual-section\">";
  h+="<span class=\"manual-section-title\" style=\"font-size:0.9rem\">Or paste workout text</span>";
  h+="<textarea id=\"import-text\" placeholder=\"Paste your workout here...\" style=\"width:100%;min-height:120px;margin-top:8px;border-radius:6px;border:1px solid var(--border);background:var(--bg2);color:var(--text);padding:10px;font-family:var(--font-body);font-size:0.85rem;resize:vertical\"></textarea>";
  h+="</div>";

  h+="<button class=\"btn-approve\" id=\"btn-import-parse\" style=\"margin-top:4px\">Analyze & Preview</button>";
  h+="<div id=\"import-result\" style=\"display:none\"></div>";
  h+="</div>";

  document.getElementById("modal-content").innerHTML=h;
  document.getElementById("modal").classList.remove("hidden");

  // File handler
  document.getElementById("import-file").addEventListener("change",function(e){
    var preview=document.getElementById("import-preview");
    preview.innerHTML="";
    Array.from(e.target.files).forEach(function(f){
      var img=document.createElement("img");
      img.style="width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border)";
      var reader=new FileReader();
      reader.onload=function(ev){img.src=ev.target.result;};
      reader.readAsDataURL(f);
      preview.appendChild(img);
    });
  });

  document.getElementById("btn-import-parse").addEventListener("click",parseImport);
}

async function parseImport(){
  var btn=document.getElementById("btn-import-parse");
  btn.disabled=true;btn.textContent="Analyzing...";

  var fileInput=document.getElementById("import-file");
  var textInput=document.getElementById("import-text").value.trim();
  var images=[];

  // Read images as base64
  if(fileInput.files.length>0){
    for(var i=0;i<fileInput.files.length;i++){
      var data=await new Promise(function(resolve){
        var r=new FileReader();
        r.onload=function(e){resolve(e.target.result.split(",")[1]);};
        r.readAsDataURL(fileInput.files[i]);
      });
      images.push({data:data,mediaType:fileInput.files[i].type||"image/jpeg"});
    }
  }

  if(!images.length&&!textInput){
    btn.disabled=false;btn.textContent="Analyze & Preview";
    showToast("Upload a photo or paste text","error");return;
  }

  var body={sport:currentSport};
  if(images.length)body.images=images;
  if(textInput)body.text=textInput;

  var r=await apiCall("/api/upload/import",{method:"POST",body:JSON.stringify(body)});
  btn.disabled=false;btn.textContent="Analyze & Preview";

  if(!r||!r.ok){
    showToast(r&&r.data?r.data.message:"Error parsing","error");return;
  }

  var workout=r.data.workout;
  if(!workout){showToast("Could not parse workout","error");return;}

  // Show preview
  var result=document.getElementById("import-result");
  result.style.display="block";
  result.innerHTML="<h3 style=\"margin:16px 0 8px;color:var(--accent)\">Preview</h3>"
    +renderWorkout(workout,false)
    +"<div style=\"display:flex;gap:8px;margin-top:12px\">"
    +"<button class=\"btn-approve\" id=\"btn-import-save\" style=\"flex:1\">Save as workout</button>"
    +"</div>";

  // Store for saving
  window._importedWorkout=workout;
  document.getElementById("btn-import-save").addEventListener("click",saveImportedWorkout);
}

async function saveImportedWorkout(){
  var w=window._importedWorkout;if(!w)return;
  var btn=document.getElementById("btn-import-save");
  if(btn){btn.disabled=true;btn.textContent="Saving...";}
  try{
    var r=await apiCall("/api/workouts/manual",{method:"POST",body:JSON.stringify({
      sport:currentSport,
      warmup:w.warmup||{rounds:1,exercises:[]},
      blocks:w.blocks||[],
      pattern:w.pattern||"IMPORTED",
      source:"imported"
    })});
    document.getElementById("modal").classList.add("hidden");
    if(r&&r.ok){
      currentWorkouts.push(r.data.workout);
      resetTabs();showVariant(currentWorkouts.length-1);
      showToast("Workout imported!","success");
    }else{
      showToast(r&&r.data?r.data.message:"Error saving workout","error");
      if(btn){btn.disabled=false;btn.textContent="Save as workout";}
    }
  }catch(e){
    showToast("Error: "+e.message,"error");
    if(btn){btn.disabled=false;btn.textContent="Save as workout";}
  }
}


