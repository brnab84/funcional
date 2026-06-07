// api.js — part of Functional WOD frontend
function authHeader(){return token?{'Authorization':'Bearer '+token,'Content-Type':'application/json'}:{'Content-Type':'application/json'};}
async function apiCall(url,options){
  options=options||{};
  try{
    var controller=new AbortController();
    var timeout=setTimeout(function(){controller.abort();},15000);
    var res=await fetch(API+url,{method:options.method||'GET',headers:Object.assign({},authHeader(),options.headers||{}),body:options.body||undefined,signal:controller.signal});
    clearTimeout(timeout);
    var data=await res.json();
    if(res.status===401){logout();return null;}
    return{ok:res.ok,data:data,status:res.status};
  }catch(e){
    if(e.name==='AbortError')return{ok:false,data:{message:'Request timed out'},status:408};
    return{ok:false,data:{message:e.message||'Network error'},status:0};
  }
}

