function seededRand(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rand()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
function pickBalanced(pool, count, rand) {
  const cats=['lower','upper','core','conditioning','power'];
  const sel=[], sh=shuffle(pool,rand);
  cats.forEach(cat=>{ if(sel.length>=count)return; const ex=sh.find(e=>e.category===cat&&!sel.find(s=>s.name===e.name)); if(ex)sel.push(ex); });
  sh.forEach(ex=>{ if(sel.length<count&&!sel.find(s=>s.name===ex.name))sel.push(ex); });
  return sel.slice(0,count);
}
const WARMUP=[
  {name:'Jumping Jacks',category:'conditioning',reps:['20','25','30']},
  {name:'Air Squats',category:'lower',reps:['10','15','20']},
  {name:'Mountain Climbers',category:'core',reps:['20','30','50']},
  {name:'Sprawl',category:'conditioning',reps:['7','10']},
  {name:'Shoulder Taps',category:'upper',reps:['10','15','20']},
  {name:'Sit Up',category:'core',reps:['15','20']},
  {name:'Push Up',category:'upper',reps:['10','15','20']},
  {name:'Abs Crunch',category:'core',reps:['20','25','30']},
  {name:'Abs Bike',category:'core',reps:['20','25','30']},
  {name:'Plank Get Up',category:'core',reps:['10']},
  {name:'Walking Kicks',category:'lower',reps:['5','10']},
  {name:'Espinales',category:'lower',reps:['15','20']},
  {name:'Abs Ball',category:'core',reps:['20','30']},
  {name:'Climbers',category:'conditioning',reps:['20','30','50']},
  {name:'Jump Rope',category:'conditioning',reps:['50','100','250','500']},
];
function buildWarmup(rand){
  const rounds=[3,4,5,7][Math.floor(rand()*4)];
  const count=[5,6,7][Math.floor(rand()*3)];
  const pool=shuffle(WARMUP,rand);
  return {rounds,exercises:pool.slice(0,count).map(ex=>({name:ex.name,reps:ex.reps[Math.floor(rand()*ex.reps.length)],category:ex.category}))};
}
function buildEMOM(pool,rand,label){
  const mins=[7,10,14,21][Math.floor(rand()*4)];
  const count=mins<=7?2:3;
  return {label,modality:'EMOM',config:`${mins}'`,exercises:pickBalanced(pool,count,rand).map(ex=>({name:ex.name,reps:['8','10','12','15'][Math.floor(rand()*4)],category:ex.category}))};
}
function buildOTM(pool,rand,label){
  const interval=[2,2.5,3,4][Math.floor(rand()*4)];
  const rounds=[5,6,7][Math.floor(rand()*3)];
  return {label,modality:'OTM',config:`OTM ${interval}' — ${rounds} rounds`,exercises:pickBalanced(pool,[4,5,6][Math.floor(rand()*3)],rand).map(ex=>({name:ex.name,reps:['10','12','15','20','30'][Math.floor(rand()*5)],category:ex.category}))};
}
function buildAMRAP(pool,rand,label){
  const mins=[5,8,9,10,12][Math.floor(rand()*5)];
  return {label,modality:'AMRAP',config:`${mins}'`,exercises:pickBalanced(pool,[4,5,6][Math.floor(rand()*3)],rand).map(ex=>({name:ex.name,reps:['8','10','12','15','20'][Math.floor(rand()*5)],category:ex.category}))};
}
function buildRounds(pool,rand,label){
  const rounds=[2,3,4,5][Math.floor(rand()*4)];
  return {label,modality:'ROUNDS',config:`${rounds} Rounds`,exercises:pickBalanced(pool,[4,5,6][Math.floor(rand()*3)],rand).map(ex=>({name:ex.name,reps:['10','15','20','30'][Math.floor(rand()*4)],category:ex.category}))};
}
function buildForTime(pool,rand){
  const reps=['20','25','30','40','50','100','150','200'];
  return [{label:'A',modality:'FOR TIME',config:'A Completar',exercises:pickBalanced(pool,[6,7,8,9][Math.floor(rand()*4)],rand).map(ex=>({name:ex.name,reps:reps[Math.floor(rand()*reps.length)],category:ex.category}))}];
}
function build45x15(pool,rand){
  const work=[40,45][Math.floor(rand()*2)],rest=[10,15][Math.floor(rand()*2)],series=[2,3][Math.floor(rand()*2)];
  const count=[7,8,9,10][Math.floor(rand()*4)];
  return [{label:'A',modality:'TABATA',config:`${work}"x${rest}" — ${series} series`,exercises:pickBalanced(pool,count,rand).map((ex,i)=>({name:ex.name,reps:`Station ${i+1}`,category:ex.category}))}];
}
function buildDescending(pool,rand){
  const scheme=['21-15-9','21-15-12-9','15-12-9'][Math.floor(rand()*3)];
  const half=Math.floor(pool.length/2);
  return [
    {label:'EC',modality:'DESCENDING',config:scheme,exercises:pickBalanced(pool.slice(0,half),[4,5][Math.floor(rand()*2)],rand).map(ex=>({name:ex.name,reps:scheme.split('-')[0],category:ex.category}))},
    buildRounds(pool.slice(half),rand,'A')
  ];
}
function buildZones(pool,rand){
  const zoneCount=[2,3][Math.floor(rand()*2)];
  const blocks=[],used=new Set();
  for(let z=1;z<=zoneCount;z++){
    const avail=pool.filter(e=>!used.has(e.name));
    const sel=pickBalanced(avail,[2,3][Math.floor(rand()*2)],rand);
    sel.forEach(e=>used.add(e.name));
    blocks.push({label:`Zone ${z}`,modality:'ZONES',config:`Zona ${z}`,exercises:sel.map(ex=>({name:ex.name,reps:['10','10+10','15','10+10+10'][Math.floor(rand()*4)],category:ex.category}))});
  }
  return blocks;
}
function buildRoundsInOut(pool,rand){
  const rounds=[3,4,5][Math.floor(rand()*3)];
  const inEx=pool.find(e=>e.category==='conditioning')||pool[0];
  const outEx=pool.find(e=>e.name.includes('Burpee'))||pool[pool.length-1];
  const main=pickBalanced(pool.filter(e=>e.name!==inEx.name&&e.name!==outEx.name),[4,5][Math.floor(rand()*2)],rand);
  return [{label:'A',modality:'ROUNDS',config:`IN + ${rounds} Rounds + OUT`,exercises:[
    {name:`IN: ${inEx.name}`,reps:['250','300','500'][Math.floor(rand()*3)],category:'conditioning'},
    ...main.map(ex=>({name:ex.name,reps:['10','15','20'][Math.floor(rand()*3)],category:ex.category})),
    {name:`OUT: ${outEx.name}`,reps:['20','25','30'][Math.floor(rand()*3)],category:'conditioning'}
  ]}];
}
function buildMultiEMOM(pool,rand,blockCount){
  const mins=[7,10][Math.floor(rand()*2)];
  const labels=['A','B','C','D'].slice(0,blockCount);
  const chunk=Math.ceil(pool.length/blockCount);
  return labels.map((label,i)=>{
    const sub=pool.slice(i*chunk,(i+1)*chunk);
    return {label,modality:'EMOM',config:`${mins}'`,exercises:pickBalanced(sub.length?sub:pool,[2,3][Math.floor(rand()*2)],rand).map(ex=>({name:ex.name,reps:['10','12','15'][Math.floor(rand()*3)],category:ex.category}))};
  });
}
function buildMixed(pool,rand,blockCount){
  const mods=['EMOM','OTM','AMRAP','ROUNDS'];
  const labels=['A','B','C','D'].slice(0,blockCount);
  const used=new Set();
  const chunk=Math.ceil(pool.length/blockCount);
  return labels.map((label,i)=>{
    let mod; do{mod=mods[Math.floor(rand()*mods.length)];}while(used.has(mod)&&used.size<mods.length);
    used.add(mod);
    const sub=pool.slice(i*chunk,(i+1)*chunk);
    const p=sub.length?sub:pool;
    if(mod==='EMOM')return buildEMOM(p,rand,label);
    if(mod==='OTM')return buildOTM(p,rand,label);
    if(mod==='AMRAP')return buildAMRAP(p,rand,label);
    return buildRounds(p,rand,label);
  });
}
function generateWorkout(exercisePool,seed,variantNum=1,recentExercises=[],userSettings={}){
  const rand=seededRand(`${seed}-v${variantNum}`);
  const blockCount=userSettings.blockCount||2;
  const blockModalities=userSettings.blockModalities||{};
  const recent=new Set(recentExercises.map(e=>e.toLowerCase()));
  let pool=exercisePool.filter(e=>!recent.has(e.name.toLowerCase()));
  if(pool.length<8)pool=exercisePool;
  const warmup=buildWarmup(rand);
  const sh=shuffle(pool,rand);
  const hasCustom=Object.values(blockModalities).some(m=>m&&m!=='random');
  let blocks=[],pattern='';
  if(hasCustom){
    const labels=['A','B','C','D'].slice(0,blockCount);
    const chunk=Math.ceil(sh.length/blockCount);
    blocks=labels.map((label,i)=>{
      const mod=(blockModalities[label]||'random').toUpperCase();
      const sub=sh.slice(i*chunk,(i+1)*chunk);
      const p=sub.length?sub:sh;
      if(mod==='EMOM')return buildEMOM(p,rand,label);
      if(mod==='OTM')return buildOTM(p,rand,label);
      if(mod==='AMRAP')return buildAMRAP(p,rand,label);
      if(mod==='ROUNDS')return buildRounds(p,rand,label);
      if(mod==='FOR TIME')return buildForTime(p,rand)[0];
      return buildRounds(p,rand,label);
    });
    pattern=`EC+${labels.join('')}`;
  } else {
    const patterns=['MULTI_EMOM','MULTI_EMOM','SINGLE_AMRAP','FOR_TIME','FOR_TIME','TABATA','ROUNDS_INOUT','ZONES','DESCENDING','MIXED'];
    pattern=patterns[Math.floor(rand()*patterns.length)];
    switch(pattern){
      case 'MULTI_EMOM': blocks=buildMultiEMOM(sh,rand,blockCount); break;
      case 'SINGLE_AMRAP': blocks=[buildAMRAP(sh,rand,'A')]; break;
      case 'FOR_TIME': blocks=buildForTime(sh,rand); break;
      case 'TABATA': blocks=build45x15(sh,rand); break;
      case 'ROUNDS_INOUT': blocks=buildRoundsInOut(sh,rand); break;
      case 'ZONES': blocks=buildZones(sh,rand); break;
      case 'DESCENDING': blocks=buildDescending(sh,rand); break;
      default: blocks=buildMixed(sh,rand,blockCount);
    }
  }
  return {warmup,blocks,pattern};
}
module.exports={generateWorkout};
