// ---------------------------------------------------------------------
// app.js — all application logic for the Ledger booking calendar.
// Booking data itself lives in data.js (see that file for how to swap
// in a real database later); this file only calls loadAppointments()
// and nextAppointmentId() and never touches the data source directly.
// ---------------------------------------------------------------------

// -- Translations -------------------------------------------------------
const I18N = {
  en: {
    tagline: "booking calendar",
    lightBtn: "Light", darkBtn: "Dark",
    tabCustomer: "Book a session", tabAdmin: "Administrator",
    roleCustomer: "Browse the week and request a time — the teacher will confirm or decline it.",
    roleAdmin: "Teacher view — accept or decline pending requests below or right on the calendar.",
    legPending: "Pending", legConfirmed: "Confirmed", legDeclined: "Declined",
    days: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    nbTitle: "New booking",
    nbSub: "Checked against existing times before it's sent.",
    lblName: "Your name", namePh: "e.g. Jordan Lee",
    lblContact: "Contact info",
    contactTypes: ["Phone number","Email","Telegram link","WhatsApp link"],
    contactPh: ["e.g. +1 555 123 4567","e.g. jordan.lee@example.com","e.g. https://t.me/jordanlee","e.g. https://wa.me/15551234567"],
    lblDay: "Day", lblStart: "Start time", lblDur: "Duration",
    durOpts: ["30 min","60 min","90 min","120 min"],
    bookBtn: "Request booking",
    errNameService: "Enter your name.",
    errContact: "Enter a way to reach you (phone, email, Telegram, or WhatsApp).",
    errClosing: "That booking runs past closing time (6pm).",
    errAdvance: "Bookings must be made at least 24 hours in advance. Pick a later time.",
    errConflict: (day,s,e) => `${day} ${s}\u2013${e} overlaps an existing booking. Choose a different time.`,
    okMsg: "Request sent \u2014 you'll show up as pending until the teacher responds.",
    reqTitle: "Requests",
    reqSub: (n) => `${n} waiting on your response`,
    noRequests: "No pending requests right now.",
    accept: "Accept", decline: "Decline", undo: "Undo",
    pwTitle: "Administrator access",
    pwHint: "Enter the password to accept or decline bookings.",
    pwPlaceholder: "Password",
    cancel: "Cancel", unlock: "Unlock",
    pwIncorrect: (n) => `Incorrect password. ${n} ${n===1?"try":"tries"} left.`,
    pwLocked: (t) => `Too many incorrect attempts. Try again in ${t}.`,
    hUnit: "h", mUnit: "m",
    statusLabel: { pending: "Pending", confirmed: "Confirmed", declined: "Declined" },
  },
  ru: {
    tagline: "календарь записи",
    lightBtn: "Светлая", darkBtn: "Тёмная",
    tabCustomer: "Записаться", tabAdmin: "Администратор",
    roleCustomer: "Просмотрите неделю и запросите время \u2014 преподаватель подтвердит или отклонит заявку.",
    roleAdmin: "Режим администратора \u2014 принимайте или отклоняйте заявки ниже или прямо в календаре.",
    legPending: "В ожидании", legConfirmed: "Подтверждено", legDeclined: "Отклонено",
    days: ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"],
    months: ["янв","фев","мар","апр","мая","июн","июл","авг","сен","окт","ноя","дек"],
    nbTitle: "Новая запись",
    nbSub: "Проверяется на пересечение с уже занятым временем перед отправкой.",
    lblName: "Ваше имя", namePh: "например, Иван Петров",
    lblContact: "Контакт",
    contactTypes: ["Номер телефона","Email","Ссылка Telegram","Ссылка WhatsApp"],
    contactPh: ["например, +7 999 123 45 67","например, ivan.petrov@example.com","например, https://t.me/ivanpetrov","например, https://wa.me/79991234567"],
    lblDay: "День", lblStart: "Время начала", lblDur: "Длительность",
    durOpts: ["30 мин","60 мин","90 мин","120 мин"],
    bookBtn: "Отправить заявку",
    errNameService: "Введите имя.",
    errContact: "Укажите способ связи (телефон, email, Telegram или WhatsApp).",
    errClosing: "Запись выходит за пределы рабочего времени (до 18:00).",
    errAdvance: "Запись возможна не позднее чем за 24 часа. Выберите более позднее время.",
    errConflict: (day,s,e) => `${day} ${s}\u2013${e} пересекается с уже существующей записью. Выберите другое время.`,
    okMsg: "Заявка отправлена \u2014 статус «в ожидании», пока преподаватель не ответит.",
    reqTitle: "Заявки",
    reqSub: (n) => `${n} ожида${n===1?"ет":"ют"} вашего ответа`,
    noRequests: "Сейчас нет заявок в ожидании.",
    accept: "Принять", decline: "Отклонить", undo: "Отменить",
    pwTitle: "Доступ администратора",
    pwHint: "Введите пароль, чтобы принимать или отклонять записи.",
    pwPlaceholder: "Пароль",
    cancel: "Отмена", unlock: "Войти",
    pwIncorrect: (n) => `Неверный пароль. Осталось попыток: ${n}.`,
    pwLocked: (t) => `Слишком много неверных попыток. Повторите через ${t}.`,
    hUnit: "ч", mUnit: "мин",
    statusLabel: { pending: "В ожидании", confirmed: "Подтверждено", declined: "Отклонено" },
  },
};

