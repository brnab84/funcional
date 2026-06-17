// exercise-icons.js — consistent inline line-icon set for exercises.
// All icons share one style (24x24, no fill, stroke=currentColor) so they look
// uniform. The icon is derived from the exercise name/category, with a
// category fallback so EVERY exercise gets one (incl. custom + swimming).

var EX_ICONS = {
  // ── Functional: equipment / movement ──
  dumbbell:'<path d="M6.5 12h11"/><path d="M5 9v6"/><path d="M3 10v4"/><path d="M19 9v6"/><path d="M21 10v4"/>',
  barbell:'<path d="M4 12h16"/><path d="M6.5 9v6"/><path d="M9 8v8"/><path d="M15 8v8"/><path d="M17.5 9v6"/>',
  kettlebell:'<path d="M9.5 8.5a2.5 2.5 0 0 1 5 0"/><path d="M8.4 9.3C7 10.6 6.2 12.6 6.2 14.5A2.5 2.5 0 0 0 8.7 17h6.6a2.5 2.5 0 0 0 2.5-2.5c0-1.9-.8-3.9-2.2-5.2"/>',
  box:'<rect x="4" y="8" width="16" height="11" rx="1.2"/><path d="M4 12h16"/>',
  ball:'<circle cx="12" cy="12" r="7"/><path d="M5 12h14"/><path d="M12 5v14"/>',
  pullbar:'<path d="M4 6h16"/><path d="M8 6v3"/><path d="M16 6v3"/><circle cx="12" cy="12" r="2"/><path d="M12 14v5"/>',
  jumprope:'<path d="M7 5v5a5 7 0 0 0 10 0V5"/><circle cx="7" cy="5" r="1.2"/><circle cx="17" cy="5" r="1.2"/>',
  run:'<circle cx="13" cy="4" r="1.3"/><path d="M4 17l5 1 .9-1.7"/><path d="M15 21v-4l-4-3 1-6"/><path d="M7 12V9l5-1 3 3 3 1"/>',
  pulse:'<path d="M3 12h4l2-5 3 10 2-5h7"/>',
  bolt:'<path d="M13 3L5 13h5l-1 8 8-11h-5l1-7z"/>',
  abs:'<rect x="8.5" y="4" width="7" height="16" rx="3"/><path d="M8.5 10h7"/><path d="M8.5 14h7"/><path d="M12 4v16"/>',
  arm:'<path d="M6 20v-4a3 3 0 0 1 3-3h2a2 2 0 0 0 2-2V6"/><path d="M13 6.5a3.5 3.5 0 0 1 3.5 3.5c0 1.8-1.3 2.7-3.5 2.7"/><path d="M6 16.5c1.6 1.1 3.2 1.1 4.8 0"/>',
  leg:'<path d="M9 4v5l-2 11"/><path d="M9 9h6l2 11"/><path d="M15 4v5"/>',
  squat:'<circle cx="12" cy="4.3" r="1.5"/><path d="M12 6v3.5"/><path d="M12 9.5l-3 4 1 5.5"/><path d="M12 9.5l3 4-1 5.5"/><path d="M12 7.5l4-1"/>',
  lunge:'<circle cx="11" cy="4.3" r="1.5"/><path d="M11 6v4"/><path d="M11 10l4 3.5V20"/><path d="M11 10l-3.5 4L5 19"/>',
  deadlift:'<circle cx="9" cy="4.8" r="1.5"/><path d="M9 6.3c0 1.8 1.2 2.7 3 2.7"/><path d="M8.6 7l-1 6.5-1 5.5"/><path d="M7.6 13.5h4.4l1 5.5"/><path d="M5 16.5h14"/>',
  press:'<path d="M5 7h14"/><path d="M9.2 7l.8 3.5"/><path d="M14.8 7l-.8 3.5"/><circle cx="12" cy="12.3" r="1.6"/><path d="M12 14v6"/>',
  butterfly:'<path d="M12 8c-2-1.5-4-1.5-6 .3"/><path d="M12 8c2-1.5 4-1.5 6 .3"/><circle cx="12" cy="10" r="1.6"/><path d="M3 16.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/>',
  // ── Swimming ──
  swimmer:'<circle cx="7" cy="9" r="1.7"/><path d="M9 11c2.2-1.2 4.4-1 6.3 1L18 10"/><path d="M3 16.5c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0"/>',
  kickboard:'<rect x="6.5" y="3.5" width="11" height="13" rx="5"/><path d="M8.5 20c2 1 5 1 7 0"/>',
  buoy:'<path d="M12 4a3.6 3.6 0 1 0 0 7.2A3.6 3.6 0 1 1 12 19a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 1 1 12 4z"/>',
  paddles:'<path d="M8.5 4h5a3 3 0 0 1 3 3v5.5a5.5 5.5 0 0 1-11 0V7a3 3 0 0 1 3-3z"/><path d="M11 18.5V21"/>',
  goggles:'<circle cx="8" cy="12" r="3"/><circle cx="16" cy="12" r="3"/><path d="M11 12h2"/><path d="M5.2 10.8 3 9.8"/><path d="M18.8 10.8 21 9.8"/>',
  waves:'<path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  pause:'<rect x="7" y="5" width="3.4" height="14" rx="1"/><rect x="13.6" y="5" width="3.4" height="14" rx="1"/>'
};

