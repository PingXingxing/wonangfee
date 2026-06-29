const defaults = {
  salary: 10000,
  startTime: "09:00",
  endTime: "18:30",
  workdays: 22,
};

const storageKey = "wonangfee-settings";
const amountEl = document.querySelector("#earned-amount");
const statusEl = document.querySelector("#status-line");
const tickEl = document.querySelector("#tick-badge");
const mainMascot = document.querySelector(".bear-worker");
const sidekickMascot = document.querySelector(".sidekick-worker");
const dialog = document.querySelector("#settings-dialog");
const form = document.querySelector("#settings-form");
const salaryInput = document.querySelector("#salary");
const startInput = document.querySelector("#start-time");
const endInput = document.querySelector("#end-time");
const workdaysInput = document.querySelector("#workdays");
const openSettings = document.querySelector("#open-settings");
const closeSettings = document.querySelector("#close-settings");
const resetSettings = document.querySelector("#reset-settings");

let settings = loadSettings();
let lastWholeSecond = -1;
let tickTimer;
let currentPhase = "";

const mascotAssets = {
  before: {
    main: "./assets/before-main.gif",
    sidekick: "./assets/before-sidekick.gif",
  },
  working: {
    main: "./assets/bear-worker.gif",
    sidekick: "./assets/sidekick-worker.gif",
  },
  after: {
    main: "./assets/after-main.gif",
    sidekick: "./assets/after-sidekick.gif",
  },
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return normalizeSettings({ ...defaults, ...saved });
  } catch {
    return { ...defaults };
  }
}

function normalizeSettings(nextSettings) {
  const salary = Number(nextSettings.salary);
  const workdays = Number(nextSettings.workdays);

  return {
    salary: Number.isFinite(salary) ? Math.max(0, salary) : defaults.salary,
    startTime: nextSettings.startTime || defaults.startTime,
    endTime: nextSettings.endTime || defaults.endTime,
    workdays: Math.min(
      31,
      Math.max(1, Number.isFinite(workdays) ? workdays : defaults.workdays),
    ),
  };
}

function saveSettings() {
  localStorage.setItem(storageKey, JSON.stringify(settings));
}

function syncForm() {
  salaryInput.value = settings.salary;
  startInput.value = settings.startTime;
  endInput.value = settings.endTime;
  workdaysInput.value = settings.workdays;
}

function parseMinutes(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function getWorkWindow(now) {
  const startMinutes = parseMinutes(settings.startTime);
  const endMinutes = parseMinutes(settings.endTime);
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function getRates(now) {
  const { start, end } = getWorkWindow(now);
  const workSeconds = Math.max(1, (end - start) / 1000);
  const dayPay = settings.salary / settings.workdays;
  const secondPay = dayPay / workSeconds;
  return { start, end, workSeconds, dayPay, secondPay };
}

function getEarned(now) {
  const { start, end, dayPay, secondPay } = getRates(now);

  if (now <= start) {
    return {
      earned: 0,
      secondPay,
      phase: "before",
    };
  }

  if (now >= end) {
    return {
      earned: dayPay,
      secondPay,
      phase: "after",
    };
  }

  return {
    earned: ((now - start) / 1000) * secondPay,
    secondPay,
    phase: "working",
  };
}

function formatMoney(value, digits = 2) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function updateStatus(phase) {
  const copy = {
    before: "还没开工，窝囊费暂未到账",
    working: "正在到账，锦言已进入工作状态",
    after: "今日窝囊费已结算完毕",
  };
  statusEl.textContent = copy[phase];
}

function updateMascots(phase) {
  if (phase === currentPhase) {
    return;
  }

  const assets = mascotAssets[phase];
  mainMascot.src = assets.main;
  sidekickMascot.src = assets.sidekick;
  currentPhase = phase;
}

function pulseTick(secondPay) {
  tickEl.textContent = `+¥${formatMoney(secondPay, 4)}`;
  tickEl.classList.add("is-visible");
  window.clearTimeout(tickTimer);
  tickTimer = window.setTimeout(() => {
    tickEl.classList.remove("is-visible");
  }, 420);
}

function render() {
  const now = new Date();
  const { earned, secondPay, phase } = getEarned(now);
  amountEl.textContent = formatMoney(earned, 4);
  updateStatus(phase);
  updateMascots(phase);

  const wholeSecond = Math.floor(now.getTime() / 1000);
  if (wholeSecond !== lastWholeSecond) {
    lastWholeSecond = wholeSecond;
    if (phase === "working") {
      pulseTick(secondPay);
    }
  }

  window.requestAnimationFrame(render);
}

openSettings.addEventListener("click", () => {
  syncForm();
  dialog.showModal();
});

closeSettings.addEventListener("click", () => {
  dialog.close();
});

resetSettings.addEventListener("click", () => {
  settings = { ...defaults };
  saveSettings();
  syncForm();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  settings = normalizeSettings({
    salary: salaryInput.value,
    startTime: startInput.value,
    endTime: endInput.value,
    workdays: workdaysInput.value,
  });
  saveSettings();
  dialog.close();
});

dialog.addEventListener("click", (event) => {
  if (event.target === dialog) {
    dialog.close();
  }
});

syncForm();
render();
