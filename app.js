const STORAGE_KEY = "functional-workouts-v3";

const baseExercises = [
  ["Air squats", "lower body"],
  ["Alternating lunges", "lower body"],
  ["Backpack deadlifts", "lower body"],
  ["Step-ups", "lower body"],
  ["Push-ups", "upper body"],
  ["Chair dips", "upper body"],
  ["Band rows", "upper body"],
  ["Dumbbell shoulder press", "upper body"],
  ["Front plank", "core"],
  ["Side plank", "core"],
  ["Bicycle crunches", "core"],
  ["Mountain climbers", "core"],
  ["Burpees", "conditioning"],
  ["Jumping jacks", "conditioning"],
  ["High knees", "conditioning"],
  ["Lateral hops", "conditioning"],
  ["Kettlebell swings", "power"],
  ["Thrusters", "power"],
  ["Wall balls", "power"],
  ["Dumbbell cleans", "power"]
].map(([name, category], index) => ({ id: `base-${index}`, name, category }));

const warmupMoves = [
  ["2 min easy march or jog", "conditioning"],
  ["10 arm circles each way", "upper body"],
  ["10 hip openers per side", "lower body"],
  ["12 inchworms", "core"],
  ["15 glute bridges", "lower body"],
  ["20 jumping jacks", "conditioning"],
  ["10 scapular push-ups", "upper body"],
  ["30 sec hollow hold", "core"]
].map(([prescription, category], index) => ({ id: `warmup-${index}`, name: prescription, category }));

const modalities = [
  {
    name: "AMRAP",
    type: "circuit",
    duration: "18 min",
    title: "As many rounds as possible",
    notes: "Hold a steady pace. Record completed rounds and extra reps.",
    reps: ["12", "10", "14", "8", "20", "30 sec"]
  },
  {
    name: "EMOM",
    type: "interval",
    intervals: [1],
    duration: "16 min",
    title: "Every minute on the minute",
    notes: "One station per minute. Choose a variant that leaves 15-20 seconds to reset.",
    reps: []
  },
  {
    name: "OTM",
    type: "interval",
    intervals: [1, 2, 2.5, 3],
    duration: "Variable",
    title: "On the minute rotation",
    notes: "Rotate through stations on the chosen interval. Pick one variant per station.",
    reps: []
  },
  {
    name: "E2MOM",
    type: "interval",
    intervals: [2],
    duration: "20 min",
    title: "Every 2 minutes on the minute",
    notes: "Complete one station every two minutes and use the remaining time to recover.",
    reps: []
  },
  {
    name: "For Time",
    type: "circuit",
    duration: "Cap 22 min",
    title: "Finish the circuit as fast as possible",
    notes: "Prioritize technique. If form breaks, reduce reps or scale the movement.",
    reps: ["30", "24", "20", "18", "16", "12"]
  },
  {
    name: "Tabata",
    type: "circuit",
    duration: "8 rounds",
    title: "20 seconds work, 10 seconds rest",
    notes: "Alternate movements each interval. Focus on clean power.",
    reps: ["20 sec", "20 sec", "20 sec", "20 sec", "20 sec", "20 sec"]
  },
  {
    name: "Chipper",
    type: "circuit",
    duration: "25 min",
    title: "One long pass through the list",
    notes: "Complete each block before moving on. Rest short and often.",
    reps: ["50", "40", "35", "30", "25", "20"]
  }
];

const els = {
  modeBadge: document.querySelector("#modeBadge"),
  durationBadge: document.querySelector("#durationBadge"),
  levelBadge: document.querySelector("#levelBadge"),
  sourceBadge: document.querySelector("#sourceBadge"),
  workoutTitle: document.querySelector("#workoutTitle"),
  warmupList: document.querySelector("#warmupList"),
  mainList: document.querySelector("#mainList"),
  workoutNotes: document.querySelector("#workoutNotes"),
  exerciseCount: document.querySelector("#exerciseCount"),
  exerciseList: document.querySelector("#exerciseList"),
  historyList: document.querySelector("#historyList"),
  exerciseForm: document.querySelector("#exerciseForm"),
  exerciseInput: document.querySelector("#exerciseInput"),
  categoryInput: document.querySelector("#categoryInput"),
  intensityInput: document.querySelector("#intensityInput"),
  sizeInput: document.querySelector("#sizeInput"),
  sizeOutput: document.querySelector("#sizeOutput"),
  avoidRecentInput: document.querySelector("#avoidRecentInput"),
  todayBtn: document.querySelector("#todayBtn"),
  customBtn: document.querySelector("#customBtn"),
  saveBtn: document.querySelector("#saveBtn"),
  clearBtn: document.querySelector("#clearBtn"),
  aiBtn: document.querySelector("#aiBtn"),
  aiStatus: document.querySelector("#aiStatus"),
  aiProvider: document.querySelector("#aiProvider")
};

