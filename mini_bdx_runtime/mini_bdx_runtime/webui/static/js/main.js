async function getJSON(url, opts = {}) {
  const res = await fetch(url, opts);
  return res.json();
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function setFootState(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = on ? "on" : "off";
  el.classList.toggle("on", !!on);
  el.classList.toggle("off", !on);
}

async function refreshHealth() {
  try {
    const j = await getJSON("/api/health");
    if (j.ok !== false) {
      setText("status-text", "en ligne");
      setText("version-text", j.version || "unknown");
    } else {
      setText("status-text", "erreur backend");
    }
  } catch {
    setText("status-text", "hors ligne");
  }
}

// Sound
async function listSounds() {
  const log = document.getElementById("sound-log");
  try {
    const j = await getJSON("/api/sound/list");
    const sel = document.getElementById("sound-select");
    sel.innerHTML = "";
    (j.sounds || []).forEach((name) => {
      const o = document.createElement("option");
      o.value = name;
      o.textContent = name;
      sel.appendChild(o);
    });
    log.textContent = `Trouvé ${j.sounds?.length || 0} son(s)`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

async function playSelectedSound() {
  const log = document.getElementById("sound-log");
  const sel = document.getElementById("sound-select");
  const name = sel.value;
  if (!name) {
    log.textContent = "Choisissez un son.";
    return;
  }
  try {
    const j = await getJSON(`/api/sound/play?name=${encodeURIComponent(name)}`, {
      method: "POST",
    });
    if (j.ok) log.textContent = `Joué: ${name}`;
    else log.textContent = `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

// Eyes
async function eyesOn() {
  const log = document.getElementById("eyes-log");
  try {
    const j = await getJSON("/api/eyes/on", { method: "POST" });
    log.textContent = j.ok ? "Yeux ON" : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}
async function eyesOff() {
  const log = document.getElementById("eyes-log");
  try {
    const j = await getJSON("/api/eyes/off", { method: "POST" });
    log.textContent = j.ok ? "Yeux OFF" : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}
async function eyesApplyMode() {
  const mode = document.getElementById("eyes-mode").value;
  const log = document.getElementById("eyes-log");
  try {
    const j = await getJSON("/api/eyes/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    log.textContent = j.ok ? `Mode: ${mode}` : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

// Projector
async function projectorDo(path, okText) {
  const log = document.getElementById("projector-log");
  try {
    const j = await getJSON(`/api/projector/${path}`, { method: "POST" });
    log.textContent = j.ok ? okText : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

// Antennas
let antennaDebounce = 0;
async function antennasSet(left, right) {
  const log = document.getElementById("antennas-log");
  try {
    const j = await getJSON("/api/antennas/set", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left, right }),
    });
    log.textContent = j.ok ? `L=${left ?? "-"} R=${right ?? "-"}` : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}
async function antennasPreset(name) {
  const log = document.getElementById("antennas-log");
  try {
    const j = await getJSON("/api/antennas/preset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    log.textContent = j.ok ? `Preset: ${name}` : `Erreur: ${j.error}`;
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

// Feet
async function refreshFeet() {
  const log = document.getElementById("feet-log");
  try {
    const j = await getJSON("/api/feet/status");
    if (j.ok) {
      setFootState("foot-left", j.left);
      setFootState("foot-right", j.right);
      log.textContent = "";
    } else {
      log.textContent = `Erreur: ${j.error}`;
    }
  } catch (e) {
    log.textContent = `Erreur: ${e}`;
  }
}

function setupEvents() {
  document.getElementById("btn-list-sounds").addEventListener("click", listSounds);
  document.getElementById("btn-play-sound").addEventListener("click", playSelectedSound);

  document.getElementById("btn-eyes-on").addEventListener("click", eyesOn);
  document.getElementById("btn-eyes-off").addEventListener("click", eyesOff);
  document.getElementById("btn-eyes-mode").addEventListener("click", eyesApplyMode);

  document.getElementById("btn-projector-on").addEventListener("click", () => projectorDo("on", "Projecteur ON"));
  document.getElementById("btn-projector-off").addEventListener("click", () => projectorDo("off", "Projecteur OFF"));
  document.getElementById("btn-projector-toggle").addEventListener("click", () => projectorDo("toggle", "Projecteur togglé"));

  const left = document.getElementById("antenna-left");
  const right = document.getElementById("antenna-right");
  const schedule = () => {
    clearTimeout(antennaDebounce);
    antennaDebounce = setTimeout(() => {
      antennasSet(parseFloat(left.value), parseFloat(right.value));
    }, 80);
  };
  left.addEventListener("input", schedule);
  right.addEventListener("input", schedule);
  document.querySelectorAll("button.preset").forEach((b) => {
    b.addEventListener("click", () => antennasPreset(b.dataset.preset));
  });

  document.getElementById("btn-feet-refresh").addEventListener("click", refreshFeet);
  const auto = document.getElementById("feet-auto");
  setInterval(() => {
    if (auto.checked) refreshFeet();
  }, 600);
}

window.addEventListener("DOMContentLoaded", () => {
  refreshHealth();
  listSounds();
  refreshFeet();
  setupEvents();
});


