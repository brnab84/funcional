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
      var roleBadge=u.role==='admin'?'<span class="admin-badge-role">ADMIN</span>':'';
      return '<div class="admin-row"><div><strong>'+u.name+'</strong>'+roleBadge
        +'<span class="admin-row-sub">'+u.email+' · '+sportsList+'</span></div>'
        +'<div class="admin-row-right">'+(u.loginCount||0)+' logins'
        +'<span class="admin-row-sub">last: '+timeAgo(u.lastLogin)+'</span></div></div>';
    }).join('');
  }
}
