// theme.js — part of Functional WOD frontend
function applySportTheme(sport){
  currentSport=sport;
  var cfg=getSportConfig();
  // Body class
  document.body.className=cfg.bodyClass+' theme-'+currentTheme;
  // Meta theme
  var meta=document.getElementById('meta-theme');
  if(meta)meta.content=cfg.themeColor;
  // Auth screen
  var al=document.getElementById('auth-logo');if(al)al.textContent=cfg.logo;
  var at=document.getElementById('auth-title');if(at)at.textContent=cfg.title;
  // Nav
  var nl=document.getElementById('nav-logo');if(nl)nl.textContent=cfg.logo;
  var nt=document.getElementById('nav-title');if(nt)nt.textContent=cfg.title;
  // Today
  var tt=document.getElementById('today-title');if(tt)tt.textContent=cfg.todayTitle;
  // Update sport-specific category order for library
  document.title=cfg.title;
  // Page title
  document.title=cfg.title;
  // Highlight sport button
  document.querySelectorAll('.auth-sport-btn').forEach(function(btn){
    btn.classList.toggle('active',btn.dataset.sport===sport);
  });
  localStorage.setItem('wod_sport',sport);
  // Show/hide swimming-specific settings
  var swimCard=document.getElementById('swim-rest-card');
  if(swimCard)swimCard.style.display=(sport==='swimming')?'':'none';
  // Tools button (1RM/plates for strong, CSS zones for swimming)
  var toolsBtn=document.getElementById('btn-tools');
  if(toolsBtn)toolsBtn.style.display=(sport==='strong'||sport==='swimming')?'':'none';
}

function applyTheme(theme){
  currentTheme=theme;localStorage.setItem('wod_theme',theme);
  document.body.classList.remove('theme-dark','theme-ambient','theme-dim');
  document.body.classList.add('theme-'+theme);
  document.querySelectorAll('.theme-btn').forEach(function(b){b.classList.toggle('active',b.dataset.theme===theme);});
}

// Login screen uses one consistent brand (the default sport) without touching
// the user's saved sport — restored on showApp after they log in.
function applyAuthBrand(){
  var cfg=(SPORTS&&SPORTS.functional)?SPORTS.functional:getSportConfig();
  document.body.className=cfg.bodyClass+' theme-'+currentTheme;
  var meta=document.getElementById('meta-theme');if(meta)meta.content=cfg.themeColor;
  var al=document.getElementById('auth-logo');if(al)al.textContent=cfg.logo;
  var at=document.getElementById('auth-title');if(at)at.textContent=cfg.title;
}

