/*
  HEARTOPIA MEMORY GARDEN
  -----------------------
  Galería frontend + carga local + conexión opcional a un feed JSON de Google Apps Script.

  Para conectar Drive:
  1) Publica un Apps Script que devuelva JSON con este formato:
     [{ "name":"Atardecer", "url":"https://.../imagen.jpg", "category":"places", "date":"2026.11" }]
  2) Pega la URL de implementación en DRIVE_FEED_URL.
  3) En Drive, las imágenes deben tener permisos de lectura para los visitantes,
     o el endpoint debe entregar URLs accesibles/autorizadas para cada usuario.

  Las imágenes elegidas desde el botón o arrastradas se previsualizan en el navegador.
  No se suben a Google Drive automáticamente.
*/

const DRIVE_FEED_URL = "https://script.google.com/macros/s/AKfycbzPxZ4ZPgP2yazquQuzQRT36eNjMn9W_zOnPcXMWrDQs6MgRuVSiNtDS8vJx5OZlkZH/exec"; // Pega aquí la URL de tu Apps Script cuando esté preparado.

function isNightMode() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7;
}

// Array VACÍO al inicio - se carga de Drive
let photos = [];
let activeFilter = "all";
let lightboxIndex = 0;
let toastTimer;

const gallery = document.querySelector("#gallery");
const fileInput = document.querySelector("#fileInput");
const lightbox = document.querySelector("#lightbox");

// Cargar fotos de Drive al iniciar
async function loadDrivePhotos() {
  try {
    showToast("Cargando recuerdos de Drive...");
    const resp = await fetch(DRIVE_FEED_URL, { method: 'GET' });
    const result = await resp.json();
    if (result.success && result.photos) {
      photos = result.photos;
      showToast(`${photos.length} recuerdos cargados`);
    } else {
      showToast("No hay fotos en Drive aún");
      photos = [];
    }
  } catch (err) {
    console.error('Error cargando Drive:', err);
    showToast("Error conectando con Drive");
    photos = [];
  }
  renderGallery();
}

