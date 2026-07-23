(() => {
  "use strict";

  const DEFAULT_ALUMNOS = [
    { nombre: "Carlos Gutiérrez", instrumento: "Guitarra clásica", curso: "3º Grado", direccion: "Calle Luna 8, Madrid", telefono: "600 112 233" },
    { nombre: "Lucía Fernández", instrumento: "Violín", curso: "1º Grado", direccion: "Av. del Prado 22, Madrid", telefono: "611 445 566" },
    { nombre: "Marcos Rodríguez", instrumento: "Piano", curso: "4º Grado", direccion: "Plaza Nueva 5, Sevilla", telefono: "622 778 899" },
    { nombre: "Elena Blanco", instrumento: "Flauta travesera", curso: "2º Grado", direccion: "Calle Ancha 14, Valencia", telefono: "633 001 122" },
    { nombre: "David Mateo", instrumento: "Violonchelo", curso: "1º Grado", direccion: "Camino Real 3, Bilbao", telefono: "644 334 455" },
    { nombre: "Sofía Vega", instrumento: "Saxo alto", curso: "3º Grado", direccion: "Ronda Sur 19, Zaragoza", telefono: "655 667 788" },
    { nombre: "Iván Morales", instrumento: "Trompetas", curso: "2º Grado", direccion: "Calle Sol 7, Murcia", telefono: "666 990 011" },
    { nombre: "Nuria Santos", instrumento: "Clarinete", curso: "4º Grado", direccion: "Paseo Marítimo 11, Málaga", telefono: "677 223 344" },
    { nombre: "Pablo Ruiz", instrumento: "Percusión", curso: "1º Grado", direccion: "Calle del Ritmo 2, Granada", telefono: "688 556 677" },
    { nombre: "Ana Ortega", instrumento: "Canto", curso: "3º Grado", direccion: "Av. de la Ópera 6, Barcelona", telefono: "699 889 900" },
    { nombre: "Hugo Navarro", instrumento: "Bajo eléctrico", curso: "2º Grado", direccion: "Calle Rock 16, Alicante", telefono: "610 121 314" },
    { nombre: "Clara Méndez", instrumento: "Arpa", curso: "1º Grado", direccion: "Plaza de la Música 1, Toledo", telefono: "620 151 617" },
  ];

  const CANONICAL_FIELDS = [
    { id: "nombre", label: "Nombre" },
    { id: "instrumento", label: "Instrumento" },
    { id: "curso", label: "Curso" },
    { id: "direccion", label: "Dirección" },
    { id: "telefono", label: "Teléfono" },
    { id: "email", label: "Email" },
    { id: "notas", label: "Notas" },
  ];

  const FIELD_ALIASES = {
    nombre: ["nombre", "name", "alumno", "estudiante", "alumno/a", "apellidos y nombre", "nombre completo"],
    instrumento: ["instrumento", "instrument", "especialidad", "asignatura"],
    curso: ["curso", "nivel", "grado", "clase", "grupo"],
    direccion: ["direccion", "dirección", "address", "domicilio", "calle", "dir", "dirección postal", "direccion postal"],
    telefono: ["telefono", "phone", "movil", "tel", "celular"],
    email: ["email", "correo", "mail", "e-mail"],
    notas: ["notas", "observaciones", "obs", "comentarios"],
  };

  const CORE_KEYS = new Set(CANONICAL_FIELDS.map((f) => f.id));
  const RADIUS = 300;
  const VISIBLE_SPAN = 6;
  /** Fixed angle between adjacent cards — keeps size stable regardless of count */
  const CARD_ANGLE = 34;
  const LEGACY_STORAGE_KEY = "mdr-alumnos-v1";

  const els = {
    rolodex: document.getElementById("rolodex"),
    stage: document.getElementById("stage"),
    searchInput: document.getElementById("searchInput"),
    searchResults: document.getElementById("searchResults"),
    excelInput: document.getElementById("excelInput"),
    counter: document.getElementById("counter"),
    statusHint: document.getElementById("statusHint"),
    importOverlay: document.getElementById("importOverlay"),
    importSubtitle: document.getElementById("importSubtitle"),
    importPreview: document.getElementById("importPreview"),
    mapBody: document.getElementById("mapBody"),
    importCancel: document.getElementById("importCancel"),
    importConfirm: document.getElementById("importConfirm"),
    importModeOverlay: document.getElementById("importModeOverlay"),
    importModeSubtitle: document.getElementById("importModeSubtitle"),
    importModeReplace: document.getElementById("importModeReplace"),
    importModeAppend: document.getElementById("importModeAppend"),
    importModeCancel: document.getElementById("importModeCancel"),
    sheetOverlay: document.getElementById("sheetOverlay"),
    sheetNum: document.getElementById("sheetNum"),
    sheetView: document.getElementById("sheetView"),
    sheetForm: document.getElementById("sheetForm"),
    sheetEdit: document.getElementById("sheetEdit"),
    sheetCancelEdit: document.getElementById("sheetCancelEdit"),
    sheetSave: document.getElementById("sheetSave"),
    sheetDelete: document.getElementById("sheetDelete"),
    sheetClose: document.getElementById("sheetClose"),
    sheetExtraFields: document.getElementById("sheetExtraFields"),
    menuToggle: document.getElementById("menuToggle"),
    importTray: document.getElementById("importTray"),
    importScrim: document.getElementById("importScrim"),
    exportDbBtn: document.getElementById("exportDbBtn"),
    newFichaBtn: document.getElementById("newFichaBtn"),
    muteToggle: document.getElementById("muteToggle"),
    viewToggle: document.getElementById("viewToggle"),
    tableView: document.getElementById("tableView"),
    tableViewContent: document.getElementById("tableViewContent"),
    desk: document.getElementById("desk"),
    wheelSort: document.getElementById("wheelSort"),
  };

  let alumnos = DEFAULT_ALUMNOS.map((a) => ({ ...a }));
  /** Unbounded wheel position — avoids reverse jump at the seam */
  let spinIndex = 0;
  let wheelLock = false;
  let audioCtx = null;
  let soundMuted = localStorage.getItem("mdr-sound-muted") === "1";
  /** @type {"wheel" | "table"} */
  let viewMode = "wheel";
  /** 1 = A→Z, -1 = Z→A for the wheel order */
  let wheelSortDir = 1;
  let wheelSortApplied = false;
  let pendingImport = null;
  let sheetEditing = false;
  /** True while composing a new card that is not yet in `alumnos` */
  let isDraftNew = false;
  let storeReady = false;
  let importModeResolver = null;

  function readLegacyLocalStorage() {
    try {
      const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) return null;
      return parsed.map((row) => {
        const out = {};
        if (!row || typeof row !== "object") return { nombre: "Sin nombre" };
        for (const [k, v] of Object.entries(row)) {
          if (v == null) continue;
          const val = String(v).trim();
          if (val) out[k] = val;
        }
        if (!out.nombre) out.nombre = "Sin nombre";
        return out;
      });
    } catch {
      return null;
    }
  }

  async function persistAlumnos() {
    if (!storeReady || !window.MdrStore) return false;
    try {
      window.MdrStore.rebuildFromAlumnos(alumnos);
      await window.MdrStore.persist();
      return true;
    } catch (err) {
      console.warn("MDR: no se pudo guardar SQLite", err);
      setStatus("No se pudo guardar la base SQLite");
      return false;
    }
  }

  function downloadDbFile() {
    if (!storeReady || !window.MdrStore) {
      setStatus("SQLite aún no está listo");
      return;
    }
    try {
      window.MdrStore.rebuildFromAlumnos(alumnos);
      const bytes = window.MdrStore.exportBytes();
      const blob = new Blob([bytes], { type: "application/x-sqlite3" });
      const stamp = new Date().toISOString().slice(0, 10);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mdr-alumnos-${stamp}.db`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus("Base SQLite exportada (.db)");
      playClick();
    } catch (err) {
      console.error(err);
      setStatus("Error al exportar .db");
    }
  }

  function normalizeKey(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function digitsOnly(str) {
    return String(str || "").replace(/\D/g, "");
  }

  function guessField(header) {
    const n = normalizeKey(header);
    for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
      if (aliases.some((a) => normalizeKey(a) === n) || n.includes(normalizeKey(canonical))) {
        return canonical;
      }
    }
    return "";
  }

  function activeIndex() {
    const n = alumnos.length;
    if (!n) return 0;
    return ((spinIndex % n) + n) % n;
  }

  /**
   * Unbounded wheel slot for a data index, nearest to current spinIndex.
   * Keeps wrap continuous while using a fixed CARD_ANGLE (independent of n).
   */
  function absoluteSlot(index) {
    const n = alumnos.length;
    if (!n) return 0;
    const k = Math.round((spinIndex - index) / n);
    return index + k * n;
  }

  function cardTransform(index) {
    return `rotateX(${-absoluteSlot(index) * CARD_ANGLE}deg) translateZ(${RADIUS}px)`;
  }

  function setStatus(text) {
    els.statusHint.textContent = text;
  }

  function updateCounter() {
    const n = alumnos.length;
    const i = activeIndex();
    els.counter.textContent = n ? `${i + 1} / ${n}` : "Sin fichas";
  }

  function isImportMenuOpen() {
    return els.importTray.classList.contains("is-open");
  }

  function setImportMenuOpen(open) {
    els.importTray.classList.toggle("is-open", open);
    els.importTray.setAttribute("aria-hidden", open ? "false" : "true");
    els.importTray.inert = !open;
    els.menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    els.menuToggle.setAttribute(
      "aria-label",
      open ? "Cerrar menú de importación" : "Abrir menú de importación"
    );
    els.importScrim.hidden = !open;
    if (open) {
      window.setTimeout(() => els.searchInput.focus(), 280);
    }
  }

  function toggleImportMenu() {
    setImportMenuOpen(!isImportMenuOpen());
  }

  function isModalOpen() {
    return (
      !els.importOverlay.hidden ||
      !els.sheetOverlay.hidden ||
      !els.importModeOverlay.hidden
    );
  }

  function setModalOpen(open) {
    document.body.classList.toggle("is-modal-open", open);
  }

  function syncMuteUi() {
    if (!els.muteToggle) return;
    els.muteToggle.setAttribute("aria-pressed", soundMuted ? "true" : "false");
    els.muteToggle.setAttribute("aria-label", soundMuted ? "Activar sonidos" : "Silenciar sonidos");
    els.muteToggle.title = soundMuted ? "Activar sonidos" : "Silenciar sonidos";
    const text = els.muteToggle.querySelector(".mute-toggle__text");
    if (text) text.textContent = soundMuted ? "MUTE" : "SONIDO";
  }

  function setSoundMuted(muted) {
    soundMuted = Boolean(muted);
    localStorage.setItem("mdr-sound-muted", soundMuted ? "1" : "0");
    if (audioCtx) {
      if (soundMuted && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
      if (!soundMuted && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
    }
    syncMuteUi();
  }

  function syncWheelSortUi() {
    if (!els.wheelSort) return;
    const label = wheelSortDir === 1 ? "A → Z" : "Z → A";
    els.wheelSort.dataset.dir = String(wheelSortDir);
    els.wheelSort.textContent = label;
    els.wheelSort.title =
      wheelSortDir === 1
        ? "Orden alfabético A → Z (clic para invertir)"
        : "Orden alfabético Z → A (clic para invertir)";
    els.wheelSort.setAttribute("aria-label", `Ordenar rueda por nombre. Ahora ${label}`);
  }

  function sortWheelByNombre(dir = wheelSortDir) {
    if (!alumnos.length) return;

    const current = alumnos[activeIndex()];
    wheelSortDir = dir === -1 ? -1 : 1;
    wheelSortApplied = true;

    alumnos.sort(
      (a, b) =>
        wheelSortDir *
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
          numeric: true,
        })
    );

    if (current) {
      const next = alumnos.indexOf(current);
      spinIndex = next >= 0 ? next : 0;
    } else {
      spinIndex = 0;
    }

    syncWheelSortUi();
    renderCards();
    persistAlumnos();
    setStatus(`Rueda · ${wheelSortDir === 1 ? "A → Z" : "Z → A"}`);
    playClick();
  }

  function toggleWheelSort() {
    if (!wheelSortApplied) {
      sortWheelByNombre(1);
      return;
    }
    sortWheelByNombre(wheelSortDir === 1 ? -1 : 1);
  }

  function syncViewUi() {
    const isTable = viewMode === "table";
    if (els.desk) els.desk.classList.toggle("view-table", isTable);
    if (els.tableView) els.tableView.hidden = !isTable;
    if (els.viewToggle) {
      els.viewToggle.setAttribute("aria-pressed", isTable ? "true" : "false");
      els.viewToggle.setAttribute(
        "aria-label",
        isTable ? "Cambiar a vista rueda" : "Cambiar a vista tabla"
      );
      els.viewToggle.title = isTable ? "Cambiar a vista rueda" : "Cambiar a vista tabla";
      const text = els.viewToggle.querySelector(".view-toggle__text");
      if (text) text.textContent = isTable ? "RUEDA" : "TABLA";
    }
  }

  function setViewMode(mode) {
    viewMode = mode === "table" ? "table" : "wheel";
    syncViewUi();
    if (viewMode === "table") {
      renderTableView();
      setStatus("Vista tabla · arrastra fichas entre cursos");
    } else {
      renderCards();
      setStatus("Vista rueda · gira con el ratón o flechas");
    }
    playClick();
  }

  /** Per-course alphabetical sort: 1 = A→Z, -1 = Z→A */
  const courseSortDir = new Map();

  function getCourseSortDir(curso) {
    return courseSortDir.get(curso) === -1 ? -1 : 1;
  }

  function toggleCourseSortDir(curso) {
    courseSortDir.set(curso, getCourseSortDir(curso) === 1 ? -1 : 1);
  }

  function compareNombre(a, b, dir = 1) {
    return (
      dir *
      String(a.alumno.nombre || "").localeCompare(String(b.alumno.nombre || ""), "es", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }

  function groupAlumnosByCurso() {
    const groups = new Map();
    alumnos.forEach((alumno, index) => {
      const curso = String(alumno.curso || "").trim() || "Sin curso";
      if (!groups.has(curso)) groups.set(curso, []);
      groups.get(curso).push({ alumno, index });
    });

    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true, sensitivity: "base" }))
      .map(([curso, rows]) => {
        const dir = getCourseSortDir(curso);
        return {
          curso,
          sortDir: dir,
          rows: rows.sort((a, b) => compareNombre(a, b, dir)),
        };
      });
  }

  function cursoLabel(alumno) {
    return String(alumno?.curso || "").trim() || "Sin curso";
  }

  function cursoValueFromLabel(label) {
    return label === "Sin curso" ? "" : label;
  }

  let tableDragIndex = null;
  let suppressTableCardClick = false;

  function clearTableDropHighlights() {
    if (!els.tableViewContent) return;
    els.tableViewContent.querySelectorAll(".course-block.is-drop-target").forEach((el) => {
      el.classList.remove("is-drop-target");
    });
  }

  function moveAlumnoToCurso(index, targetLabel) {
    const alumno = alumnos[index];
    if (!alumno) return false;

    const fromLabel = cursoLabel(alumno);
    if (fromLabel === targetLabel) return false;

    alumno.curso = cursoValueFromLabel(targetLabel);
    persistAlumnos();
    renderTableView();
    setStatus(`${alumno.nombre || "Ficha"} → ${targetLabel}`);
    playClick();
    return true;
  }

  function bindCourseDropTarget(block, curso) {
    block.dataset.curso = curso;

    block.addEventListener("dragover", (e) => {
      if (tableDragIndex == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      block.classList.add("is-drop-target");
    });

    block.addEventListener("dragenter", (e) => {
      if (tableDragIndex == null) return;
      e.preventDefault();
      block.classList.add("is-drop-target");
    });

    block.addEventListener("dragleave", (e) => {
      if (!block.contains(e.relatedTarget)) {
        block.classList.remove("is-drop-target");
      }
    });

    block.addEventListener("drop", (e) => {
      e.preventDefault();
      clearTableDropHighlights();
      const raw = e.dataTransfer.getData("text/plain");
      const index = Number(raw !== "" ? raw : tableDragIndex);
      tableDragIndex = null;
      if (!Number.isInteger(index) || index < 0 || index >= alumnos.length) return;
      moveAlumnoToCurso(index, curso);
    });
  }

  function bindTableCardDrag(card, index) {
    card.draggable = true;

    card.addEventListener("dragstart", (e) => {
      if (e.target.closest("a.card-mail")) {
        e.preventDefault();
        return;
      }
      tableDragIndex = index;
      suppressTableCardClick = false;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      try {
        e.dataTransfer.setDragImage(card, card.offsetWidth / 2, 24);
      } catch {
        /* ignore */
      }
      if (els.tableViewContent) els.tableViewContent.classList.add("is-dragging-card");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      clearTableDropHighlights();
      if (els.tableViewContent) els.tableViewContent.classList.remove("is-dragging-card");
      if (tableDragIndex != null) {
        suppressTableCardClick = true;
        window.setTimeout(() => {
          suppressTableCardClick = false;
        }, 40);
      }
      tableDragIndex = null;
    });
  }

  function renderTableView() {
    if (!els.tableViewContent) return;

    tableDragIndex = null;
    clearTableDropHighlights();
    els.tableViewContent.classList.remove("is-dragging-card");

    if (!alumnos.length) {
      els.tableViewContent.innerHTML =
        '<p class="table-view__empty">Sin fichas · crea una nueva desde el menú</p>';
      return;
    }

    const groups = groupAlumnosByCurso();
    els.tableViewContent.innerHTML = "";

    groups.forEach(({ curso, rows, sortDir }) => {
      const block = document.createElement("section");
      block.className = "course-block";

      const head = document.createElement("div");
      head.className = "course-block__head";

      const title = document.createElement("h2");
      title.className = "course-block__title";
      title.textContent = curso;

      const sortBtn = document.createElement("button");
      sortBtn.type = "button";
      sortBtn.className = "course-sort";
      sortBtn.dataset.dir = String(sortDir);
      const sortLabel = sortDir === 1 ? "A → Z" : "Z → A";
      sortBtn.textContent = sortLabel;
      sortBtn.title =
        sortDir === 1
          ? "Orden alfabético A → Z (clic para invertir)"
          : "Orden alfabético Z → A (clic para invertir)";
      sortBtn.setAttribute(
        "aria-label",
        `Ordenar ${curso} por nombre. Ahora ${sortLabel}`
      );
      sortBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCourseSortDir(curso);
        renderTableView();
        playClick();
        setStatus(
          `${curso} · ${getCourseSortDir(curso) === 1 ? "A → Z" : "Z → A"}`
        );
      });

      head.appendChild(title);
      head.appendChild(sortBtn);

      const meta = document.createElement("p");
      meta.className = "course-block__meta";
      meta.textContent = `${rows.length} ${rows.length === 1 ? "alumno" : "alumnos"}`;

      const grid = document.createElement("div");
      grid.className = "course-grid";

      rows.forEach(({ alumno, index }) => {
        const card = document.createElement("article");
        card.className = "card table-card";
        card.dataset.index = String(index);
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
          "aria-label",
          `Abrir ficha de ${alumno.nombre || "sin nombre"}. Arrastra para cambiar de curso`
        );
        card.innerHTML = cardHtml(alumno, index);

        card.addEventListener("click", (e) => {
          if (suppressTableCardClick || e.target.closest("a.card-mail")) return;
          openSheet(index);
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openSheet(index);
          }
        });

        bindTableCardDrag(card, index);
        grid.appendChild(card);
      });

      bindCourseDropTarget(block, curso);
      block.appendChild(head);
      block.appendChild(meta);
      block.appendChild(grid);
      els.tableViewContent.appendChild(block);
    });
  }

  function refreshViews() {
    if (viewMode === "table") renderTableView();
    else renderCards();
  }

  function playClick() {
    if (soundMuted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.05);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch {
      /* ignore */
    }
  }

  function extraEntries(alumno) {
    return Object.entries(alumno || {}).filter(
      ([k, v]) => !CORE_KEYS.has(k) && v != null && String(v).trim() !== ""
    );
  }

  function cardHtml(alumno, index) {
    const bits = [];
    if (alumno.curso) {
      bits.push(`<p><span class="field-label">Curso</span> ${escapeHtml(alumno.curso)}</p>`);
    }
    if (alumno.telefono) {
      bits.push(`<p><span class="field-label">Tel.</span> ${escapeHtml(alumno.telefono)}</p>`);
    }
    if (alumno.email) {
      const raw = String(alumno.email).trim();
      const mail = escapeHtml(raw);
      bits.push(
        `<p><span class="field-label">Mail</span> <a class="card-mail" href="mailto:${encodeURIComponent(raw)}" title="Escribir a ${mail}">${mail}</a></p>`
      );
    }

    return `
      <span class="card-index">N.º ${String(index + 1).padStart(3, "0")}</span>
      <div>
        <h3>${escapeHtml(alumno.nombre || "Sin nombre")}</h3>
        ${bits.join("")}
      </div>
      <span class="badge">${escapeHtml(alumno.instrumento || "Sin instrumento")}</span>
    `;
  }

  function visibleIndices() {
    const n = alumnos.length;
    const current = activeIndex();
    if (!n) return [];
    if (n <= VISIBLE_SPAN * 2 + 1) {
      return Array.from({ length: n }, (_, i) => i);
    }
    const out = [];
    for (let d = -VISIBLE_SPAN; d <= VISIBLE_SPAN; d++) {
      out.push((current + d + n * 10) % n);
    }
    return out;
  }

  function renderCards() {
    const current = activeIndex();
    els.rolodex.innerHTML = "";

    visibleIndices().forEach((index) => {
      const card = document.createElement("article");
      card.className = "card" + (index === current ? " is-active" : "");
      card.dataset.index = String(index);
      card.style.transform = cardTransform(index);
      card.innerHTML = cardHtml(alumnos[index], index);
      els.rolodex.appendChild(card);
    });

    updateRotation(false);
  }

  function updateRotation(animate = true) {
    const current = activeIndex();
    els.rolodex.classList.toggle("is-spinning", animate);
    /* spinIndex is continuous → last→first keeps rotating forward */
    els.rolodex.style.transform = `rotateX(${spinIndex * CARD_ANGLE}deg)`;

    els.rolodex.querySelectorAll(".card").forEach((card) => {
      const idx = Number(card.dataset.index);
      const on = idx === current;
      card.classList.toggle("is-active", on);
      card.style.transform = cardTransform(idx);
      card.style.pointerEvents = on ? "auto" : "none";
    });

    updateCounter();
  }

  /**
   * Move wheel to a data index without reversing at the wrap.
   * shortest=true picks nearest direction (search); false keeps current spin and adds delta.
   */
  function goTo(targetIndex, { sound = true, rebuild = true, shortest = true } = {}) {
    if (!alumnos.length) return;
    const n = alumnos.length;
    const normalized = ((targetIndex % n) + n) % n;
    const current = activeIndex();

    let delta = normalized - current;
    if (shortest) {
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
    }

    spinIndex += delta;

    if (rebuild || alumnos.length > VISIBLE_SPAN * 2 + 1) renderCards();
    else updateRotation(true);

    if (sound && delta !== 0) playClick();
  }

  function step(delta) {
    if (viewMode === "table") return;
    if (!alumnos.length || wheelLock || isModalOpen()) return;
    wheelLock = true;
    spinIndex += delta;
    const needsRebuild = alumnos.length > VISIBLE_SPAN * 2 + 1;
    if (needsRebuild) renderCards();
    else updateRotation(true);
    playClick();
    window.setTimeout(() => {
      wheelLock = false;
    }, 120);
  }

  /* —— Search —— */
  function closeSearch() {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = "";
    els.searchInput.setAttribute("aria-expanded", "false");
  }

  function openSearch(matches) {
    els.searchResults.innerHTML = "";
    if (!matches.length) {
      closeSearch();
      return;
    }

    matches.slice(0, 12).forEach(({ alumno, index }, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === 0 ? "true" : "false");
      li.dataset.index = String(index);
      li.innerHTML = `
        <strong>${escapeHtml(alumno.nombre || "Sin nombre")}</strong>
        <span class="meta">${escapeHtml(alumno.instrumento || "—")} · ${escapeHtml(alumno.curso || "—")}</span>
      `;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        goTo(index);
        els.searchInput.value = alumno.nombre || "";
        closeSearch();
        setImportMenuOpen(false);
        setStatus(`Ficha: ${alumno.nombre}`);
        if (viewMode === "table") openSheet(index);
      });
      els.searchResults.appendChild(li);
    });

    els.searchResults.hidden = false;
    els.searchInput.setAttribute("aria-expanded", "true");
  }

  function searchableBlob(alumno) {
    return normalizeKey(
      [...Object.values(alumno)].filter((v) => v != null && String(v).trim()).join(" ")
    );
  }

  function runSearch(query) {
    const q = normalizeKey(query);
    if (!q) {
      closeSearch();
      return;
    }

    const matches = alumnos
      .map((alumno, index) => ({ alumno, index }))
      .filter(({ alumno }) => searchableBlob(alumno).includes(q));

    openSearch(matches);

    if (matches.length === 1) goTo(matches[0].index, { sound: true });
    else if (matches.length > 1) goTo(matches[0].index, { sound: false });
  }

  /* —— Import / column mapping —— */
  function detectCsvSep(text) {
    const sample = text.split(/\r?\n/, 3).join("\n");
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    return semis > commas ? ";" : ",";
  }

  function parseRawRows(data, isCsv) {
    const wb = isCsv
      ? XLSX.read(data, { type: "string", FS: detectCsvSep(data) })
      : XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return { sheetName: wb.SheetNames[0], rows };
  }

  function openImportMapper({ fileName, sheetName, rows }) {
    if (!rows.length) {
      setStatus("El archivo no tiene filas");
      return;
    }

    const headers = Object.keys(rows[0]);
    const used = new Set();

    pendingImport = { fileName, sheetName, rows, headers };

    els.importSubtitle.textContent = `${fileName} · hoja “${sheetName}” · ${rows.length} filas`;
    els.importPreview.textContent = `Vista previa: ${headers.slice(0, 5).join(" · ")}${headers.length > 5 ? "…" : ""}`;
    els.mapBody.innerHTML = "";

    headers.forEach((header) => {
      let suggested = guessField(header);
      if (suggested && used.has(suggested)) suggested = "";
      if (suggested) used.add(suggested);

      const sample = rows.slice(0, 3).map((r) => String(r[header] ?? "").trim()).filter(Boolean)[0] || "—";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(header)}</strong></td>
        <td></td>
        <td class="sample" title="${escapeHtml(sample)}">${escapeHtml(sample)}</td>
      `;

      const select = document.createElement("select");
      select.dataset.header = header;
      select.innerHTML =
        `<option value="">— Ignorar —</option>` +
        CANONICAL_FIELDS.map(
          (f) => `<option value="${f.id}"${f.id === suggested ? " selected" : ""}>${f.label}</option>`
        ).join("") +
        `<option value="__custom__">Campo extra (mismo nombre)</option>`;

      if (!suggested && normalizeKey(header) && !guessField(header)) {
        /* leave ignore; user can pick custom */
      }

      tr.children[1].appendChild(select);
      els.mapBody.appendChild(tr);
    });

    /* ensure at least one nombre mapping if possible */
    const nombreSelect = [...els.mapBody.querySelectorAll("select")].find((s) => s.value === "nombre");
    if (!nombreSelect) {
      const first = els.mapBody.querySelector("select");
      if (first) first.value = "nombre";
    }

    els.importOverlay.hidden = false;
    setModalOpen(true);
  }

  function closeImportMapper() {
    els.importOverlay.hidden = true;
    pendingImport = null;
    setModalOpen(!els.sheetOverlay.hidden);
  }

  function resolveImportMode(mode) {
    els.importModeOverlay.hidden = true;
    setModalOpen(!els.importOverlay.hidden || !els.sheetOverlay.hidden);
    const resolve = importModeResolver;
    importModeResolver = null;
    if (resolve) resolve(mode);
  }

  function askImportMode(incomingCount) {
    if (!alumnos.length) return Promise.resolve("replace");

    els.importModeSubtitle.textContent =
      `Hay ${alumnos.length} fichas ahora. El archivo trae ${incomingCount}. ` +
      `¿Sobrescribir la base o añadir las nuevas?`;
    els.importModeOverlay.hidden = false;
    setModalOpen(true);

    return new Promise((resolve) => {
      importModeResolver = resolve;
    });
  }

  async function applyImportMapping() {
    if (!pendingImport) return;

    const selects = [...els.mapBody.querySelectorAll("select")];
    const mapping = {}; // header -> field id or __custom__
    const claimed = new Map(); // field -> header

    for (const sel of selects) {
      const header = sel.dataset.header;
      const value = sel.value;
      if (!value) continue;

      if (value !== "__custom__") {
        if (claimed.has(value)) {
          setStatus(`El campo “${value}” está asignado dos veces`);
          return;
        }
        claimed.set(value, header);
      }
      mapping[header] = value;
    }

    if (![...Object.values(mapping)].includes("nombre") && !claimed.has("nombre")) {
      setStatus("Asigna al menos una columna a Nombre");
      return;
    }

    const list = pendingImport.rows
      .map((row) => {
        const out = {};
        for (const [header, target] of Object.entries(mapping)) {
          const raw = row[header];
          if (raw == null || String(raw).trim() === "") continue;
          const val = String(raw).trim();
          if (target === "__custom__") out[header] = val;
          else out[target] = val;
        }
        return out;
      })
      .filter((r) => r.nombre);

    if (!list.length) {
      setStatus("No se encontraron filas con nombre");
      return;
    }

    const label = pendingImport.fileName;
    const mode = await askImportMode(list.length);
    if (mode === "cancel") return;

    closeImportMapper();
    loadAlumnos(list, label, mode);
  }

  function loadAlumnos(list, label, mode = "replace") {
    if (!list.length) {
      setStatus("No se encontraron filas con nombre");
      return;
    }

    if (mode === "append") {
      const before = alumnos.length;
      alumnos = alumnos.concat(list);
      spinIndex = before; /* first newly added */
      refreshViews();
      setStatus(`${list.length} añadidas · total ${alumnos.length} · ${label}`);
    } else {
      alumnos = list;
      spinIndex = 0;
      refreshViews();
      setStatus(`${list.length} fichas · ${label}`);
    }

    playClick();
    persistAlumnos();
  }

  /* —— Ficha abierta / edición —— */
  function openSheet(index = activeIndex()) {
    if (!alumnos.length) return;
    const i = ((index % alumnos.length) + alumnos.length) % alumnos.length;
    if (i !== activeIndex()) goTo(i, { sound: false });

    isDraftNew = false;
    sheetEditing = false;
    renderSheet();
    els.sheetOverlay.hidden = false;
    setModalOpen(true);
    playClick();
  }

  function closeSheet() {
    if (isDraftNew) {
      isDraftNew = false;
      sheetEditing = false;
      els.sheetForm.reset();
      els.sheetExtraFields.innerHTML = "";
      els.sheetOverlay.hidden = true;
      setModalOpen(!els.importOverlay.hidden);
      setStatus("Nueva ficha cancelada");
      return;
    }
    sheetEditing = false;
    els.sheetOverlay.hidden = true;
    setModalOpen(!els.importOverlay.hidden);
  }

  function renderSheet() {
    const alumno = isDraftNew ? {} : alumnos[activeIndex()];
    if (!isDraftNew && !alumno) return;

    els.sheetNum.textContent = isDraftNew
      ? `Nueva ficha · pendiente de guardar`
      : `Ficha N.º ${String(activeIndex() + 1).padStart(3, "0")} · ${activeIndex() + 1} / ${alumnos.length}`;

    if (sheetEditing || isDraftNew) {
      els.sheetView.hidden = true;
      els.sheetForm.hidden = false;
      els.sheetEdit.hidden = true;
      els.sheetCancelEdit.hidden = false;
      els.sheetSave.hidden = false;
      els.sheetDelete.hidden = isDraftNew;

      if (isDraftNew) {
        els.sheetForm.reset();
        els.sheetExtraFields.innerHTML = "";
      } else {
        for (const field of CANONICAL_FIELDS) {
          const input = els.sheetForm.querySelector(`[name="${field.id}"]`);
          if (!input) continue;
          const raw = alumno[field.id] ?? "";
          input.value = field.id === "telefono" ? digitsOnly(raw) : raw;
        }

        els.sheetExtraFields.innerHTML = "";
        extraEntries(alumno).forEach(([key, val]) => {
          const label = document.createElement("label");
          const caption = document.createElement("span");
          caption.textContent = key;
          const input = document.createElement("input");
          input.name = `extra:${key}`;
          input.value = val ?? "";
          label.append(caption, input);
          els.sheetExtraFields.appendChild(label);
        });
      }
    } else {
      els.sheetForm.hidden = true;
      els.sheetView.hidden = false;
      els.sheetEdit.hidden = false;
      els.sheetCancelEdit.hidden = true;
      els.sheetSave.hidden = true;
      els.sheetDelete.hidden = false;

      els.sheetForm.reset();
      els.sheetExtraFields.innerHTML = "";

      const extras = extraEntries(alumno)
        .map(
          ([k, v]) => `
          <div>
            <dt>${escapeHtml(k)}</dt>
            <dd>${escapeHtml(v)}</dd>
          </div>`
        )
        .join("");

      els.sheetView.innerHTML = `
        <h3 id="sheetDialogTitle">${escapeHtml(alumno.nombre || "Sin nombre")}</h3>
        <span class="badge">${escapeHtml(alumno.instrumento || "Sin instrumento")}</span>
        <dl>
          <div>
            <dt>Curso</dt>
            <dd>${escapeHtml(alumno.curso || "—")}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd>${escapeHtml(alumno.direccion || "—")}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>${escapeHtml(alumno.telefono || "—")}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>${escapeHtml(alumno.email || "—")}</dd>
          </div>
          <div>
            <dt>Notas</dt>
            <dd>${escapeHtml(alumno.notas || "—")}</dd>
          </div>
          ${extras}
        </dl>
      `;
    }
  }

  function saveSheet() {
    const next = isDraftNew ? {} : { ...alumnos[activeIndex()] };

    for (const field of CANONICAL_FIELDS) {
      const input = els.sheetForm.querySelector(`[name="${field.id}"]`);
      if (!input) continue;
      let value = input.value.trim();
      if (field.id === "telefono") value = digitsOnly(value);
      next[field.id] = value;
    }

    if (!next.nombre) {
      setStatus("El nombre no puede quedar vacío");
      return;
    }

    if (!isDraftNew) {
      extraEntries(alumnos[activeIndex()]).forEach(([key]) => {
        delete next[key];
      });
    }
    [...els.sheetExtraFields.querySelectorAll("input")].forEach((input) => {
      const key = input.name.replace(/^extra:/, "");
      if (input.value.trim()) next[key] = input.value.trim();
    });

    if (isDraftNew) {
      alumnos.push(next);
      spinIndex = alumnos.length - 1;
      isDraftNew = false;
      sheetEditing = false;
      refreshViews();
      persistAlumnos();
      renderSheet();
      setStatus(`Creada: ${next.nombre}`);
      playClick();
      return;
    }

    const i = activeIndex();
    alumnos[i] = next;
    sheetEditing = false;
    renderSheet();
    refreshViews();
    setStatus(`Guardado: ${next.nombre}`);
    playClick();
    persistAlumnos();
  }

  function createNewFicha() {
    isDraftNew = true;
    sheetEditing = true;
    setImportMenuOpen(false);
    els.sheetOverlay.hidden = false;
    setModalOpen(true);
    renderSheet();

    const nombreInput = els.sheetForm.querySelector('[name="nombre"]');
    if (nombreInput) {
      window.setTimeout(() => nombreInput.focus(), 50);
    }
    setStatus("Nueva ficha · guarda para crearla");
    playClick();
  }

  function deleteCurrentFicha() {
    if (isDraftNew) {
      closeSheet();
      return;
    }
    if (!alumnos.length) return;
    const i = activeIndex();
    const nombre = alumnos[i]?.nombre || "esta ficha";
    const ok = window.confirm(`¿Eliminar la ficha de “${nombre}”? Esta acción no se puede deshacer.`);
    if (!ok) return;

    alumnos.splice(i, 1);
    sheetEditing = false;

    if (!alumnos.length) {
      closeSheet();
      spinIndex = 0;
      refreshViews();
      persistAlumnos();
      setStatus("Sin fichas · crea una nueva desde el menú");
      playClick();
      return;
    }

    spinIndex = Math.min(i, alumnos.length - 1);
    refreshViews();
    persistAlumnos();
    renderSheet();
    setStatus(`Eliminada: ${nombre}`);
    playClick();
  }

  /* —— Events —— */
  els.rolodex.addEventListener("click", (e) => {
    const mailLink = e.target.closest("a.card-mail");
    if (mailLink) {
      e.stopPropagation();
      return;
    }
    const card = e.target.closest(".card.is-active");
    if (card) openSheet(Number(card.dataset.index));
  });

  els.stage.addEventListener(
    "wheel",
    (e) => {
      if (viewMode === "table" || isModalOpen()) return;
      e.preventDefault();
      step(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  document.addEventListener("keydown", (e) => {
    if (!els.importModeOverlay.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        resolveImportMode("cancel");
      }
      return;
    }

    if (!els.importOverlay.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeImportMapper();
      }
      return;
    }

    if (!els.sheetOverlay.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (isDraftNew) {
          closeSheet();
        } else if (sheetEditing) {
          sheetEditing = false;
          renderSheet();
        } else {
          closeSheet();
        }
      }
      return;
    }

    if (isImportMenuOpen() && e.key === "Escape") {
      e.preventDefault();
      setImportMenuOpen(false);
      return;
    }

    if (e.target === els.searchInput) {
      if (e.key === "Escape") closeSearch();
      if (e.key === "Enter") {
        const first = els.searchResults.querySelector("li");
        if (first) {
          e.preventDefault();
          const idx = Number(first.dataset.index);
          goTo(idx);
          closeSearch();
          setImportMenuOpen(false);
          if (viewMode === "table") openSheet(idx);
        }
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (viewMode === "table") return;
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (viewMode === "table") return;
      e.preventDefault();
      step(-1);
    } else if (e.key === "Home") {
      if (viewMode === "table") return;
      e.preventDefault();
      goTo(0);
    } else if (e.key === "End") {
      if (viewMode === "table") return;
      e.preventDefault();
      goTo(alumnos.length - 1);
    } else if (e.key === "Enter") {
      if (viewMode === "table") return;
      e.preventDefault();
      openSheet();
    }
  });

  els.menuToggle.addEventListener("click", toggleImportMenu);
  els.importScrim.addEventListener("click", () => setImportMenuOpen(false));

  let searchTimer;
  els.searchInput.addEventListener("input", (e) => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => runSearch(e.target.value), 120);
  });

  els.searchInput.addEventListener("blur", () => {
    window.setTimeout(closeSearch, 150);
  });

  async function handleImportFile(file) {
    if (!file) return;

    const isSqlite = /\.(db|sqlite|sqlite3)$/i.test(file.name);

    try {
      setStatus(`Leyendo ${file.name}…`);

      if (isSqlite) {
        if (!storeReady || !window.MdrStore) {
          setStatus("SQLite aún no está listo");
          return;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        /* Peek without losing current data until the user chooses a mode */
        const previous = alumnos.slice();
        const list = window.MdrStore.importBytes(bytes);
        if (!list.length) {
          /* restore previous sqlite state */
          window.MdrStore.rebuildFromAlumnos(previous);
          setStatus("El archivo .db no contiene fichas");
          return;
        }

        const mode = await askImportMode(list.length);
        if (mode === "cancel") {
          window.MdrStore.rebuildFromAlumnos(previous);
          await window.MdrStore.persist();
          setStatus("Importación cancelada");
          return;
        }

        loadAlumnos(list, file.name, mode);
        return;
      }

      if (typeof XLSX === "undefined") {
        setStatus("SheetJS no cargó — revisa la red");
        return;
      }

      const isCsv = /\.csv$/i.test(file.name) || file.type.includes("csv");
      let parsed;

      if (isCsv) {
        parsed = parseRawRows(await file.text(), true);
      } else {
        parsed = parseRawRows(new Uint8Array(await file.arrayBuffer()), false);
      }

      openImportMapper({ fileName: file.name, ...parsed });
    } catch (err) {
      console.error(err);
      setStatus("Error al importar el archivo");
    }
  }

  els.excelInput.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    await handleImportFile(file);
    e.target.value = "";
  });

  els.exportDbBtn.addEventListener("click", downloadDbFile);
  els.newFichaBtn.addEventListener("click", createNewFicha);
  els.muteToggle.addEventListener("click", () => setSoundMuted(!soundMuted));
  syncMuteUi();
  if (els.viewToggle) {
    els.viewToggle.addEventListener("click", () => {
      setViewMode(viewMode === "table" ? "wheel" : "table");
    });
  }
  if (els.wheelSort) {
    els.wheelSort.addEventListener("click", toggleWheelSort);
  }
  syncViewUi();
  syncWheelSortUi();

  const dropzone = document.getElementById("dropzone");
  if (dropzone) {
    ["dragenter", "dragover"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add("is-dragover");
      });
    });
    ["dragleave", "drop"].forEach((evt) => {
      dropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove("is-dragover");
      });
    });
    dropzone.addEventListener("drop", async (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      await handleImportFile(file);
    });
  }

  els.importCancel.addEventListener("click", closeImportMapper);
  els.importConfirm.addEventListener("click", () => {
    applyImportMapping();
  });

  els.importModeReplace.addEventListener("click", () => resolveImportMode("replace"));
  els.importModeAppend.addEventListener("click", () => resolveImportMode("append"));
  els.importModeCancel.addEventListener("click", () => resolveImportMode("cancel"));
  els.importModeOverlay.addEventListener("click", (e) => {
    if (e.target === els.importModeOverlay) resolveImportMode("cancel");
  });

  els.importOverlay.addEventListener("click", (e) => {
    if (e.target === els.importOverlay) closeImportMapper();
  });

  els.sheetClose.addEventListener("click", closeSheet);
  els.sheetEdit.addEventListener("click", () => {
    sheetEditing = true;
    renderSheet();
  });
  els.sheetCancelEdit.addEventListener("click", () => {
    if (isDraftNew) {
      closeSheet();
      return;
    }
    sheetEditing = false;
    renderSheet();
  });
  els.sheetSave.addEventListener("click", (e) => {
    e.preventDefault();
    saveSheet();
  });
  els.sheetDelete.addEventListener("click", deleteCurrentFicha);
  els.sheetForm.addEventListener("submit", (e) => {
    e.preventDefault();
    saveSheet();
  });

  const telefonoInput = els.sheetForm.querySelector('[name="telefono"]');
  if (telefonoInput) {
    telefonoInput.addEventListener("input", () => {
      const cleaned = digitsOnly(telefonoInput.value);
      if (telefonoInput.value !== cleaned) telefonoInput.value = cleaned;
    });
    telefonoInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      const digits = digitsOnly(text);
      const start = telefonoInput.selectionStart ?? telefonoInput.value.length;
      const end = telefonoInput.selectionEnd ?? telefonoInput.value.length;
      const next = digitsOnly(
        telefonoInput.value.slice(0, start) + digits + telefonoInput.value.slice(end)
      );
      telefonoInput.value = next.slice(0, telefonoInput.maxLength || 15);
    });
  }

  els.sheetOverlay.addEventListener("click", (e) => {
    if (e.target === els.sheetOverlay && !sheetEditing && !isDraftNew) closeSheet();
  });

  ["pointerdown", "keydown"].forEach((evt) => {
    document.addEventListener(
      evt,
      () => {
        if (!audioCtx) {
          try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          } catch {
            /* ignore */
          }
        }
      },
      { once: true }
    );
  });

  renderCards();
  setImportMenuOpen(false);
  setStatus("Cargando base SQLite…");

  (async function bootStore() {
    try {
      if (!window.MdrStore || typeof initSqlJs !== "function") {
        setStatus("No se pudo cargar SQLite (revisa la red)");
        return;
      }

      const legacy = readLegacyLocalStorage();
      const seed = legacy && legacy.length ? legacy : DEFAULT_ALUMNOS.map((a) => ({ ...a }));
      const { alumnos: loaded, source } = await window.MdrStore.init(seed);
      alumnos = loaded.length ? loaded : seed;
      storeReady = true;
      spinIndex = 0;
      refreshViews();

      if (source === "seed" && legacy && legacy.length) {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        setStatus(`${alumnos.length} fichas · migradas a SQLite`);
      } else if (source === "sqlite") {
        setStatus(`${alumnos.length} fichas · SQLite`);
      } else {
        setStatus(`${alumnos.length} fichas · SQLite lista`);
      }
    } catch (err) {
      console.error(err);
      storeReady = false;
      setStatus("Error al iniciar SQLite");
    }
  })();
})();