// Functional + swimming category → fallback icon key
var EX_CAT_ICON = {
  lower:'leg', upper:'arm', core:'abs', conditioning:'pulse', power:'bolt',
  // Swimming
  stroke:'swimmer', kick:'kickboard', drill:'goggles', pull:'buoy',
  sprint:'bolt', endurance:'waves', rest:'pause'
};
// Strong has its own category names (and 'pull' means rows/pull-ups, not a buoy)
var STRONG_CAT_ICON = {
  legs:'squat', glutes:'leg', hamstrings:'deadlift', chest:'press',
  back:'pullbar', shoulders:'press', biceps:'arm', triceps:'arm', core:'abs'
};

var _ACCENTS={'á':'a','é':'e','í':'i','ó':'o','ú':'u','ü':'u','ñ':'n'};
function _normEx(s){ return String(s||'').toLowerCase().replace(/[áéíóúüñ]/g,function(c){return _ACCENTS[c]||c;}).replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim(); }

// Resolve the best icon key from an exercise name + category
function iconKeyForExercise(name, category, sport){
  var n = _normEx(name);
  // Strong: resolve fully here (Spanish vocabulary), never fall to swim/functional
  if(sport==='strong'){
    if(/sentadilla/.test(n)) return 'squat';
    if(/peso muerto|rumano/.test(n)) return 'deadlift';
    if(/femoral|isquio|camilla/.test(n)) return 'deadlift';
    if(/estocada|bulgara|zancada|lunge/.test(n)) return 'lunge';
    if(/dominada|jalon|dorsal|pull over/.test(n)) return 'pullbar';
    if(/prensa/.test(n)) return 'squat';
    if(/remo/.test(n)) return 'dumbbell';
    if(/press|militar|banca|apertura|pecho|flexion|vuelo|face pull|elevacion/.test(n)) return 'press';
    if(/curl|biceps/.test(n)) return 'arm';
    if(/dips|fondos|tricep|frances/.test(n)) return 'arm';
    if(/plancha|abs|abdomin|crunch|situp|pallof|vela|rueda/.test(n)) return 'abs';
    if(/hip thrust|gluteo|patada|abduct|aduct|pelvis|gemelo|step up/.test(n)) return 'leg';
    if(STRONG_CAT_ICON[category]) return STRONG_CAT_ICON[category];
    return 'dumbbell';
  }
  // Swimming-specific keywords
  if(/\b(kick|board|patada)\b/.test(n)) return 'kickboard';
  if(/\bbuoy|boya|pull buoy\b/.test(n)) return 'buoy';
  if(/\bpaddle|manopla\b/.test(n)) return 'paddles';
  if(/\b(drill|scull|catch up|fingertip|superman|fist|one arm|k d s|kds|im drill)\b/.test(n)) return 'goggles';
  if(/\b(butterfly|mariposa|fly)\b/.test(n)) return 'butterfly';
  if(/\b(freestyle|backstroke|breaststroke|medley|im|crol|espalda|pecho|stroke)\b/.test(n)) return 'swimmer';
  if(/\b(distance|continuous|endurance|distancia)\b/.test(n)) return 'waves';
  // Functional keywords
  if(/\b(kettlebell|kb|goblet)\b/.test(n)) return 'kettlebell';
  if(/\b(deadlift|rdl|hinge|good morning)\b/.test(n)) return 'deadlift';
  if(/\b(thruster|snatch|clean|barbell)\b/.test(n)) return 'barbell';
  if(/squat/.test(n)) return 'squat';
  if(/lunge/.test(n)) return 'lunge';
  if(/\b(press|jerk|overhead|ohp|handstand)\b/.test(n)) return 'press';
  if(/\b(box|cajon)\b/.test(n)) return 'box';
  if(/\b(wall ball|wallball|med ball|slam ball|ball)\b/.test(n)) return 'ball';
  if(/\b(pull up|pullup|chin|ring row|muscle up|t2b|toes to bar)\b/.test(n)) return 'pullbar';
  if(/\b(row)\b/.test(n)) return 'dumbbell';
  if(/\b(jump rope|jumprope|skip|double under|du)\b/.test(n)) return 'jumprope';
  if(/\b(run|carrera)\b/.test(n) && category!=='sprint') return 'run';
  if(/\b(burpee|mountain climber|sprawl|jumping jack|jack|wc wk)\b/.test(n)) return 'pulse';
  if(/\b(sit up|situp|crunch|abs|hollow|v up|vup|k2e|twist|roll up|plank)\b/.test(n)) return 'abs';
  if(/\b(push up|pushup|dip|tricep)\b/.test(n)) return 'arm';
  if(/\b(hip thrust|wall sit|glute|step up|calf)\b/.test(n)) return 'leg';
  // Category fallback
  if(sport==='strong' && STRONG_CAT_ICON[category]) return STRONG_CAT_ICON[category];
  if(EX_CAT_ICON[category]) return EX_CAT_ICON[category];
  return sport==='swimming' ? 'swimmer' : 'dumbbell';
}