function makeArt(type, isNight = false) {
  const dayScenes = {
    hills: ["#fff5e6", "#ffe8cc", "#ffd6a8", "#ffb8a0"],
    dream: ["#ffe8d0", "#ffd0b8", "#ffb8a0", "#ffe0c8"],
    water: ["#ffe0d0", "#ffccb8", "#ffb8a0", "#ffe8d8"],
    friends: ["#ffebd8", "#ffe0c0", "#ffd0a8", "#fff0e0"],
    gold: ["#fff8e0", "#ffecc0", "#ffe0a0", "#fff5d0"],
    soft: ["#fff0e0", "#ffe0d0", "#ffd0c0", "#ffe8d8"]
  };
  const nightScenes = {
    hills: ["#e8e0f8", "#d0c8f0", "#b8a8e8", "#c8b8f0"],
    dream: ["#f0e8f8", "#e0d0f0", "#d0c0e8", "#e8d8f0"],
    water: ["#e0e8f8", "#d0d8f0", "#c0c8e8", "#d8e0f0"],
    friends: ["#e8e0f0", "#d8d0e8", "#c8c0e0", "#e0d8e8"],
    gold: ["#f0e8f0", "#e0d8e8", "#d0c8e0", "#e8d8e0"],
    soft: ["#e8e0f0", "#d8d0e8", "#c8c0e0", "#e0d8e8"]
  };
  const scenes = isNight ? nightScenes : dayScenes;
  const c = scenes[type] || scenes.hills;
  const starColor = isNight ? "#e8e0ff" : "#fff8e0";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 900"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${c[0]}"/><stop offset="1" stop-color="${c[1]}"/></linearGradient></defs><rect width="800" height="900" fill="url(#sky)"/><circle cx="580" cy="240" r="100" fill="${c[3]}" opacity=".9"/><path d="M0 570 Q180 330 370 570 T800 510 V900 H0Z" fill="${c[2]}"/><path d="M0 690 Q210 480 420 690 T800 650 V900 H0Z" fill="${c[1]}"/><path d="M0 790 Q220 650 420 770 T800 750 V900 H0Z" fill="${c[3]}" opacity=".8"/><g fill="${starColor}" opacity=".65"><circle cx="140" cy="170" r="5"/><circle cx="230" cy="240" r="3"/><circle cx="690" cy="390" r="4"/><path d="M110 350l8 18 18 8-18 8-8 18-8-18-18-8 18-8z"/></g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function renderGallery() {
  const visible = photos; // Sin filtro de búsqueda

  document.querySelector("#photoCount").textContent =
    `${String(visible.length).padStart(2, "0")} RECUERDOS`;

  if (!visible.length) {
    gallery.innerHTML = '<div class="empty-state">Todavía no hay recuerdos por aquí. Añade una fotografía ✳</div>';
    return;
  }

  gallery.innerHTML = visible.map((photo) => {
    const index = photos.indexOf(photo);
    const fileId = photo.id;
    // Prioridad: localPreview (inmediato) > thumbUrl > url > src
    const thumbUrl = photo.localPreview || photo.thumbUrl || photo.url || photo.src;
    const fullUrl = photo.localPreview || photo.fullUrl || photo.thumbUrl || photo.url || photo.src;
    const isFresh = photo.isFreshUpload;
    return `
    <article class="photo-card${isFresh ? ' fresh-upload' : ''}" tabindex="0" role="button" data-index="${index}" data-id="${fileId}" aria-label="Abrir ${escapeHtml(photo.name)}">
      <span class="card-tag">${escapeHtml(photo.category.toUpperCase())}</span>
      <div class="photo-frame">
        <div class="photo-skeleton" aria-hidden="true"></div>
        <img src="${escapeAttr(thumbUrl)}" alt="" loading="lazy" data-full="${escapeAttr(fullUrl)}" class="photo-img">
      </div>
      <div class="card-caption">
        <strong>${escapeHtml(photo.name)}</strong>
        <small>${escapeHtml(photo.date || "A MEMORY")}</small>
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-action="rename" title="Renombrar" aria-label="Renombrar">✏️</button>
        <button class="icon-btn delete" data-action="delete" title="Eliminar" aria-label="Eliminar">🗑️</button>
      </div>
    </article>`;
  }).join("");

  gallery.querySelectorAll(".photo-card").forEach(card => {
    card.addEventListener("click", () => openLightbox(Number(card.dataset.index)));
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openLightbox(Number(card.dataset.index));
      }
    });
  });

  // Lazy-load handling: hide skeleton when image loads, show icon on error
  gallery.querySelectorAll(".photo-img").forEach(img => {
    img.addEventListener("load", () => {
      img.classList.add("loaded");
      const skeleton = img.parentElement.querySelector(".photo-skeleton");
      if (skeleton) skeleton.style.display = "none";
    });
    img.addEventListener("error", () => {
      img.style.display = "none";
      const skeleton = img.parentElement.querySelector(".photo-skeleton");
      if (skeleton) {
        skeleton.innerHTML = '<span class="photo-error-icon" aria-hidden="true">🖼️</span>';
        skeleton.style.display = "flex";
      }
    });
    // Trigger load check for cached images
    if (img.complete) img.dispatchEvent(new Event("load"));
  });

  // Delegación de eventos para botones dinámicos
  gallery.addEventListener('click', e => {
    const btn = e.target.closest('.icon-btn');
    if (!btn) return;
    e.stopPropagation(); // no abrir lightbox
    const card = btn.closest('.photo-card');
    const photoId = card.dataset.id;
    const idx = Number(card.dataset.index);
    const photo = photos[idx];
    if (btn.dataset.action === 'delete') {
      deletePhoto(photoId, photoId);
    } else if (btn.dataset.action === 'rename') {
      renamePhoto(photoId, photoId, photo.name);
    }
  });

}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}
function escapeAttr(value) { return escapeHtml(value); }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ---- REEMPLAZA addFiles COMPLETA ----
async function addFiles(fileList) {
  const files = [...fileList].filter(f => ALLOWED_TYPES.includes(f.type));
  if (!files.length) return showToast("Solo JPG, PNG o WebP.");

  for (const file of files) {
    const base64 = await readFileAsBase64(file);
    try {
      showToast(`Subiendo "${file.name}"...`);
      const resp = await fetch(DRIVE_FEED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'upload', image: base64, type: file.type, name: file.name })
      });
      const result = await resp.json();
      console.log('Upload response:', result);
      if (result.success) {
        // Guardar base64 local para vista INMEDIATA mientras Drive procesa
        const photoWithPreview = {
          ...result.photo,
          localPreview: base64,  // ← Vista instantánea
          isFreshUpload: true
        };
        photos.unshift(photoWithPreview);
        showToast(`✅ "${result.photo.name}" guardado en Drive`);
        renderGallery();

        // Reintentar cargar URL de Drive cada 3s hasta que funcione (max 2 min)
        retryDriveUrl(result.photo.id, base64, 0);
      } else {
        showToast(`❌ Error: ${result.error}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      showToast(`❌ Error de red: ${err.message}`);
    }
  }
}

// Reintenta la URL de Drive hasta que responda 200
function retryDriveUrl(fileId, localBase64, attempts) {
  if (attempts > 40) return; // 2 minutos max (40 * 3s)

  const testUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
  const img = new Image();
  img.onload = () => {
    // Drive listo - actualizar foto quitando localPreview
    const idx = photos.findIndex(p => p.id === fileId);
    if (idx !== -1) {
      delete photos[idx].localPreview;
      delete photos[idx].isFreshUpload;
      renderGallery();
    }
  };
  img.onerror = () => setTimeout(() => retryDriveUrl(fileId, localBase64, attempts + 1), 3000);
  img.src = testUrl;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deletePhoto(photoId, fileId) {
  if (!confirm('¿Borrar esta foto de Drive y de la galería?')) return;

  // Si es foto demo (id empieza con "demo-"), solo quitar localmente
  if (photoId.startsWith('demo-')) {
    photos = photos.filter(p => p.id !== photoId);
    showToast('🗑️ Eliminado (foto demo)');
    renderGallery();
    return;
  }

  try {
    const resp = await fetch(DRIVE_FEED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', fileId })
    });
    const result = await resp.json();
    if (result.success) {
      photos = photos.filter(p => p.id !== photoId);
      showToast('🗑️ Eliminado de Drive');
      renderGallery();
    } else {
      showToast(`❌ Error: ${result.error}`);
    }
  } catch (err) {
    showToast(`❌ Error de red: ${err.message}`);
  }
}

async function renamePhoto(photoId, fileId, currentName) {
  const newName = prompt('Nuevo nombre:', currentName);
  if (!newName || newName === currentName) return;

  // Si es foto demo, solo renombrar localmente
  if (photoId.startsWith('demo-')) {
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx !== -1) {
      photos[idx].name = newName;
      photos[idx].alt = newName;
      showToast('✏️ Renombrado (foto demo)');
      renderGallery();
    }
    return;
  }

  try {
    const resp = await fetch(DRIVE_FEED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'rename', fileId, newName })
    });
    const result = await resp.json();
    if (result.success) {
      const idx = photos.findIndex(p => p.id === photoId);
      if (idx !== -1) photos[idx] = result.photo;
      showToast('✏️ Renombrado en Drive');
      renderGallery();
    } else {
      showToast(`❌ Error: ${result.error}`);
    }
  } catch (err) {
    showToast(`❌ Error de red: ${err.message}`);
  }
}

function openLightbox(index) {
  lightboxIndex = index;
  updateLightbox();
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function updateLightbox() {
  const photo = photos[lightboxIndex];
  if (!photo) return;

  const img = document.querySelector("#lightboxImage");
  const caption = document.querySelector("#lightboxCaption");
  const number = document.querySelector("#lightboxNumber");

  // Prioridad: localPreview (inmediato) > fullUrl > thumbUrl > url > src
  const displayUrl = photo.localPreview || photo.fullUrl || photo.thumbUrl || photo.url || photo.src;

  img.src = displayUrl;
  img.alt = photo.alt || photo.name;
  caption.textContent = photo.name;
  number.textContent = `${String(lightboxIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;

  // Si es subida fresca, mostrar indicador
  const existingBadge = document.querySelector(".lightbox-fresh-badge");
  if (existingBadge) existingBadge.remove();

  if (photo.isFreshUpload) {
    const badge = document.createElement("span");
    badge.className = "lightbox-fresh-badge";
    badge.textContent = "Cargando versión completa...";
    badge.style.cssText = "position:absolute;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.7);color:#fff;padding:6px 12px;border-radius:20px;font-size:12px;z-index:10";
    img.parentElement.style.position = "relative";
    img.parentElement.appendChild(badge);

    // Reintento automático cuando Drive esté listo
    retryLightboxImage(photo.id, displayUrl);
  }
}

// Reintenta la imagen en lightbox hasta que cargue
function retryLightboxImage(fileId, localPreview) {
  const img = document.querySelector("#lightboxImage");
  const badge = document.querySelector(".lightbox-fresh-badge");
  const testUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

  const testImg = new Image();
  testImg.onload = () => {
    img.src = testUrl;
    if (badge) badge.remove();
    // Actualizar array photos
    const idx = photos.findIndex(p => p.id === fileId);
    if (idx !== -1) {
      delete photos[idx].localPreview;
      delete photos[idx].isFreshUpload;
    }
  };
  testImg.onerror = () => setTimeout(() => retryLightboxImage(fileId, localPreview), 3000);
  testImg.src = testUrl;
}
function closeLightbox() {
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}
function moveLightbox(direction) {
  lightboxIndex = (lightboxIndex + direction + photos.length) % photos.length;
  updateLightbox();
}
function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

document.querySelector("#uploadTrigger").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", event => {
  addFiles(event.target.files);
  fileInput.value = "";
});

document.querySelector("#lightboxClose").addEventListener("click", closeLightbox);
document.querySelector("#lightboxPrev").addEventListener("click", () => moveLightbox(-1));
document.querySelector("#lightboxNext").addEventListener("click", () => moveLightbox(1));
lightbox.addEventListener("click", event => { if (event.target === lightbox) closeLightbox(); });
document.addEventListener("keydown", event => {
  if (!lightbox.classList.contains("open")) return;
  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") moveLightbox(-1);
  if (event.key === "ArrowRight") moveLightbox(1);
});
// El ambiente se adapta a la hora local del dispositivo.
// Día: 07:00–18:59. Noche/atardecer: 19:00–06:59.
// El botón permite alternar manualmente; al recargar vuelve al modo automático.
let manualSky = null;
function setSky(mode, announce = false) {
  const night = mode === "night";
  document.body.dataset.sky = night ? "night" : "day";
  document.querySelector("#moodButton").setAttribute("aria-pressed", String(night));
  document.querySelector("#moodButton .mood-icon").textContent = night ? "☾" : "☼";
  document.querySelector("#moodButton span:last-child").textContent = night ? "MODO NOCHE" : "MODO DÍA";
  if (announce) showToast(night ? "Modo noche activado." : "Modo día activado.");
  // Refresh demo photo placeholders (only for SVG placeholders)
  refreshDemoPhotos(night);
}
function refreshDemoPhotos(night) {
  photos.forEach((photo, i) => {
    // Solo actualizar placeholders SVG generados con makeArt
    if (photo.src && photo.src.startsWith("data:image/svg")) {
      const type = ["hills", "dream", "water", "friends", "gold", "soft"][i] || "hills";
      photo.src = makeArt(type, night);
    }
  });
  renderGallery();
}
function applyAutomaticSky() {
  if (manualSky) return;
  const hour = new Date().getHours();
  setSky(hour >= 19 || hour < 7 ? "night" : "day");
}
document.querySelector("#moodButton").addEventListener("click", () => {
  const current = document.body.dataset.sky || "day";
  manualSky = current === "night" ? "day" : "night";
  setSky(manualSky, true);
});
function createFloatingParticles() {
  const layer = document.querySelector("#floatingParticles");
  if (!layer || layer.childElementCount) return;
  const count = 60;
  for (let i = 0; i < count; i++) {
    // Day particle (warm dust motes)
    const dayParticle = document.createElement("span");
    dayParticle.className = "floating-particle day";
    dayParticle.style.left = `${Math.random() * 100}%`;
    dayParticle.style.top = `${Math.random() * 100}%`;
    const daySize = 1 + Math.random() * 2.5; // 1-3.5px - tiny dust motes
    dayParticle.style.width = `${daySize}px`;
    dayParticle.style.height = `${daySize}px`;
    dayParticle.style.setProperty("--duration", `${18 + Math.random() * 30}s`);
    dayParticle.style.setProperty("--delay", `${Math.random() * -20}s`);
    dayParticle.style.setProperty("--tx1", `${(Math.random() - 0.5) * 4}vw`);
    dayParticle.style.setProperty("--ty1", `${(Math.random() - 0.5) * 3}vh`);
    dayParticle.style.setProperty("--tx2", `${(Math.random() - 0.5) * 6}vw`);
    dayParticle.style.setProperty("--ty2", `${(Math.random() - 0.5) * 4}vh`);
    dayParticle.style.setProperty("--tx3", `${(Math.random() - 0.5) * 3}vw`);
    dayParticle.style.setProperty("--ty3", `${(Math.random() - 0.5) * 2.5}vh`);
    dayParticle.style.setProperty("--tx4", `${(Math.random() - 0.5) * 5}vw`);
    dayParticle.style.setProperty("--ty4", `${(Math.random() - 0.5) * 3.5}vh`);
    dayParticle.style.setProperty("--s1", `${0.9 + Math.random() * 0.2}`);
    dayParticle.style.setProperty("--s2", `${1 + Math.random() * 0.25}`);
    dayParticle.style.setProperty("--s3", `${0.85 + Math.random() * 0.2}`);
    dayParticle.style.setProperty("--s4", `${0.95 + Math.random() * 0.2}`);
    dayParticle.style.setProperty("--o1", `${0.2 + Math.random() * 0.15}`);
    dayParticle.style.setProperty("--o2", `${0.35 + Math.random() * 0.15}`);
    dayParticle.style.setProperty("--o3", `${0.18 + Math.random() * 0.1}`);
    dayParticle.style.setProperty("--o4", `${0.28 + Math.random() * 0.12}`);
    layer.appendChild(dayParticle);

    // Night particle (cool star specks)
    const nightParticle = document.createElement("span");
    nightParticle.className = "floating-particle night";
    nightParticle.style.left = `${Math.random() * 100}%`;
    nightParticle.style.top = `${Math.random() * 100}%`;
    const nightSize = 1 + Math.random() * 2; // 1-3px - tiny star specks
    nightParticle.style.width = `${nightSize}px`;
    nightParticle.style.height = `${nightSize}px`;
    nightParticle.style.setProperty("--duration", `${20 + Math.random() * 35}s`);
    nightParticle.style.setProperty("--delay", `${Math.random() * -20}s`);
    nightParticle.style.setProperty("--tx1", `${(Math.random() - 0.5) * 3}vw`);
    nightParticle.style.setProperty("--ty1", `${(Math.random() - 0.5) * 2.5}vh`);
    nightParticle.style.setProperty("--tx2", `${(Math.random() - 0.5) * 5}vw`);
    nightParticle.style.setProperty("--ty2", `${(Math.random() - 0.5) * 3.5}vh`);
    nightParticle.style.setProperty("--tx3", `${(Math.random() - 0.5) * 2.5}vw`);
    nightParticle.style.setProperty("--ty3", `${(Math.random() - 0.5) * 2}vh`);
    nightParticle.style.setProperty("--tx4", `${(Math.random() - 0.5) * 4}vw`);
    nightParticle.style.setProperty("--ty4", `${(Math.random() - 0.5) * 3}vh`);
    nightParticle.style.setProperty("--s1", `${0.9 + Math.random() * 0.15}`);
    nightParticle.style.setProperty("--s2", `${1 + Math.random() * 0.2}`);
    nightParticle.style.setProperty("--s3", `${0.85 + Math.random() * 0.15}`);
    nightParticle.style.setProperty("--s4", `${0.95 + Math.random() * 0.15}`);
    nightParticle.style.setProperty("--o1", `${0.2 + Math.random() * 0.2}`);
    nightParticle.style.setProperty("--o2", `${0.45 + Math.random() * 0.15}`);
    nightParticle.style.setProperty("--o3", `${0.2 + Math.random() * 0.1}`);
    nightParticle.style.setProperty("--o4", `${0.35 + Math.random() * 0.1}`);
    layer.appendChild(nightParticle);
  }
}
createFloatingParticles();
loadDrivePhotos();
applyAutomaticSky();
setInterval(applyAutomaticSky, 5 * 60 * 1000);

// Drag & drop para añadir imágenes desde el escritorio o el explorador de archivos.
const dropHint = document.querySelector("#dropHint");
["dragenter", "dragover"].forEach(name => dropHint.addEventListener(name, event => {
  event.preventDefault(); dropHint.classList.add("dragover");
}));
["dragleave", "drop"].forEach(name => dropHint.addEventListener(name, event => {
  event.preventDefault(); dropHint.classList.remove("dragover");
}));
dropHint.addEventListener("drop", event => addFiles(event.dataTransfer.files));
document.addEventListener("dragover", event => event.preventDefault());
document.addEventListener("drop", event => {
  if (event.target !== dropHint && !dropHint.contains(event.target)) event.preventDefault();
});

async function loadDriveFeed() {
  if (!DRIVE_FEED_URL) return;
  try {
    const response = await fetch(DRIVE_FEED_URL);
    if (!response.ok) throw new Error("No se pudo consultar el feed.");
    const drivePhotos = await response.json();
    if (!Array.isArray(drivePhotos)) throw new Error("El feed debe devolver una lista JSON.");
    photos = drivePhotos.map(item => ({
      name: item.name || "Untitled memory",
      src: item.url,
      category: ["places", "moments", "friends"].includes(item.category) ? item.category : "moments",
      date: item.date || "FROM DRIVE",
      alt: item.alt || item.name || "Fotografía de Heartopia"
    })).filter(item => typeof item.src === "string" && /^https?:\/\//.test(item.src));
    renderGallery();
  } catch (error) {
    console.error(error);
    showToast("No se pudo cargar Drive. Se muestran las imágenes de ejemplo.");
  }
}

renderGallery();
loadDriveFeed();
