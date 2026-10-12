// app.js — Enregistreur audio PWA
// Développé selon les spécifications du cours (Cheatsheet, td8-pwa-notes, whatpwacando.today)

// ============================================================================
// 1. SERVICE WORKER & MISE À JOUR (Cheatsheet §2, §7)
// ============================================================================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      console.log("✅ SW enregistré avec succès :", registration.scope);

      // Détection de mise à jour prête (Cheatsheet §7)
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("⚡ Nouvelle version disponible !");
            const updateBanner = document.getElementById("update-banner");
            const btnUpdate = document.getElementById("btn-update");
            if (updateBanner) updateBanner.style.display = "flex";
            if (btnUpdate) {
              btnUpdate.onclick = () => newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          }
        });
      });
    })
    .catch((err) => console.error("❌ Erreur enregistrement SW :", err));

  // Recharger automatiquement lorsque le nouveau Service Worker prend le contrôle
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🔄 Nouveau Service Worker actif, rechargement...");
    window.location.reload();
  });
}

// ============================================================================
// 2. BASE DE DONNÉES INDEXEDDB AVEC LA LIBRAIRIE IDB (Cheatsheet §8)
// ============================================================================
const DB_NAME = "audio-recordings-db";
const DB_VERSION = 1;
const STORE_NAME = "recordings";

const dbPromise = idb.openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      console.log("📦 Store IndexedDB « recordings » créé");
    }
  },
});

async function getAllRecordings() {
  const db = await dbPromise;
  return await db.getAll(STORE_NAME);
}

async function saveRecording(item) {
  const db = await dbPromise;
  return await db.add(STORE_NAME, item);
}

async function deleteRecording(id) {
  const db = await dbPromise;
  return await db.delete(STORE_NAME, id);
}

async function updateRecordingTitle(id, newTitle) {
  const db = await dbPromise;
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.title = newTitle;
    await db.put(STORE_NAME, item);
  }
}

// ============================================================================
// 3. ÉTAT DU RÉSEAU & UX HORS-LIGNE (Cheatsheet §9, td8-pwa-notes)
// ============================================================================
const networkBadge = document.getElementById("network-status");
const toastEl = document.getElementById("toast");

function showToast(message, duration = 3000) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), duration);
}

function updateNetworkStatus() {
  const isOnline = navigator.onLine;
  if (networkBadge) {
    networkBadge.textContent = isOnline ? "En ligne" : "Hors ligne";
    networkBadge.className = `network-badge ${isOnline ? "online" : "offline"}`;
  }
}

window.addEventListener("online", () => {
  updateNetworkStatus();
  showToast("🌐 Connexion rétablie !");
});

window.addEventListener("offline", () => {
  updateNetworkStatus();
  showToast("📴 Mode hors ligne — Enregistrements stockés en local");
});

updateNetworkStatus();

// ============================================================================
// 4. INSTALLATION CUSTOM PWA (Cheatsheet §6 + Mobile / iOS)
// ============================================================================
let deferredPrompt = null;
const btnInstallSidebar = document.getElementById("btn-install");
const btnInstallHeader = document.getElementById("btn-install-header");
const iosModal = document.getElementById("ios-install-modal");
const btnCloseIosModal = document.getElementById("btn-close-ios-modal");
const btnCloseIosModalX = document.getElementById("btn-close-ios-modal-x");

// Détection de l'environnement
const isStandalone =
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS =
  /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function showInstallButtons() {
  if (isStandalone) return;
  if (btnInstallSidebar) btnInstallSidebar.style.display = "inline-flex";
  if (btnInstallHeader) btnInstallHeader.style.display = "inline-flex";
}

function hideInstallButtons() {
  if (btnInstallSidebar) btnInstallSidebar.style.display = "none";
  if (btnInstallHeader) btnInstallHeader.style.display = "none";
}

// 1. Android / Chrome / Edge : capture de beforeinstallprompt
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButtons();
  console.log("💡 Événement beforeinstallprompt capturé");
});

// Action au clic sur installer
async function handleInstallClick() {
  if (deferredPrompt) {
    // Navigateurs supportant beforeinstallprompt (Android / Chrome Desktop)
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(outcome === "accepted" ? "App installée" : "Installation annulée");
    deferredPrompt = null;
    hideInstallButtons();
  } else if (isIOS) {
    // iOS Safari n'a pas beforeinstallprompt -> afficher les instructions
    if (iosModal) iosModal.style.display = "flex";
  } else {
    // Autre navigateur (ex: Firefox)
    showToast("ℹ️ Utilisez le menu de votre navigateur pour 'Installer' ou 'Ajouter à l'écran d'accueil'");
  }
}

if (btnInstallSidebar) btnInstallSidebar.addEventListener("click", handleInstallClick);
if (btnInstallHeader) btnInstallHeader.addEventListener("click", handleInstallClick);