function _exAttr(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Return an <span> with the icon SVG, coloured by category. Tappable to enlarge.
function exerciseIconHtml(name, category, sport){
  var key = iconKeyForExercise(name, category, sport);
  var inner = EX_ICONS[key] || EX_ICONS.dumbbell;
  return '<span class="ex-icon cat-'+(category||'lower')+'" role="button" tabindex="0" title="Tap to enlarge"'
    + ' data-ex-name="'+_exAttr(name)+'" data-ex-cat="'+_exAttr(category||'')+'" data-ex-sport="'+_exAttr(sport||'')+'">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + inner + '</svg></span>';
}

// Lightbox: show a large version of an exercise's icon + name
function showExerciseZoom(name, category, sport){
  var old = document.getElementById('ex-zoom'); if(old) old.remove();
  var key = iconKeyForExercise(name, category, sport);
  var inner = EX_ICONS[key] || EX_ICONS.dumbbell;
  var ov = document.createElement('div');
  ov.id = 'ex-zoom'; ov.className = 'ex-zoom';
  ov.innerHTML = '<div class="ex-zoom-card"><span class="ex-icon cat-'+(category||'lower')+' ex-zoom-icon">'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + inner + '</svg></span><div class="ex-zoom-name"></div></div>';
  ov.querySelector('.ex-zoom-name').textContent = name || '';
  ov.addEventListener('click', function(){ ov.remove(); });
  document.body.appendChild(ov);
}
