// settings.js — part of Functional WOD frontend
function loadUserSettings(){
  if(!currentUser||!currentUser.settings)return;var s=currentUser.settings;
  document.querySelectorAll('.bc-btn').forEach(function(btn){btn.classList.toggle('active',parseInt(btn.dataset.count)===(s.blockCount||2));});
  renderBlockModalities(s.blockCount||2,s.blockModalities||{});
  if(s.theme){currentTheme=s.theme;applyTheme(s.theme);}
  // Load swim rest times
  var srt=s.swimRestTimes||{};
  if(document.getElementById('rest-50')){
    document.getElementById('rest-50').value=srt.d50||30;
    document.getElementById('rest-100').value=srt.d100||45;
    document.getElementById('rest-200').value=srt.d200||60;
    document.getElementById('rest-300').value=srt.d300||75;
    document.getElementById('rest-400').value=srt.d400||90;
    document.getElementById('rest-500').value=srt.d500||120;
    document.getElementById('pool-length').value=s.poolLength||25;
  }
  document.getElementById('avoid-days').value=s.avoidRepeatDays||7;document.getElementById('days-label').textContent=s.avoidRepeatDays||7;
  renderSportOptions();
}

// Per-sport options panel (schema-driven from SPORTS[sport].settings)
function renderSportOptions(){
  var body=document.getElementById('sport-options-body');if(!body)return;
  var cfg=getSportConfig();var schema=cfg.settings||[];
  var titleEl=document.getElementById('sport-options-title');if(titleEl)titleEl.textContent=(cfg.title||'Sport')+' · opciones';
  var saved=((currentUser&&currentUser.settings&&currentUser.settings.sportConfig)||{})[currentSport]||{};
  window._sportOpts={};
  schema.forEach(function(f){window._sportOpts[f.key]=(saved[f.key]!==undefined)?saved[f.key]:f.def;});
  if(!schema.length){body.innerHTML='<p class="card-hint">Sin opciones específicas.</p>';return;}
  body.innerHTML=schema.map(function(f){
    var val=window._sportOpts[f.key];
    var chips=f.options.map(function(o){
      var active=(f.type==='multi')?(Array.isArray(val)&&val.indexOf(o)>=0):(val===o);
      return '<button type="button" class="opt-chip'+(active?' active':'')+'" data-key="'+f.key+'" data-val="'+o+'" data-type="'+f.type+'">'+o+'</button>';
    }).join('');
    return '<div class="opt-row"><div class="opt-label">'+f.label+'</div><div class="opt-chips">'+chips+'</div></div>';
  }).join('');
  body.querySelectorAll('.opt-chip').forEach(function(btn){btn.addEventListener('click',function(){toggleSportOpt(btn);});});
}
function toggleSportOpt(btn){
  var key=btn.dataset.key,val=btn.dataset.val,type=btn.dataset.type;
  if(type==='multi'){
    var arr=Array.isArray(window._sportOpts[key])?window._sportOpts[key].slice():[];
    var i=arr.indexOf(val);if(i>=0)arr.splice(i,1);else arr.push(val);
    window._sportOpts[key]=arr;btn.classList.toggle('active');
  }else{
    window._sportOpts[key]=val;
    document.querySelectorAll('.opt-chip[data-key="'+key+'"]').forEach(function(b){b.classList.toggle('active',b.dataset.val===val);});
  }
}
function renderBlockModalities(count,mods){
  var labels=['A','B','C','D'].slice(0,count);
  var opts=(getSportConfig().blockModalities)||['random','EMOM','OTM','AMRAP','ROUNDS','FOR TIME','TABATA'];
  document.getElementById('block-modalities').innerHTML=labels.map(function(label){
    return'<label class="field" style="margin-top:12px"><span>Block '+label+'</span><select class="block-mod-select" data-label="'+label+'">'+opts.map(function(o){return'<option value="'+o+'"'+((mods[label]||'random')===o?' selected':'')+'>'+(o==='random'?'Random':o)+'</option>';}).join('')+'</select></label>';
  }).join('');
}
async function saveSetting(){
  var bc=parseInt((document.querySelector('.bc-btn.active')||{}).dataset.count)||2;var bm={};
  document.querySelectorAll('.block-mod-select').forEach(function(sel){bm[sel.dataset.label]=sel.value;});
  var ad=parseInt(document.getElementById('avoid-days').value);
  var swimRestTimes=null;
  if(currentSport==='swimming'){
    swimRestTimes={
      d50:parseInt(document.getElementById('rest-50').value)||30,
      d100:parseInt(document.getElementById('rest-100').value)||45,
      d200:parseInt(document.getElementById('rest-200').value)||60,
      d300:parseInt(document.getElementById('rest-300').value)||75,
      d400:parseInt(document.getElementById('rest-400').value)||90,
      d500:parseInt(document.getElementById('rest-500').value)||120
    };
  }
  var poolLength=parseInt(document.getElementById('pool-length').value)||25;
  var sportConfig={};sportConfig[currentSport]=window._sportOpts||{};
  var r=await apiCall('/api/auth/settings',{method:'PUT',body:JSON.stringify({blockCount:bc,blockModalities:bm,avoidRepeatDays:ad,theme:currentTheme,poolLength:poolLength,swimRestTimes:swimRestTimes,sportConfig:sportConfig})});
  if(r&&r.ok){currentUser.settings=r.data.settings;localStorage.setItem('wod_user',JSON.stringify(currentUser));showToast('Settings saved','success');}
}

