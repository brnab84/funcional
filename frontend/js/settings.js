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
  var r=await apiCall('/api/auth/settings',{method:'PUT',body:JSON.stringify({blockCount:bc,blockModalities:bm,avoidRepeatDays:ad,theme:currentTheme,poolLength:poolLength,swimRestTimes:swimRestTimes})});
  if(r&&r.ok){currentUser.settings=r.data.settings;localStorage.setItem('wod_user',JSON.stringify(currentUser));showToast('Settings saved','success');}
}