// 2. Gestion de la modal iOS
if (isIOS && !isStandalone) {
  // Sur iOS, afficher directement le bouton d'aide à l'installation
  showInstallButtons();
}

function closeIosModal() {
  if (iosModal) iosModal.style.display = "none";
}

if (btnCloseIosModal) btnCloseIosModal.addEventListener("click", closeIosModal);
if (btnCloseIosModalX) btnCloseIosModalX.addEventListener("click", closeIosModal);
if (iosModal) {
  iosModal.addEventListener("click", (e) => {
    if (e.target === iosModal) closeIosModal();
  });
}

// 3. Événement post-installation
window.addEventListener("appinstalled", () => {
  console.log("🎉 Application installée sur l'appareil");
  hideInstallButtons();
  showToast("🎉 Application installée avec succès !");
});

// ============================================================================
// 5. NAVIGATION MOBILE PAR ONGLETS (Responsive)
// ============================================================================
const appLayout = document.getElementById("app-layout");
const tabBtnRecorder = document.getElementById("tab-btn-recorder");
const tabBtnList = document.getElementById("tab-btn-list");

if (tabBtnRecorder && tabBtnList) {
  tabBtnRecorder.addEventListener("click", () => {
    tabBtnRecorder.classList.add("active");
    tabBtnList.classList.remove("active");
    appLayout.classList.remove("show-list");
  });

  tabBtnList.addEventListener("click", () => {
    tabBtnList.classList.add("active");
    tabBtnRecorder.classList.remove("active");
    appLayout.classList.add("show-list");
  });
}

// ============================================================================
// 6. CAPACITÉ APPAREIL : MICROPHONE & ENREGISTREMENT AUDIO
//    (Permissions demandées à l'action, gestion refus, MediaRecorder, AudioContext)
// ============================================================================
const btnRecord = document.getElementById("btn-record");
const btnStop = document.getElementById("btn-stop");
const statusText = document.getElementById("status");
const statusDot = document.getElementById("status-dot");
const timerDisplay = document.getElementById("recording-timer");
const canvas = document.getElementById("audio-visualizer");
const canvasCtx = canvas ? canvas.getContext("2d") : null;

let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;
let audioContext = null;
let analyser = null;
let animationId = null;
let timerInterval = null;
let recordingSeconds = 0;
let wakeLock = null;

// Gestion de la veille d'écran (Screen Wake Lock API - whatpwacando.today)
async function requestWakeLock() {
  if ("wakeLock" in navigator) {
    try {
      wakeLock = await navigator.wakeLock.request("screen");
    } catch (err) {
      console.warn("Wake Lock non activé :", err);
    }
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().then(() => (wakeLock = null));
  }
}

// Visualisation du signal audio en temps réel
function drawVisualizer() {
  if (!analyser || !canvasCtx) return;

  const width = canvas.width;
  const height = canvas.height;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function render() {
    animationId = requestAnimationFrame(render);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = "#0f172a";
    canvasCtx.fillRect(0, 0, width, height);

    const barCount = 32;
    const barWidth = (width / barCount) - 3;
    const step = Math.floor(bufferLength / barCount);

    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i * step] || 0;
      const barHeight = Math.max(4, (value / 255) * (height - 12));
      const x = i * (barWidth + 3);
      const y = height - barHeight;

      // Dégradé avec la couleur thématique de l'icône (#ff2b4b)
      const grad = canvasCtx.createLinearGradient(0, height, 0, 0);
      grad.addColorStop(0, "#ff2b4b");
      grad.addColorStop(1, "#ffcdcd");

      canvasCtx.fillStyle = grad;
      canvasCtx.beginPath();
      canvasCtx.roundRect ? canvasCtx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]) : canvasCtx.fillRect(x, y, barWidth, barHeight);
      canvasCtx.fill();
    }
  }

  render();
}

function drawIdleVisualizer() {
  if (!canvasCtx) return;
  const width = canvas.width;
  const height = canvas.height;

  canvasCtx.fillStyle = "#0f172a";
  canvasCtx.fillRect(0, 0, width, height);

  const barCount = 32;
  const barWidth = (width / barCount) - 3;

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + 3);
    const barHeight = 4;
    const y = height - barHeight;
    canvasCtx.fillStyle = "rgba(255, 205, 205, 0.25)";
    canvasCtx.fillRect(x, y, barWidth, barHeight);
  }
}

