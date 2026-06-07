// state.js — part of Functional WOD frontend
var API='';
var VERSION='...';
var token=localStorage.getItem('wod_token');
var currentUser=null,currentWorkouts=[],activeVariant=0;
var currentSport=localStorage.getItem('wod_sport')||'functional';
var pendingPhotos=[];
var currentTheme=localStorage.getItem('wod_theme')||'dark';
var exerciseCache=[];
var SESSION_TIMEOUT=5*60*1000; // 5 minutes