let state = loadState();
let currentWorkout = null;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { exercises: baseExercises, history: [] };
  }

  try {
    const parsed = JSON.parse(saved);
    return {
      exercises: parsed.exercises?.length ? parsed.exercises : baseExercises,
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return { exercises: baseExercises, history: [] };
  }
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function seededRandom(seedText) {
  let seed = 0;
  for (let i = 0; i < seedText.length; i += 1) {
    seed = (seed * 31 + seedText.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function shuffle(items, random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function workoutExerciseNames(workout) {
  return [...(workout.warmup || []), ...(workout.main || workout.exercises || [])].map((exercise) => exercise.name);
}

function recentExerciseNames() {
  return new Set(state.history.slice(0, 5).flatMap(workoutExerciseNames));
}

function pickBalancedExercises(pool, wantedSize, random) {
  const categories = ["lower body", "upper body", "core", "conditioning", "power"];
  const selected = [];

  categories.forEach((category) => {
    const match = pool.find((exercise) => exercise.category === category && !selected.includes(exercise));
    if (match && selected.length < wantedSize) selected.push(match);
  });

  pool.forEach((exercise) => {
    if (selected.length < wantedSize && !selected.includes(exercise)) selected.push(exercise);
  });

  return selected.slice(0, wantedSize);
}

function formatInterval(minutes) {
  if (minutes === 1) return "1 min";
  if (minutes === 2.5) return "2.5 min";
  return `${minutes} min`;
}

function intervalWorkWindow(minutes) {
  if (minutes === 1) return "35-45 sec";
  if (minutes === 2) return "70-85 sec";
  if (minutes === 2.5) return "90-105 sec";
  return "2:00-2:15";
}

function categoryPrescription(category, minutes, intensity) {
  const hard = intensity === "hard";
  const easy = intensity === "easy";
  const table = {
    "lower body": {
      1: easy ? "6-8 controlled reps" : hard ? "10-12 reps" : "8-10 reps",
      2: easy ? "10-12 controlled reps" : hard ? "16-20 reps" : "12-16 reps",
      2.5: easy ? "12-16 controlled reps" : hard ? "20-24 reps" : "16-20 reps",
      3: easy ? "16-20 controlled reps" : hard ? "24-30 reps" : "20-24 reps"
    },
    "upper body": {
      1: easy ? "5-7 clean reps" : hard ? "8-12 reps" : "6-10 reps",
      2: easy ? "8-10 clean reps" : hard ? "14-18 reps" : "10-14 reps",
      2.5: easy ? "10-12 clean reps" : hard ? "18-22 reps" : "12-18 reps",
      3: easy ? "12-16 clean reps" : hard ? "22-28 reps" : "16-22 reps"
    },
    core: {
      1: easy ? "25 sec hold/work" : hard ? "45 sec work" : "35 sec work",
      2: easy ? "45 sec work" : hard ? "75 sec work" : "60 sec work",
      2.5: easy ? "60 sec work" : hard ? "90 sec work" : "75 sec work",
      3: easy ? "75 sec work" : hard ? "2:00 work" : "90 sec work"
    },
    conditioning: {
      1: easy ? "25 sec easy pace" : hard ? "45 sec hard pace" : "35 sec steady pace",
      2: easy ? "50 sec easy pace" : hard ? "80 sec hard pace" : "65 sec steady pace",
      2.5: easy ? "65 sec easy pace" : hard ? "100 sec hard pace" : "80 sec steady pace",
      3: easy ? "80 sec easy pace" : hard ? "2:00 hard pace" : "95 sec steady pace"
    },
    power: {
      1: easy ? "5-6 light reps" : hard ? "8-10 crisp reps" : "6-8 crisp reps",
      2: easy ? "8-10 light reps" : hard ? "14-16 crisp reps" : "10-12 crisp reps",
      2.5: easy ? "10-12 light reps" : hard ? "16-20 crisp reps" : "12-16 crisp reps",
      3: easy ? "12-16 light reps" : hard ? "20-24 crisp reps" : "16-20 crisp reps"
    }
  };
  return table[category]?.[minutes] || `${intervalWorkWindow(minutes)} work`;
}

function variantForCategory(category, minutes, exerciseName, pool, random) {
  const sameCategory = shuffle(pool.filter((item) => item.category === category && item.name !== exerciseName), random);
  const alternate = sameCategory[0]?.name || exerciseName;
  const easyMap = {
    "lower body": "bodyweight version or reduced range",
    "upper body": "incline or band-assisted version",
    core: "shorter hold with knees down",
    conditioning: "step-through version at easy pace",
    power: "light load, slow reset between reps"
  };
  const hardMap = {
    "lower body": "tempo reps or loaded version",
    "upper body": "strict reps or harder angle",
    core: "longer lever or no-rest version",
    conditioning: "faster pace without losing form",
    power: "slightly heavier load, still crisp"
  };

  return [
    { label: "A", text: `${categoryPrescription(category, minutes, "mixed")} ${exerciseName}` },
    { label: "B", text: `${categoryPrescription(category, minutes, "easy")} ${easyMap[category] || "scaled version"}` },
    { label: "C", text: `${categoryPrescription(category, minutes, "hard")} ${alternate} (${hardMap[category] || "advanced version"})` }
  ];
}

function buildIntervalBlock(modality, pool, wantedSize, random, intensity) {
  const interval = modality.intervals[Math.floor(random() * modality.intervals.length)];
  const stations = Math.min(wantedSize, interval >= 2.5 ? 4 : 5);
  const rounds = interval >= 2.5 ? 2 : 3;
  const selected = pickBalancedExercises(pool, stations, random);
  const totalMinutes = stations * rounds * interval;
  const intervalLabel = formatInterval(interval);

  return {
    duration: `${rounds} rounds x ${stations} stations x ${intervalLabel} (${totalMinutes} min)`,
    notes: `${modality.notes} Each station should fit inside ${intervalWorkWindow(interval)} and leave recovery time.`,
    main: selected.map((exercise, index) => ({
      ...exercise,
      prescription: `${modality.name} ${intervalLabel} - Station ${index + 1}`,
      variants: variantForCategory(exercise.category, interval, exercise.name, pool, random)
    }))
  };
}

function buildCircuitBlock(modality, pool, wantedSize, random) {
  return {
    duration: modality.duration,
    notes: modality.notes,
    main: pickBalancedExercises(pool, wantedSize, random).map((exercise, index) => ({
      ...exercise,
      prescription: modality.reps[index % modality.reps.length]
    }))
  };
}

function generateWorkout(seed = localDateKey()) {
  const random = seededRandom(`${seed}-${state.history.length}-${els.intensityInput.value}`);
  const modality = modalities[Math.floor(random() * modalities.length)];
  const wantedSize = Number(els.sizeInput.value);
  const recent = recentExerciseNames();
  const avoidRecent = els.avoidRecentInput.checked;

  let pool = shuffle(state.exercises, random);
  if (avoidRecent) {
    pool = [
      ...pool.filter((exercise) => !recent.has(exercise.name)),
      ...pool.filter((exercise) => recent.has(exercise.name))
    ];
  }

  const warmup = shuffle(warmupMoves, random).slice(0, 4).map((move) => ({
    name: move.name,
    category: move.category,
    prescription: ""
  }));

  const block = modality.type === "interval"
    ? buildIntervalBlock(modality, pool, wantedSize, random, els.intensityInput.value)
    : buildCircuitBlock(modality, pool, wantedSize, random);

  currentWorkout = {
    id: `${Date.now()}`,
    date: localDateKey(),
    modality: modality.name,
    duration: block.duration,
    title: modality.title,
    notes: block.notes,
    intensity: els.intensityInput.value,
    source: "Local",
    warmup,
    main: block.main
  };

  renderWorkout();
}

function normalizeAiWorkout(workout) {
  return {
    id: `${Date.now()}`,
    date: localDateKey(),
    modality: workout.modality || "AI",
    duration: workout.duration || "Coach pick",
    title: workout.title || "AI generated workout",
    notes: workout.notes || "Review the movements and scale as needed.",
    intensity: workout.intensity || els.intensityInput.value,
    source: workout.source || "AI",
    warmup: Array.isArray(workout.warmup) ? workout.warmup : [],
    main: Array.isArray(workout.main) ? workout.main : []
  };
}

function renderExerciseList(target, exercises) {
  target.innerHTML = "";
  exercises.forEach((exercise) => {
    const item = document.createElement("li");
    const prefix = exercise.prescription ? `${exercise.prescription} ` : "";
    item.textContent = `${prefix}${exercise.name}`;
    if (Array.isArray(exercise.variants) && exercise.variants.length) {
      const variants = document.createElement("div");
      variants.className = "variants";
      exercise.variants.forEach((variant) => {
        const chip = document.createElement("span");
        chip.textContent = `${variant.label}: ${variant.text}`;
        variants.append(chip);
      });
      item.append(variants);
    }
    target.append(item);
  });
}

function renderWorkout() {
  if (!currentWorkout) return;
  els.modeBadge.textContent = currentWorkout.modality;
  els.durationBadge.textContent = currentWorkout.duration;
  els.levelBadge.textContent = currentWorkout.intensity;
  els.sourceBadge.textContent = currentWorkout.source || "Local";
  els.workoutTitle.textContent = currentWorkout.title;
  els.workoutNotes.textContent = currentWorkout.notes;
  renderExerciseList(els.warmupList, currentWorkout.warmup || []);
  renderExerciseList(els.mainList, currentWorkout.main || []);
}

function renderExercises() {
  els.exerciseCount.textContent = `${state.exercises.length} exercises`;
  els.exerciseList.innerHTML = "";

  state.exercises.forEach((exercise) => {
    const button = document.createElement("button");
    button.className = "exercise-pill";
    button.type = "button";
    button.title = "Remove exercise";
    button.textContent = `${exercise.name} - ${exercise.category}`;
    button.addEventListener("click", () => {
      state.exercises = state.exercises.filter((item) => item.id !== exercise.id);
      persist();
      renderExercises();
    });
    els.exerciseList.append(button);
  });
}

function renderHistory() {
  els.historyList.innerHTML = "";

  if (!state.history.length) {
    const empty = document.createElement("p");
    empty.className = "notes";
    empty.textContent = "No saved workouts yet. Generate one, then save it if you like it.";
    els.historyList.append(empty);
    return;
  }

  state.history.slice(0, 10).forEach((entry) => {
    const item = document.createElement("button");
    item.className = "history-item";
    item.type = "button";
    item.innerHTML = `<strong>${entry.date} - ${entry.modality}</strong><span>${entry.title}</span><small>${(entry.main || []).map((exercise) => exercise.name).join(", ")}</small>`;
    item.addEventListener("click", () => {
      currentWorkout = entry;
      renderWorkout();
    });
    els.historyList.append(item);
  });
}

function saveCurrentWorkout() {
  if (!currentWorkout) return;
  state.history = [currentWorkout, ...state.history.filter((entry) => entry.id !== currentWorkout.id)].slice(0, 90);
  persist();
  renderHistory();
  els.saveBtn.textContent = "Saved";
  setTimeout(() => {
    els.saveBtn.textContent = "Save workout";
  }, 1400);
}

async function generateWithAi() {
  els.aiBtn.disabled = true;
  els.aiStatus.textContent = "Asking the AI coach...";

  try {
    const response = await fetch("/api/ai-workout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: localDateKey(),
        intensity: els.intensityInput.value,
        size: Number(els.sizeInput.value),
        avoidRecent: els.avoidRecentInput.checked,
        exercises: state.exercises,
        history: state.history.slice(0, 8)
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "AI server is not configured yet.");
    }

    currentWorkout = normalizeAiWorkout(payload.workout);
    renderWorkout();
    els.aiProvider.textContent = payload.provider || "AI";
    els.aiStatus.textContent = "AI proposal ready. Save it only if you like it.";
  } catch (error) {
    els.aiStatus.textContent = `${error.message} Local generation is still available.`;
  } finally {
    els.aiBtn.disabled = false;
  }
}

els.exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = els.exerciseInput.value.trim();
  if (!name) return;

  state.exercises.push({
    id: `custom-${Date.now()}`,
    name,
    category: els.categoryInput.value
  });
  els.exerciseInput.value = "";
  persist();
  renderExercises();
});

els.sizeInput.addEventListener("input", () => {
  els.sizeOutput.textContent = els.sizeInput.value;
});

els.todayBtn.addEventListener("click", () => generateWorkout(localDateKey()));
els.customBtn.addEventListener("click", () => generateWorkout(`${Date.now()}`));
els.saveBtn.addEventListener("click", saveCurrentWorkout);
els.aiBtn.addEventListener("click", generateWithAi);
els.clearBtn.addEventListener("click", () => {
  state.history = [];
  persist();
  renderHistory();
});

renderExercises();
renderHistory();
generateWorkout(localDateKey());