drawIdleVisualizer();

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Démarrer l'enregistrement
btnRecord.addEventListener("click", async () => {
  // Vérification de la capacité microphone
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    statusText.textContent = "Microphone non supporté par ce navigateur";
    showToast("⚠️ API microphone indisponible sur cet appareil");
    return;
  }

  try {
    statusText.textContent = "Demande d'accès au micro...";
    
    // Demande de permission uniquement lors du clic utilisateur (exigence TP)
    audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Initialisation du MediaRecorder
    let mimeType = "audio/webm";
    if (!MediaRecorder.isTypeSupported("audio/webm")) {
      mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
    }
    mediaRecorder = mimeType ? new MediaRecorder(audioStream, { mimeType }) : new MediaRecorder(audioStream);

    audioChunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      const recordDuration = recordingSeconds || 1;

      // Sauvegarde dans IndexedDB (Cheatsheet §8)
      const now = new Date();
      const dateStr = now.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const newRecord = {
        title: `Note du ${now.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
        blob: audioBlob,
        duration: recordDuration,
        timestamp: Date.now(),
        dateStr: dateStr,
      };

      try {
        await saveRecording(newRecord);
        showToast("✅ Note vocale enregistrée !");
        loadAndDisplayRecordings();
      } catch (err) {
        console.error("Erreur sauvegarde IndexedDB :", err);
      }

      // Nettoyage des pistes audio
      audioStream.getTracks().forEach((track) => track.stop());
      releaseWakeLock();
    };

    // Configuration Web Audio API pour le visualiseur en direct
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 64;
    const sourceNode = audioContext.createMediaStreamSource(audioStream);
    sourceNode.connect(analyser);

    mediaRecorder.start();
    requestWakeLock();

    // Mise à jour de l'interface
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnRecord.classList.add("recording");
    statusDot.classList.add("recording");
    statusText.textContent = "Enregistrement en cours...";

    recordingSeconds = 0;
    timerDisplay.textContent = "00:00";
    timerInterval = setInterval(() => {
      recordingSeconds++;
      timerDisplay.textContent = formatTime(recordingSeconds);
    }, 1000);

    drawVisualizer();
  } catch (error) {
    console.warn("Accès micro refusé ou impossible :", error);
    // Gestion propre du refus de permission (Critère TP : message convivial, pas d'erreur crash)
    statusText.textContent = "Accès micro refusé. Veuillez l'autoriser.";
    showToast("⚠️ Permission microphone refusée");
    btnRecord.disabled = false;
    btnStop.disabled = true;
    btnRecord.classList.remove("recording");
    statusDot.classList.remove("recording");
  }
});

// Arrêter l'enregistrement
btnStop.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (animationId) cancelAnimationFrame(animationId);
  if (audioContext && audioContext.state !== "closed") audioContext.close();
  if (timerInterval) clearInterval(timerInterval);

  btnRecord.disabled = false;
  btnStop.disabled = true;
  btnRecord.classList.remove("recording");
  statusDot.classList.remove("recording");
  statusText.textContent = "Prêt";
  timerDisplay.textContent = "00:00";

  drawIdleVisualizer();
});

// ============================================================================
// 7. GESTION DE LA LISTE DES NOTES (Affichage, Écoute, Téléchargement, Suppression)
// ============================================================================
const recordingsList = document.getElementById("recordings-list");
const emptyState = document.getElementById("empty-state");
const notesCountBadge = document.getElementById("notes-count");
const mobileNotesCountBadge = document.getElementById("mobile-notes-count");
const searchInput = document.getElementById("search-input");

let currentRecordings = [];

function createSampleAudioBlob() {
  const sampleRate = 8000;
  const duration = 2;
  const numSamples = sampleRate * duration;
  const buffer = new ArrayBuffer(44 + numSamples);
  const view = new DataView(buffer);

  function writeString(offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples, true);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * 440 * (i / sampleRate));
    view.setUint8(44 + i, Math.floor((sample + 1) * 127.5));
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

const btnAddSample = document.getElementById("btn-add-sample");
if (btnAddSample) {
  btnAddSample.addEventListener("click", async () => {
    const now = new Date();
    const demoItem = {
      title: `Mémo vocal de démonstration #${currentRecordings.length + 1}`,
      blob: createSampleAudioBlob(),
      duration: 2,
      timestamp: Date.now(),
      dateStr: now.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    };
    await saveRecording(demoItem);
    showToast("✨ Exemple de test ajouté au stockage !");
    loadAndDisplayRecordings();
  });
}

async function loadAndDisplayRecordings() {
  try {
    currentRecordings = await getAllRecordings();
    currentRecordings.sort((a, b) => b.timestamp - a.timestamp);
    renderList(currentRecordings);
  } catch (err) {
    console.error("Erreur chargement IndexedDB :", err);
  }
}

