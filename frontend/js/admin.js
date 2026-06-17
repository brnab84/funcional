// admin.js — admin dashboard (only for role=admin)
function fmtDate(d){
  if(!d)return 'Never';
  var date=new Date(d);
  return date.toLocaleDateString()+' '+date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}
function timeAgo(d){
  if(!d)return 'never';
  var s=Math.floor((Date.now()-new Date(d).getTime())/1000);
  if(s<60)return s+'s ago';
  if(s<3600)return Math.floor(s/60)+'m ago';
  if(s<86400)return Math.floor(s/3600)+'h ago';
  return Math.floor(s/86400)+'d ago';
}

async function loadAdmin(){
  var statsEl=document.getElementById('admin-stats');
  var actEl=document.getElementById('admin-activity');
  var usersEl=document.getElementById('admin-users');
  statsEl.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
  actEl.innerHTML='';usersEl.innerHTML='';

  // Stats
  var rs=await apiCall('/api/admin/stats');
  if(!rs||!rs.ok){
    statsEl.innerHTML='<p style="color:var(--accent2)">'+((rs&&rs.data)?rs.data.message:'Error loading stats')+'</p>';
    return;
  }
  var s=rs.data;
  var cards=[
    {label:'Total Accounts',value:s.totalUsers,sub:'+'+s.newToday+' today'},
    {label:'Coaches',value:(s.coaches||0),sub:'profesores'},
    {label:'Athletes (coached)',value:(s.coachedAthletes||0),sub:'con profe'},
    {label:'Solo athletes',value:(s.soloAthletes||0),sub:'entrenan solos'},
    {label:'Active (24h)',value:s.activeToday,sub:s.active7d+' in 7d'},
    {label:'New (7 days)',value:s.new7d,sub:'accounts'},
    {label:'Total Logins',value:s.totalLogins,sub:'all time'},
    {label:'Approved Workouts',value:s.totalApprovedWorkouts,sub:'all users'}
  ];
  statsEl.innerHTML=cards.map(function(c){
    return '<div class="admin-stat-card"><div class="admin-stat-value">'+c.value+'</div>'
      +'<div class="admin-stat-label">'+c.label+'</div>'
      +'<div class="admin-stat-sub">'+c.sub+'</div></div>';
  }).join('');

  // Recent activity
  var ra=await apiCall('/api/admin/activity?limit=50');
  if(ra&&ra.ok&&ra.data.activity){
    if(ra.data.activity.length===0){
      actEl.innerHTML='<p style="color:var(--muted)">No login activity yet</p>';
    }else{
      actEl.innerHTML=ra.data.activity.map(function(a){
        return '<div class="admin-row"><div><strong>'+(a.name||a.email)+'</strong>'
          +'<span class="admin-row-sub">'+a.email+'</span></div>'
          +'<div class="admin-row-right">'+timeAgo(a.timestamp)+'<span class="admin-row-sub">'+fmtDate(a.timestamp)+'</span></div></div>';
      }).join('');
    }
  }

  // Users list
  var ru=await apiCall('/api/admin/users');
  if(ru&&ru.ok&&ru.data.users){
    usersEl.innerHTML=ru.data.users.map(function(u){
      var sportsList=(u.sports||[]).map(function(sp){return sp.type;}).join(', ')||'none';
      var roleBadge,extra;
      if(u.role==='admin'){roleBadge='<span class="admin-badge-role">ADMIN</span>';extra='';}
      else if(u.role==='coach'){roleBadge='<span class="admin-badge-role badge-coach">COACH</span>';extra=' · '+(u.studentCount||0)+' alumno'+(u.studentCount===1?'':'s');}
      else if(u.coachId){roleBadge='<span class="admin-badge-role badge-coached">ALUMNO</span>';extra=' · Coach: '+(u.coachName||'?');}
      else{roleBadge='<span class="admin-badge-role badge-solo">SOLO</span>';extra=' · entrena solo';}
      var delBtn=(u.role==='admin')?'':'<button class="admin-del" data-id="'+u._id+'" data-name="'+escapeHtml(u.name)+'" title="Delete account">&#10005;</button>';
      var planSel=(u.role==='coach')?'<select class="admin-plan" data-id="'+u._id+'" title="Plan">'+['free','pro','studio'].map(function(p){return '<option value="'+p+'"'+(((u.plan||'free')===p)?' selected':'')+'>'+p+'</option>';}).join('')+'</select>':'';
      var strongOn=((u.extraSports||[]).indexOf('strong')>=0);
      var sportGrant=(u.role==='admin')?'':'<label class="admin-grant" title="Dar acceso a Strong"><input type="checkbox" class="admin-sport-cb" data-id="'+u._id+'" data-sport="strong"'+(strongOn?' checked':'')+'> 🏋️</label>';
      return '<div class="admin-row"><div><strong>'+escapeHtml(u.name)+'</strong>'+roleBadge
        +'<span class="admin-row-sub">'+escapeHtml(u.email)+' · '+sportsList+extra+'</span></div>'
        +'<div class="admin-row-right"><div class="admin-row-meta">'+(u.loginCount||0)+' logins'
        +'<span class="admin-row-sub">last: '+timeAgo(u.lastLogin)+'</span></div>'+sportGrant+planSel+delBtn+'</div></div>';
    }).join('');
    usersEl.querySelectorAll('.admin-del').forEach(function(btn){
      btn.addEventListener('click',function(){deleteAccount(btn.dataset.id,btn.dataset.name);});
    });
    usersEl.querySelectorAll('.admin-plan').forEach(function(sel){
      sel.addEventListener('change',function(){changeUserPlan(sel.dataset.id,sel.value);});
    });
    usersEl.querySelectorAll('.admin-sport-cb').forEach(function(cb){
      cb.addEventListener('change',function(){grantSport(cb.dataset.id,cb.dataset.sport,cb.checked,cb);});
    });
  }
}

async function changeUserPlan(id,plan){
  var r=await apiCall('/api/admin/users/'+id+'/plan',{method:'PUT',body:JSON.stringify({plan:plan})});
  if(!r||!r.ok){showToast((r&&r.data)?r.data.message:'Could not update plan','error');return;}
  showToast('Plan → '+plan,'success');
}

async function seedStrongStarter(){
  var btn=document.getElementById('btn-strong-starter');if(btn){btn.disabled=true;btn.textContent='Sembrando...';}
  var r=await apiCall('/api/admin/strong-starter',{method:'POST'});
  if(btn){btn.disabled=false;btn.textContent='🏋 Sembrar aprendizaje Strong';}
  if(!r||!r.ok){showToast((r&&r.data)?r.data.message:'Error','error');return;}
  showToast('Aprendizaje Strong sembrado ('+r.data.exercises+' ejercicios)','success');
}

async function grantSport(id,sport,allow,cb){
  var r=await apiCall('/api/admin/users/'+id+'/sport-access',{method:'PUT',body:JSON.stringify({sport:sport,allow:allow})});
  if(!r||!r.ok){if(cb)cb.checked=!allow;showToast((r&&r.data)?r.data.message:'No se pudo','error');return;}
  showToast(allow?(sport+' activado'):(sport+' quitado'),'success');
}

async function deleteAccount(id,name){
  if(!confirm('Delete account "'+name+'"? This removes the user and all their data. This cannot be undone.'))return;
  var r=await apiCall('/api/admin/users/'+id,{method:'DELETE'});
  if(!r||!r.ok){showToast((r&&r.data)?r.data.message:'Could not delete','error');return;}
  showToast('Account deleted','info');
  loadAdmin();
}