let lang = "en";
function L() { return I18N[lang]; }

const HOURS = Array.from({length: 11}, (_, i) => 8 + i);
const ROW_H = 64;

function startOfWeek(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0,0,0,0);
  return d;
}
function fmtTime(hour) {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,"0")}${ampm}`;
}

// -- State ---------------------------------------------------------------
// Appointment data comes from data.js — see that file for how to swap
// this for a real backend/database later.
let appointments = loadAppointments();

let weekStart = startOfWeek(new Date());
let mode = "customer"; // "customer" | "admin"

function getDays() {
  return Array.from({length:7}, (_,i) => { const d = new Date(weekStart); d.setDate(d.getDate()+i); return d; });
}

function getDateTime(dayIdx, hour) {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIdx);
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  d.setHours(h, m, 0, 0);
  return d;
}

function hasConflict(day, start, end, ignoreId) {
  return appointments.some(a =>
    a.day === day && a.status !== "declined" && a.id !== ignoreId &&
    start < a.end && end > a.start
  );
}

function contactLabel(type) {
  const t = L();
  const contactVals = ["phone","email","telegram","whatsapp"];
  const idx = contactVals.indexOf(type);
  return t.contactTypes[idx >= 0 ? idx : 0];
}

function decide(id, status) {
  const a = appointments.find(x => x.id === id);
  if (a) a.status = status;
  render();
}

function populateFormOptions() {
  const t = L();
  const dayEl = document.getElementById("fDay");
  const prevDay = dayEl.value;
  dayEl.innerHTML = t.days.map((d,i) => `<option value="${i}">${d}</option>`).join("");
  if (prevDay !== "") dayEl.value = prevDay;

  const startEl = document.getElementById("fStart");
  const prevStart = startEl.value;
  let opts = [];
  for (const h of HOURS.slice(0, -1)) {
    for (const m of [0, 30]) {
      const val = h + m/60;
      opts.push(`<option value="${val}">${fmtTime(val)}</option>`);
    }
  }
  startEl.innerHTML = opts.join("");
  if (prevStart !== "") startEl.value = prevStart;

  const durEl = document.getElementById("fDur");
  const prevDur = durEl.value;
  const durVals = ["0.5","1","1.5","2"];
  durEl.innerHTML = t.durOpts.map((label,i) => `<option value="${durVals[i]}">${label}</option>`).join("");
  if (prevDur !== "") durEl.value = prevDur;

  const contactVals = ["phone","email","telegram","whatsapp"];
  const contactEl = document.getElementById("fContactType");
  const prevContact = contactEl.value;
  contactEl.innerHTML = t.contactTypes.map((label,i) => `<option value="${contactVals[i]}">${label}</option>`).join("");
  if (prevContact !== "") contactEl.value = prevContact;
  updateContactPlaceholder();

  document.getElementById("fClient").placeholder = t.namePh;
}

function updateContactPlaceholder() {
  const t = L();
  const contactVals = ["phone","email","telegram","whatsapp"];
  const idx = contactVals.indexOf(document.getElementById("fContactType").value);
  document.getElementById("fContactValue").placeholder = t.contactPh[idx >= 0 ? idx : 0];
}

function applyStaticText() {
  const t = L();
  document.getElementById("tagline").textContent = t.tagline;
  document.getElementById("lightBtn").textContent = t.lightBtn;
  document.getElementById("darkBtn").textContent = t.darkBtn;
  document.getElementById("custTab").textContent = t.tabCustomer;
  document.getElementById("adminTab").textContent = t.tabAdmin;
  document.getElementById("legPending").textContent = t.legPending;
  document.getElementById("legConfirmed").textContent = t.legConfirmed;
  document.getElementById("legDeclined").textContent = t.legDeclined;
  document.getElementById("nbTitle").textContent = t.nbTitle;
  document.getElementById("nbSub").textContent = t.nbSub;
  document.getElementById("lblName").textContent = t.lblName;
  document.getElementById("lblContact").textContent = t.lblContact;
  document.getElementById("lblDay").textContent = t.lblDay;
  document.getElementById("lblStart").textContent = t.lblStart;
  document.getElementById("lblDur").textContent = t.lblDur;
  document.getElementById("bookBtn").textContent = t.bookBtn;
  document.getElementById("reqTitle").textContent = t.reqTitle;
  document.getElementById("pwTitleEl").textContent = t.pwTitle;
  document.getElementById("pwHintEl").textContent = t.pwHint;
  document.getElementById("pwInput").placeholder = t.pwPlaceholder;
  document.getElementById("pwCancel").textContent = t.cancel;
  document.getElementById("pwSubmit").textContent = t.unlock;
  document.getElementById("roleNote").textContent = mode === "customer" ? t.roleCustomer : t.roleAdmin;
}

function setLanguage(next) {
  lang = next;
  document.getElementById("enBtn").classList.toggle("active", next === "en");
  document.getElementById("ruBtn").classList.toggle("active", next === "ru");
  applyStaticText();
  populateFormOptions();
  render();
}

function onBook() {
  const t = L();
  const errEl = document.getElementById("errMsg");
  const okEl = document.getElementById("okMsg");
  errEl.classList.remove("show");
  okEl.classList.remove("show");

  const client = document.getElementById("fClient").value.trim();
  const contactType = document.getElementById("fContactType").value;
  const contactValue = document.getElementById("fContactValue").value.trim();
  const day = parseInt(document.getElementById("fDay").value, 10);
  const start = parseFloat(document.getElementById("fStart").value);
  const dur = parseFloat(document.getElementById("fDur").value);
  const end = start + dur;

  if (!client) {
    errEl.textContent = t.errNameService;
    errEl.classList.add("show");
    return;
  }
  if (!contactValue) {
    errEl.textContent = t.errContact;
    errEl.classList.add("show");
    return;
  }
  if (end > HOURS[HOURS.length - 1]) {
    errEl.textContent = t.errClosing;
    errEl.classList.add("show");
    return;
  }
  const selectedDateTime = getDateTime(day, start);
  const minAllowed = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (selectedDateTime < minAllowed) {
    errEl.textContent = t.errAdvance;
    errEl.classList.add("show");
    return;
  }
  if (hasConflict(day, start, end)) {
    errEl.textContent = t.errConflict(t.days[day], fmtTime(start), fmtTime(end));
    errEl.classList.add("show");
    return;
  }

  // TODO(database): once data.js talks to a real API, this should
  // become something like:
  //   const saved = await saveAppointment({ day, start, end, client, status: "pending", contactType, contactValue });
  //   appointments.push(saved);
  appointments.push({ id: nextAppointmentId(), day, start, end, client, status: "pending", contactType, contactValue });
  document.getElementById("fClient").value = "";
  document.getElementById("fContactValue").value = "";
  okEl.textContent = t.okMsg;
  okEl.classList.add("show");
  render();
}

function render() {
  const t = L();
  const days = getDays();
  const first = days[0], last = days[6];
  const sameMonth = first.getMonth() === last.getMonth();
  const a = `${t.months[first.getMonth()]} ${first.getDate()}`;
  const b = sameMonth ? `${last.getDate()}` : `${t.months[last.getMonth()]} ${last.getDate()}`;
  document.getElementById("rangeLabel").textContent = `${a} \u2013 ${b}, ${last.getFullYear()}`;

  const grid = document.getElementById("calGrid");
  let html = `<div class="head-cell"></div>`;
  const todayStr = new Date().toDateString();
  days.forEach((d,i) => {
    const isToday = d.toDateString() === todayStr;
    html += `<div class="head-cell${isToday ? " today" : ""}"><div class="dow">${t.days[i]}</div><div class="num">${isToday ? `<span class="num">${d.getDate()}</span>` : d.getDate()}</div></div>`;
  });

  html += `<div>` + HOURS.map(h => `<div class="time-cell">${fmtTime(h)}</div>`).join("") + `</div>`;

  days.forEach((d, dayIdx) => {
    const dayApts = appointments.filter(x => x.day === dayIdx);
    let inner = "";
    dayApts.forEach(x => {
      const top = (x.start - HOURS[0]) * ROW_H;
      const height = Math.max((x.end - x.start) * ROW_H - 4, 30);
      let actionsHtml = "";
      if (mode === "admin") {
        if (x.status === "pending" && height > 70) {
          actionsHtml = `<div class="actions">
            <button class="accept" onclick="decide(${x.id},'confirmed')">&#10003; ${t.accept}</button>
            <button class="decline" onclick="decide(${x.id},'declined')">&#10007; ${t.decline}</button>
          </div>`;
        } else if (x.status !== "pending" && height > 70) {
          actionsHtml = `<button class="undo" onclick="decide(${x.id},'pending')">&#8634; ${t.undo}</button>`;
        }
      }
      inner += `<div class="ticket ${x.status}" style="top:${top}px;height:${height}px">
        <span class="badge ${x.status}">${t.statusLabel[x.status]}</span>
        <div class="client">${x.client}</div>
        <div class="time">${fmtTime(x.start)} \u2013 ${fmtTime(x.end)}</div>
        ${actionsHtml}
      </div>`;
    });
    html += `<div class="day-col" style="height:${HOURS.length*ROW_H}px">${inner}</div>`;
  });

  grid.innerHTML = html;

  if (mode === "admin") {
    const pending = appointments.filter(x => x.status === "pending");
    document.getElementById("reqSub").textContent = t.reqSub(pending.length);
    const reqList = document.getElementById("reqList");
    if (pending.length === 0) {
      reqList.innerHTML = `<div class="empty">${t.noRequests}</div>`;
    } else {
      reqList.innerHTML = pending.map(x => `
        <div class="req-card">
          <div class="client">${x.client}</div>
          <div class="when">${t.days[x.day]} \u00b7 ${fmtTime(x.start)}\u2013${fmtTime(x.end)}</div>
          ${x.contactValue ? `<div class="contact">${contactLabel(x.contactType)}: ${x.contactValue}</div>` : ""}
          <div class="actions">
            <button class="accept" onclick="decide(${x.id},'confirmed')">&#10003; ${t.accept}</button>
            <button class="decline" onclick="decide(${x.id},'declined')">&#10007; ${t.decline}</button>
          </div>
        </div>`).join("");
    }
  }
}