function renderList(list) {
  recordingsList.innerHTML = "";

  const count = list.length;
  if (notesCountBadge) notesCountBadge.textContent = count;
  if (mobileNotesCountBadge) mobileNotesCountBadge.textContent = count;

  if (count === 0) {
    if (emptyState) emptyState.classList.add("visible");
    return;
  }

  if (emptyState) emptyState.classList.remove("visible");

  list.forEach((item) => {
    const li = document.createElement("li");
    li.className = "recording-card";
    li.dataset.id = item.id;

    // URL locale du blob audio et métadonnées de fichier
    const audioUrl = URL.createObjectURL(item.blob);
    const fileInfo = getAudioFileInfo(item.blob, item.title);

    li.innerHTML = `
      <div class="card-top">
        <div class="card-title-group">
          <span class="recording-title" title="Cliquer pour renommer">${escapeHtml(item.title)}</span>
          <span class="recording-date">${item.dateStr || "Enregistrement"}</span>
        </div>
        <span class="duration-pill">${formatTime(item.duration || 0)}</span>
      </div>

      <div class="card-audio-container">
        <audio controls src="${audioUrl}" preload="metadata"></audio>
      </div>

      <div class="card-actions">
        ${navigator.share ? `<button class="card-btn card-btn-share" title="Partager"><span class="icon">📤</span> Partager</button>` : ""}
        <a class="card-btn card-btn-download" href="${audioUrl}" download="${fileInfo.fileName}" title="Télécharger">
          <span class="icon">💾</span> Sauvegarder
        </a>
        <button class="card-btn card-btn-delete" title="Supprimer">
          <span class="icon">🗑</span> Supprimer
        </button>
      </div>
    `;

    // Événement renommage au clic sur le titre
    const titleEl = li.querySelector(".recording-title");
    titleEl.addEventListener("click", () => {
      const newTitle = prompt("Renommer cette note :", item.title);
      if (newTitle && newTitle.trim() !== "") {
        item.title = newTitle.trim();
        titleEl.textContent = item.title;
        updateRecordingTitle(item.id, item.title);
      }
    });

    // Événement suppression
    const btnDelete = li.querySelector(".card-btn-delete");
    btnDelete.addEventListener("click", async () => {
      if (confirm(`Supprimer « ${item.title} » ?`)) {
        await deleteRecording(item.id);
        URL.revokeObjectURL(audioUrl);
        showToast("🗑 Note supprimée");
        loadAndDisplayRecordings();
      }
    });

    // Événement partage natif (Web Share API - whatpwacando.today)
    const btnShare = li.querySelector(".card-btn-share");
    if (btnShare) {
      btnShare.addEventListener("click", async () => {
        try {
          const file = new File([item.blob], fileInfo.fileName, { type: fileInfo.mimeType });

          // 1. Essai de partage de fichier audio natif
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: item.title,
              text: `Écouter ma note vocale : ${item.title}`,
            });
            showToast("📤 Note partagée avec succès !");
            return;
          }

          // 2. Si le partage de fichier n'est pas permis sur cet OS (ex: Desktop Windows), partage textuel + téléchargement
          if (navigator.share) {
            showToast("💾 Partage de fichiers non supporté : note téléchargée");
            const a = document.createElement("a");
            a.href = audioUrl;
            a.download = fileInfo.fileName;
            a.click();
            await navigator.share({
              title: item.title,
              text: `Note vocale : ${item.title}`,
            });
          }
        } catch (err) {
          if (err.name === "AbortError") {
            // L'utilisateur a simplement fermé la fenêtre de partage sans choisir d'app
            return;
          }
          console.warn("Erreur partage :", err);
          showToast("⚠️ Partage impossible : fichier téléchargé en secours");
          const a = document.createElement("a");
          a.href = audioUrl;
          a.download = fileInfo.fileName;
          a.click();
        }
      });
    }

    recordingsList.appendChild(li);
  });
}

// Recherche / Filtre en direct
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderList(currentRecordings);
      return;
    }
    const filtered = currentRecordings.filter((rec) =>
      rec.title.toLowerCase().includes(query)
    );
    renderList(filtered);
  });
}

// Utilitaires de sécurité et formatage
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function slugify(text) {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '') || "audio-note";
}

function getAudioFileInfo(blob, title) {
  const rawType = (blob && blob.type ? blob.type : "").toLowerCase();
  let mimeType = "audio/webm";
  let ext = "webm";

  if (rawType.includes("wav")) {
    mimeType = "audio/wav";
    ext = "wav";
  } else if (rawType.includes("mp4") || rawType.includes("m4a")) {
    mimeType = "audio/mp4";
    ext = "mp4";
  } else if (rawType.includes("ogg")) {
    mimeType = "audio/ogg";
    ext = "ogg";
  } else if (rawType.includes("mpeg") || rawType.includes("mp3")) {
    mimeType = "audio/mpeg";
    ext = "mp3";
  } else {
    mimeType = "audio/webm";
    ext = "webm";
  }

  const fileName = `${slugify(title)}.${ext}`;
  return { mimeType, ext, fileName };
}

// Chargement initial des notes sauvegardées
loadAndDisplayRecordings();