function setMode(next) {
  mode = next;
  const t = L();
  document.getElementById("custTab").classList.toggle("active", next === "customer");
  document.getElementById("adminTab").classList.toggle("active", next === "admin");
  document.getElementById("custSidebar").classList.toggle("active", next === "customer");
  document.getElementById("adminSidebar").classList.toggle("active", next === "admin");
  document.getElementById("roleNote").textContent = next === "customer" ? t.roleCustomer : t.roleAdmin;
  render();
}

// -- Admin login (password + 24h lockout) --------------------------------
const ADMIN_PASSWORD = "OH2761BaL";
const MAX_TRIES = 3;
const LOCKOUT_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCK_KEY = "ledgerAdminLock";
let unlocked = false;

let memoryStore = {};
function storageGet(key) {
  try { return window.localStorage.getItem(key); }
  catch (e) { return memoryStore[key] ?? null; }
}
function storageSet(key, value) {
  try { window.localStorage.setItem(key, value); }
  catch (e) { memoryStore[key] = value; }
}

function getLockState() {
  const raw = storageGet(LOCK_KEY);
  let state = raw ? JSON.parse(raw) : { triesLeft: MAX_TRIES, lockoutUntil: null };
  if (state.lockoutUntil && Date.now() >= state.lockoutUntil) {
    state = { triesLeft: MAX_TRIES, lockoutUntil: null };
    storageSet(LOCK_KEY, JSON.stringify(state));
  }
  return state;
}
function saveLockState(state) {
  storageSet(LOCK_KEY, JSON.stringify(state));
}
function formatRemaining(ms) {
  const t = L();
  const totalMin = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}${t.mUnit}`;
  return `${h}${t.hUnit} ${m}${t.mUnit}`;
}

function openPwModal() {
  document.getElementById("pwOverlay").classList.add("show");
  document.getElementById("pwInput").value = "";
  document.getElementById("pwInput").focus();
  refreshPwModalState();
}
function closePwModal() {
  document.getElementById("pwOverlay").classList.remove("show");
}
function refreshPwModalState() {
  const t = L();
  const state = getLockState();
  const errEl = document.getElementById("pwError");
  const input = document.getElementById("pwInput");
  const submit = document.getElementById("pwSubmit");
  if (state.lockoutUntil) {
    const remaining = state.lockoutUntil - Date.now();
    errEl.textContent = t.pwLocked(formatRemaining(remaining));
    input.disabled = true;
    submit.disabled = true;
  } else {
    errEl.textContent = "";
    input.disabled = false;
    submit.disabled = false;
  }
}
function tryPassword() {
  const t = L();
  const state = getLockState();
  if (state.lockoutUntil) { refreshPwModalState(); return; }

  const entered = document.getElementById("pwInput").value;
  const errEl = document.getElementById("pwError");

  if (entered === ADMIN_PASSWORD) {
    unlocked = true;
    saveLockState({ triesLeft: MAX_TRIES, lockoutUntil: null });
    closePwModal();
    setMode("admin");
    return;
  }

  state.triesLeft -= 1;
  if (state.triesLeft <= 0) {
    state.lockoutUntil = Date.now() + LOCKOUT_MS;
    saveLockState(state);
    refreshPwModalState();
  } else {
    saveLockState(state);
    errEl.textContent = t.pwIncorrect(state.triesLeft);
    document.getElementById("pwInput").value = "";
    document.getElementById("pwInput").focus();
  }
}

// -- Wire up events & boot ------------------------------------------------
document.getElementById("custTab").onclick = () => setMode("customer");
document.getElementById("adminTab").onclick = () => {
  if (unlocked) { setMode("admin"); return; }
  openPwModal();
};
document.getElementById("pwCancel").onclick = closePwModal;
document.getElementById("pwSubmit").onclick = tryPassword;
document.getElementById("pwInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryPassword();
});

document.getElementById("prevBtn").onclick = () => { weekStart.setDate(weekStart.getDate() - 7); render(); };
document.getElementById("nextBtn").onclick = () => { weekStart.setDate(weekStart.getDate() + 7); render(); };
document.getElementById("bookBtn").onclick = onBook;
document.getElementById("fContactType").onchange = updateContactPlaceholder;

document.getElementById("lightBtn").onclick = function() {
  document.documentElement.classList.remove("dark");
  this.classList.add("active");
  document.getElementById("darkBtn").classList.remove("active");
};
document.getElementById("darkBtn").onclick = function() {
  document.documentElement.classList.add("dark");
  this.classList.add("active");
  document.getElementById("lightBtn").classList.remove("active");
};
document.getElementById("enBtn").onclick = () => setLanguage("en");
document.getElementById("ruBtn").onclick = () => setLanguage("ru");

applyStaticText();
populateFormOptions();
render();
