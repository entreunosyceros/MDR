/**
 * ─────────────────────────────────────────────────────────────────────────────
 * app.js — Lógica principal del Rolodex Musical (MDR)
 * ─────────────────────────────────────────────────────────────────────────────
 * Controla la rueda 3D de fichas de alumnos, la vista tabla agrupada por
 * curso, búsqueda, importación/exportación de datos (Excel, CSV, SQLite),
 * edición de fichas individuales y persistencia vía window.MdrStore.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(() => {
  "use strict";

  // ══════════════════════════════════════════════════════════════════════════
  // DATOS POR DEFECTO
  // ══════════════════════════════════════════════════════════════════════════

  const ALUMNOS_POR_DEFECTO = [
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

  // ══════════════════════════════════════════════════════════════════════════
  // CONSTANTES DE CONFIGURACIÓN
  // ══════════════════════════════════════════════════════════════════════════

  const CAMPOS_CANONICOS = [
    { id: "nombre", label: "Nombre" },
    { id: "instrumento", label: "Instrumento" },
    { id: "curso", label: "Curso" },
    { id: "direccion", label: "Dirección" },
    { id: "telefono", label: "Teléfono" },
    { id: "email", label: "Email" },
    { id: "notas", label: "Notas" },
  ];

  /** Aliases para detectar columnas de Excel/CSV en inglés y español */
  const ALIAS_CAMPOS = {
    nombre: ["nombre", "name", "alumno", "estudiante", "alumno/a", "apellidos y nombre", "nombre completo"],
    instrumento: ["instrumento", "instrument", "especialidad", "asignatura"],
    curso: ["curso", "nivel", "grado", "clase", "grupo"],
    direccion: ["direccion", "dirección", "address", "domicilio", "calle", "dir", "dirección postal", "direccion postal"],
    telefono: ["telefono", "phone", "movil", "tel", "celular"],
    email: ["email", "correo", "mail", "e-mail"],
    notas: ["notas", "observaciones", "obs", "comentarios"],
  };

  const CLAVES_NUCLEO = new Set(CAMPOS_CANONICOS.map((f) => f.id));
  const RADIO = 300;
  const RANGO_VISIBLE = 6;
  /** Ángulo fijo entre fichas adyacentes — mantiene tamaño estable sin importar la cantidad */
  const ANGULO_FICHA = 34;
  const CLAVE_ALMACEN_LEGACY = "mdr-alumnos-v1";

  // ══════════════════════════════════════════════════════════════════════════
  // REFERENCIAS AL DOM
  // ══════════════════════════════════════════════════════════════════════════

  const dom = {
    rolodex: document.getElementById("rolodex"),
    escenario: document.getElementById("stage"),
    entradaBusqueda: document.getElementById("searchInput"),
    resultadosBusqueda: document.getElementById("searchResults"),
    entradaExcel: document.getElementById("excelInput"),
    contador: document.getElementById("counter"),
    indicadorEstado: document.getElementById("statusHint"),
    overlayImportacion: document.getElementById("importOverlay"),
    subtituloImportacion: document.getElementById("importSubtitle"),
    previsualizacion: document.getElementById("importPreview"),
    cuerpoMapa: document.getElementById("mapBody"),
    btnCancelarImport: document.getElementById("importCancel"),
    btnConfirmarImport: document.getElementById("importConfirm"),
    overlayModo: document.getElementById("importModeOverlay"),
    subtituloModo: document.getElementById("importModeSubtitle"),
    btnReemplazar: document.getElementById("importModeReplace"),
    btnAnadir: document.getElementById("importModeAppend"),
    btnCancelarModo: document.getElementById("importModeCancel"),
    overlayDuplicado: document.getElementById("dupOverlay"),
    subtituloDuplicado: document.getElementById("dupSubtitle"),
    comparacionDuplicado: document.getElementById("dupCompare"),
    entradaNombreDuplicado: document.getElementById("dupNewName"),
    errorDuplicado: document.getElementById("dupError"),
    btnSobrescribirDup: document.getElementById("dupOverwrite"),
    btnOmitirDup: document.getElementById("dupOmit"),
    btnCrearDup: document.getElementById("dupCreate"),
    overlayFicha: document.getElementById("sheetOverlay"),
    numFicha: document.getElementById("sheetNum"),
    vistaFicha: document.getElementById("sheetView"),
    formularioFicha: document.getElementById("sheetForm"),
    btnEditar: document.getElementById("sheetEdit"),
    btnCancelarEdicion: document.getElementById("sheetCancelEdit"),
    btnGuardar: document.getElementById("sheetSave"),
    btnImprimir: document.getElementById("sheetPrint"),
    btnEliminar: document.getElementById("sheetDelete"),
    btnCerrar: document.getElementById("sheetClose"),
    camposExtra: document.getElementById("sheetExtraFields"),
    btnAnadirCampo: document.getElementById("sheetAddField"),
    botonMenu: document.getElementById("menuToggle"),
    bandejaImport: document.getElementById("importTray"),
    fondoImport: document.getElementById("importScrim"),
    btnExportarDb: document.getElementById("exportDbBtn"),
    btnNuevaFicha: document.getElementById("newFichaBtn"),
    botonSilencio: document.getElementById("muteToggle"),
    botonVista: document.getElementById("viewToggle"),
    vistaTabla: document.getElementById("tableView"),
    contenidoTabla: document.getElementById("tableViewContent"),
    escritorio: document.getElementById("desk"),
    botonOrdenRueda: document.getElementById("wheelSort"),
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADO DE LA APLICACIÓN
  // ══════════════════════════════════════════════════════════════════════════

  let alumnos = ALUMNOS_POR_DEFECTO.map((a) => ({ ...a }));
  /** Posición ilimitada de la rueda — evita saltos inversos en el borde */
  let indiceGiro = 0;
  let bloqueoRueda = false;
  let contextoAudio = null;
  let sonidoSilenciado = localStorage.getItem("mdr-sound-muted") === "1";
  /** @type {"rueda" | "tabla"} */
  let modoVista = "rueda";
  /** 1 = A→Z, -1 = Z→A para el orden de la rueda */
  let ordenRueda = 1;
  let ordenRuedaAplicado = false;
  let importacionPendiente = null;
  let editandoFicha = false;
  /** True mientras se compone una ficha nueva no guardada en `alumnos` */
  let esBorradorNuevo = false;
  let almacenListo = false;
  let resolverModoImportacion = null;
  let resolverDuplicado = null;
  /** Nombres ya aceptados en el lote actual de importación (para validar “crear”) */
  let nombresLoteDuplicado = [];
  let progresoDuplicado = { actual: 0, total: 0 };

  // ══════════════════════════════════════════════════════════════════════════
  // PERSISTENCIA Y ALMACENAMIENTO
  // ══════════════════════════════════════════════════════════════════════════

  /** Lee datos heredados del antiguo localStorage (migración) */
  function leerAlmacenamientoLegado() {
    try {
      const raw = localStorage.getItem(CLAVE_ALMACEN_LEGACY);
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

  /** Guarda el array de alumnos en SQLite vía MdrStore */
  async function persistirAlumnos() {
    if (!almacenListo || !window.MdrStore) return false;
    try {
      window.MdrStore.reconstruirDesdeAlumnos(alumnos);
      await window.MdrStore.persistir();
      return true;
    } catch (err) {
      console.warn("MDR: no se pudo guardar SQLite", err);
      establecerEstado("No se pudo guardar la base SQLite");
      return false;
    }
  }

  /** Descarga la base SQLite como archivo .db */
  function descargarArchivoDb() {
    if (!almacenListo || !window.MdrStore) {
      establecerEstado("SQLite aún no está listo");
      return;
    }
    try {
      window.MdrStore.reconstruirDesdeAlumnos(alumnos);
      const bytes = window.MdrStore.exportarBytes();
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
      establecerEstado("Base SQLite exportada (.db)");
      reproducirClic();
    } catch (err) {
      console.error(err);
      establecerEstado("Error al exportar .db");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILIDADES DE TEXTO
  // ══════════════════════════════════════════════════════════════════════════

  /** Normaliza una cadena para comparación: minúsculas, sin acentos */
  function normalizarClave(key) {
    return String(key || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /** Escapa HTML para evitar inyecciones XSS */
  function escaparHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** Extrae solo dígitos de una cadena (para teléfonos) */
  function soloDigitos(str) {
    return String(str || "").replace(/\D/g, "");
  }

  /** Intenta adivinar a qué campo canónico corresponde una cabecera */
  function adivinarCampo(header) {
    const n = normalizarClave(header);
    for (const [canonical, aliases] of Object.entries(ALIAS_CAMPOS)) {
      if (aliases.some((a) => normalizarClave(a) === n) || n.includes(normalizarClave(canonical))) {
        return canonical;
      }
    }
    return "";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GEOMETRÍA DE LA RUEDA 3D
  // ══════════════════════════════════════════════════════════════════════════

  /** Devuelve el índice real (circular) del alumno activo */
  function indiceActivo() {
    const n = alumnos.length;
    if (!n) return 0;
    return ((indiceGiro % n) + n) % n;
  }

  /**
   * Ranura absoluta para un índice de datos, más cercana al indiceGiro actual.
   * Mantiene la continuidad del giro usando ANGULO_FICHA independiente de n.
   */
  function ranuraAbsoluta(index) {
    const n = alumnos.length;
    if (!n) return 0;
    const k = Math.round((indiceGiro - index) / n);
    return index + k * n;
  }

  /** Calcula el CSS transform de una ficha en la rueda */
  function transformacionFicha(index) {
    return `rotateX(${-ranuraAbsoluta(index) * ANGULO_FICHA}deg) translateZ(${RADIO}px)`;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INDICADORES DE ESTADO
  // ══════════════════════════════════════════════════════════════════════════

  function establecerEstado(text) {
    dom.indicadorEstado.textContent = text;
  }

  function actualizarContador() {
    const n = alumnos.length;
    const i = indiceActivo();
    dom.contador.textContent = n ? `${i + 1} / ${n}` : "Sin fichas";
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MENÚ DE IMPORTACIÓN (bandeja lateral)
  // ══════════════════════════════════════════════════════════════════════════

  function menuImportacionAbierto() {
    return dom.bandejaImport.classList.contains("is-open");
  }

  function establecerMenuImportacion(open) {
    dom.bandejaImport.classList.toggle("is-open", open);
    dom.bandejaImport.setAttribute("aria-hidden", open ? "false" : "true");
    dom.bandejaImport.inert = !open;
    dom.botonMenu.setAttribute("aria-expanded", open ? "true" : "false");
    dom.botonMenu.setAttribute(
      "aria-label",
      open ? "Cerrar menú de importación" : "Abrir menú de importación"
    );
    dom.fondoImport.hidden = !open;
    if (open) {
      window.setTimeout(() => dom.entradaBusqueda.focus(), 280);
    }
  }

  function alternarMenuImportacion() {
    establecerMenuImportacion(!menuImportacionAbierto());
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTROL DE MODALES
  // ══════════════════════════════════════════════════════════════════════════

  function modalAbierto() {
    return (
      !dom.overlayImportacion.hidden ||
      !dom.overlayFicha.hidden ||
      !dom.overlayModo.hidden ||
      (dom.overlayDuplicado && !dom.overlayDuplicado.hidden)
    );
  }

  function establecerModal(open) {
    document.body.classList.toggle("is-modal-open", open);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SONIDO
  // ══════════════════════════════════════════════════════════════════════════

  function sincronizarUiSilencio() {
    if (!dom.botonSilencio) return;
    dom.botonSilencio.setAttribute("aria-pressed", sonidoSilenciado ? "true" : "false");
    dom.botonSilencio.setAttribute("aria-label", sonidoSilenciado ? "Activar sonidos" : "Silenciar sonidos");
    dom.botonSilencio.title = sonidoSilenciado ? "Activar sonidos" : "Silenciar sonidos";
    const text = dom.botonSilencio.querySelector(".mute-toggle__text");
    if (text) text.textContent = sonidoSilenciado ? "MUTE" : "SONIDO";
  }

  function establecerSonidoSilenciado(muted) {
    sonidoSilenciado = Boolean(muted);
    localStorage.setItem("mdr-sound-muted", sonidoSilenciado ? "1" : "0");
    if (contextoAudio) {
      if (sonidoSilenciado && contextoAudio.state === "running") contextoAudio.suspend().catch(() => {});
      if (!sonidoSilenciado && contextoAudio.state === "suspended") contextoAudio.resume().catch(() => {});
    }
    sincronizarUiSilencio();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORDENACIÓN DE LA RUEDA
  // ══════════════════════════════════════════════════════════════════════════

  function sincronizarUiOrdenRueda() {
    if (!dom.botonOrdenRueda) return;
    const label = ordenRueda === 1 ? "A → Z" : "Z → A";
    dom.botonOrdenRueda.dataset.dir = String(ordenRueda);
    dom.botonOrdenRueda.textContent = label;
    dom.botonOrdenRueda.title =
      ordenRueda === 1
        ? "Orden alfabético A → Z (clic para invertir)"
        : "Orden alfabético Z → A (clic para invertir)";
    dom.botonOrdenRueda.setAttribute("aria-label", `Ordenar rueda por nombre. Ahora ${label}`);
  }

  function ordenarRuedaPorNombre(dir = ordenRueda) {
    if (!alumnos.length) return;

    const current = alumnos[indiceActivo()];
    ordenRueda = dir === -1 ? -1 : 1;
    ordenRuedaAplicado = true;

    alumnos.sort(
      (a, b) =>
        ordenRueda *
        String(a.nombre || "").localeCompare(String(b.nombre || ""), "es", {
          sensitivity: "base",
          numeric: true,
        })
    );

    if (current) {
      const next = alumnos.indexOf(current);
      indiceGiro = next >= 0 ? next : 0;
    } else {
      indiceGiro = 0;
    }

    sincronizarUiOrdenRueda();
    renderizarFichas();
    persistirAlumnos();
    establecerEstado(`Rueda · ${ordenRueda === 1 ? "A → Z" : "Z → A"}`);
    reproducirClic();
  }

  function alternarOrdenRueda() {
    if (!ordenRuedaAplicado) {
      ordenarRuedaPorNombre(1);
      return;
    }
    ordenarRuedaPorNombre(ordenRueda === 1 ? -1 : 1);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MODOS DE VISTA (rueda / tabla)
  // ══════════════════════════════════════════════════════════════════════════

  function sincronizarUiVista() {
    const esTabla = modoVista === "tabla";
    if (dom.escritorio) dom.escritorio.classList.toggle("view-table", esTabla);
    if (dom.vistaTabla) dom.vistaTabla.hidden = !esTabla;
    if (dom.botonVista) {
      dom.botonVista.setAttribute("aria-pressed", esTabla ? "true" : "false");
      dom.botonVista.setAttribute(
        "aria-label",
        esTabla ? "Cambiar a vista rueda" : "Cambiar a vista tabla"
      );
      dom.botonVista.title = esTabla ? "Cambiar a vista rueda" : "Cambiar a vista tabla";
      const text = dom.botonVista.querySelector(".view-toggle__text");
      if (text) text.textContent = esTabla ? "RUEDA" : "TABLA";
    }
  }

  function establecerModoVista(mode) {
    modoVista = mode === "tabla" ? "tabla" : "rueda";
    sincronizarUiVista();
    if (modoVista === "tabla") {
      renderizarVistaTabla();
      establecerEstado("Vista tabla · arrastra fichas entre cursos");
    } else {
      renderizarFichas();
      establecerEstado("Vista rueda · gira con el ratón o flechas");
    }
    reproducirClic();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VISTA TABLA — ordenación por curso
  // ══════════════════════════════════════════════════════════════════════════

  /** Dirección de ordenación alfabética por curso: 1 = A→Z, -1 = Z→A */
  const ordenPorCurso = new Map();

  function obtenerOrdenCurso(curso) {
    return ordenPorCurso.get(curso) === -1 ? -1 : 1;
  }

  function alternarOrdenCurso(curso) {
    ordenPorCurso.set(curso, obtenerOrdenCurso(curso) === 1 ? -1 : 1);
  }

  function compararNombre(a, b, dir = 1) {
    return (
      dir *
      String(a.alumno.nombre || "").localeCompare(String(b.alumno.nombre || ""), "es", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }

  /** Agrupa alumnos por curso y ordena alfabéticamente dentro de cada grupo */
  function agruparAlumnosPorCurso() {
    const groups = new Map();
    alumnos.forEach((alumno, index) => {
      const curso = String(alumno.curso || "").trim() || "Sin curso";
      if (!groups.has(curso)) groups.set(curso, []);
      groups.get(curso).push({ alumno, index });
    });

    return [...groups.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "es", { numeric: true, sensitivity: "base" }))
      .map(([curso, rows]) => {
        const dir = obtenerOrdenCurso(curso);
        return {
          curso,
          sortDir: dir,
          rows: rows.sort((a, b) => compararNombre(a, b, dir)),
        };
      });
  }

  function etiquetaCurso(alumno) {
    return String(alumno?.curso || "").trim() || "Sin curso";
  }

  function valorCursoDesdeEtiqueta(label) {
    return label === "Sin curso" ? "" : label;
  }

  // ── Arrastrar y soltar en la vista tabla ─────────────────────────────────

  let indiceArrastreTabla = null;
  let suprimirClicFichaTabla = false;

  function limpiarResaltadoSoltar() {
    if (!dom.contenidoTabla) return;
    dom.contenidoTabla.querySelectorAll(".course-block.is-drop-target").forEach((el) => {
      el.classList.remove("is-drop-target");
    });
  }

  function moverAlumnoACurso(index, targetLabel) {
    const alumno = alumnos[index];
    if (!alumno) return false;

    const fromLabel = etiquetaCurso(alumno);
    if (fromLabel === targetLabel) return false;

    alumno.curso = valorCursoDesdeEtiqueta(targetLabel);
    persistirAlumnos();
    renderizarVistaTabla();
    establecerEstado(`${alumno.nombre || "Ficha"} → ${targetLabel}`);
    reproducirClic();
    return true;
  }

  /** Vincula los eventos de arrastrar/soltar a un bloque de curso */
  function vincularZonaSoltarCurso(block, curso) {
    block.dataset.curso = curso;

    block.addEventListener("dragover", (e) => {
      if (indiceArrastreTabla == null) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      block.classList.add("is-drop-target");
    });

    block.addEventListener("dragenter", (e) => {
      if (indiceArrastreTabla == null) return;
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
      limpiarResaltadoSoltar();
      const raw = e.dataTransfer.getData("text/plain");
      const index = Number(raw !== "" ? raw : indiceArrastreTabla);
      indiceArrastreTabla = null;
      if (!Number.isInteger(index) || index < 0 || index >= alumnos.length) return;
      moverAlumnoACurso(index, curso);
    });
  }

  /** Vincula los eventos de arrastre a una ficha de la tabla */
  function vincularArrastreFichaTabla(card, index) {
    card.draggable = true;

    card.addEventListener("dragstart", (e) => {
      indiceArrastreTabla = index;
      suprimirClicFichaTabla = false;
      card.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
      try {
        e.dataTransfer.setDragImage(card, card.offsetWidth / 2, 18);
      } catch {
        /* ignorar */
      }
      if (dom.contenidoTabla) dom.contenidoTabla.classList.add("is-dragging-card");
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("is-dragging");
      limpiarResaltadoSoltar();
      if (dom.contenidoTabla) dom.contenidoTabla.classList.remove("is-dragging-card");
      if (indiceArrastreTabla != null) {
        suprimirClicFichaTabla = true;
        window.setTimeout(() => {
          suprimirClicFichaTabla = false;
        }, 40);
      }
      indiceArrastreTabla = null;
    });
  }

  /** HTML de ficha en el clasificador (nombre legible + datos clave) */
  function htmlFichaTabla(alumno, index) {
    const tel = alumno.telefono ? escaparHtml(alumno.telefono) : "";
    return `
      <span class="table-card__grip" aria-hidden="true"></span>
      <span class="table-card__index">N.º ${String(index + 1).padStart(3, "0")}</span>
      <strong class="table-card__name">${escaparHtml(alumno.nombre || "Sin nombre")}</strong>
      <span class="table-card__instrument">${escaparHtml(alumno.instrumento || "—")}</span>
      ${tel ? `<span class="table-card__meta">${tel}</span>` : ""}
    `;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERIZADO — VISTA TABLA
  // ══════════════════════════════════════════════════════════════════════════

  function renderizarVistaTabla() {
    if (!dom.contenidoTabla) return;

    indiceArrastreTabla = null;
    limpiarResaltadoSoltar();
    dom.contenidoTabla.classList.remove("is-dragging-card");

    if (!alumnos.length) {
      dom.contenidoTabla.innerHTML =
        '<p class="table-view__empty">Sin fichas · crea una nueva desde el menú</p>';
      return;
    }

    const groups = agruparAlumnosPorCurso();
    dom.contenidoTabla.innerHTML = "";

    const intro = document.createElement("p");
    intro.className = "table-view__legend";
    intro.textContent = "Clasificador por curso · arrastra fichas entre cajones";
    dom.contenidoTabla.appendChild(intro);

    groups.forEach(({ curso, rows, sortDir }) => {
      const block = document.createElement("section");
      block.className = "course-block";
      block.setAttribute("aria-label", `Cajón ${curso}`);

      const head = document.createElement("div");
      head.className = "course-block__head";

      const title = document.createElement("h2");
      title.className = "course-block__title";
      title.innerHTML = `<span class="course-block__tag">[ ${escaparHtml(curso)} ]</span>`;

      const rail = document.createElement("span");
      rail.className = "course-block__rail";
      rail.setAttribute("aria-hidden", "true");

      const meta = document.createElement("p");
      meta.className = "course-block__meta";
      meta.textContent = `( ${rows.length} ${rows.length === 1 ? "alumno" : "alumnos"} )`;

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
        alternarOrdenCurso(curso);
        renderizarVistaTabla();
        reproducirClic();
        establecerEstado(
          `${curso} · ${obtenerOrdenCurso(curso) === 1 ? "A → Z" : "Z → A"}`
        );
      });

      head.append(title, rail, meta, sortBtn);

      const grid = document.createElement("div");
      grid.className = "course-grid";

      rows.forEach(({ alumno, index }) => {
        const card = document.createElement("article");
        card.className = "table-card";
        card.dataset.index = String(index);
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.setAttribute(
          "aria-label",
          `Abrir ficha de ${alumno.nombre || "sin nombre"}. Arrastra para cambiar de curso`
        );
        card.title = "Arrastra para cambiar de curso · clic para abrir";
        card.innerHTML = htmlFichaTabla(alumno, index);

        card.addEventListener("click", () => {
          if (suprimirClicFichaTabla) return;
          abrirFicha(index);
        });
        card.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            abrirFicha(index);
          }
        });

        vincularArrastreFichaTabla(card, index);
        grid.appendChild(card);
      });

      vincularZonaSoltarCurso(block, curso);
      block.appendChild(head);
      block.appendChild(grid);
      dom.contenidoTabla.appendChild(block);
    });
  }

  /** Refresca la vista activa (rueda o tabla) */
  function actualizarVistas() {
    if (modoVista === "tabla") renderizarVistaTabla();
    else renderizarFichas();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SONIDO DE LA RUEDA (cartulina / plástico de Rolodex)
  // ══════════════════════════════════════════════════════════════════════════

  /** Buffer corto de ruido blanco reutilizable para el “flap” de papel */
  let bufferRuidoRueda = null;

  function obtenerBufferRuido() {
    if (bufferRuidoRueda) return bufferRuidoRueda;
    const ctx = contextoAudio;
    const n = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    }
    bufferRuidoRueda = buf;
    return buf;
  }

  /**
   * Sonido al pasar una ficha: golpe suave de plástico + roce breve de cartulina.
   * (no es el “blip” electrónico anterior)
   */
  function reproducirClic() {
    if (sonidoSilenciado) return;
    try {
      if (!contextoAudio) contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
      if (contextoAudio.state === "suspended") contextoAudio.resume().catch(() => {});
      const t = contextoAudio.currentTime;

      /* Golpe bajo del eje / plástico */
      const thud = contextoAudio.createOscillator();
      const thudGain = contextoAudio.createGain();
      const thudFilter = contextoAudio.createBiquadFilter();
      thud.type = "triangle";
      thud.frequency.setValueAtTime(110, t);
      thud.frequency.exponentialRampToValueAtTime(48, t + 0.06);
      thudFilter.type = "lowpass";
      thudFilter.frequency.setValueAtTime(420, t);
      thudGain.gain.setValueAtTime(0.045, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      thud.connect(thudFilter);
      thudFilter.connect(thudGain);
      thudGain.connect(contextoAudio.destination);
      thud.start(t);
      thud.stop(t + 0.09);

      /* Roce corto de cartulina */
      const noise = contextoAudio.createBufferSource();
      noise.buffer = obtenerBufferRuido();
      const noiseFilter = contextoAudio.createBiquadFilter();
      const noiseGain = contextoAudio.createGain();
      noiseFilter.type = "bandpass";
      noiseFilter.frequency.setValueAtTime(1400, t);
      noiseFilter.Q.setValueAtTime(0.7, t);
      noiseGain.gain.setValueAtTime(0.028, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(contextoAudio.destination);
      noise.start(t);
      noise.stop(t + 0.05);
    } catch {
      /* ignorar */
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERIZADO — FICHAS EN LA RUEDA
  // ══════════════════════════════════════════════════════════════════════════

  /** Devuelve las entradas de campos extra (no canónicos) de un alumno */
  function entradasExtra(alumno) {
    return Object.entries(alumno || {}).filter(
      ([k, v]) => !CLAVES_NUCLEO.has(k) && v != null && String(v).trim() !== ""
    );
  }

  /** Normaliza el nombre de un campo personalizado */
  function normalizarNombreCampo(raw) {
    return String(raw || "")
      .trim()
      .replace(/\s+/g, " ");
  }

  /**
   * Crea una fila editable de campo personalizado (solo esta ficha).
   * @returns {HTMLElement}
   */
  function crearFilaCampoExtra(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "extra-field-row";

    const labelKey = document.createElement("label");
    labelKey.className = "extra-field-row__key";
    const capKey = document.createElement("span");
    capKey.textContent = "Campo";
    const inputKey = document.createElement("input");
    inputKey.type = "text";
    inputKey.className = "extra-field-key";
    inputKey.autocomplete = "off";
    inputKey.placeholder = "p. ej. Tutor";
    inputKey.value = key;

    const labelVal = document.createElement("label");
    labelVal.className = "extra-field-row__val";
    const capVal = document.createElement("span");
    capVal.textContent = "Valor";
    const inputVal = document.createElement("input");
    inputVal.type = "text";
    inputVal.className = "extra-field-val";
    inputVal.autocomplete = "off";
    inputVal.placeholder = "p. ej. Perico Pérez";
    inputVal.value = value ?? "";

    const btnRemove = document.createElement("button");
    btnRemove.type = "button";
    btnRemove.className = "extra-field-remove";
    btnRemove.setAttribute("aria-label", "Eliminar este campo de la ficha");
    btnRemove.title = "Eliminar campo";
    btnRemove.textContent = "×";
    btnRemove.addEventListener("click", () => {
      row.remove();
      establecerEstado("Campo quitado de esta ficha · guarda para confirmar");
    });

    labelKey.append(capKey, inputKey);
    labelVal.append(capVal, inputVal);
    row.append(labelKey, labelVal, btnRemove);
    return row;
  }

  function anadirCampoExtraEnFormulario() {
    if (!dom.camposExtra) return;
    const row = crearFilaCampoExtra("", "");
    dom.camposExtra.appendChild(row);
    const inputKey = row.querySelector(".extra-field-key");
    if (inputKey) window.setTimeout(() => inputKey.focus(), 30);
  }

  /** Lee los campos extra del formulario; solo afectan a la ficha en edición */
  function leerCamposExtraDelFormulario() {
    const out = {};
    const seen = new Set();
    if (!dom.camposExtra) return { extras: out, error: null };

    for (const row of dom.camposExtra.querySelectorAll(".extra-field-row")) {
      const key = normalizarNombreCampo(row.querySelector(".extra-field-key")?.value);
      const val = String(row.querySelector(".extra-field-val")?.value ?? "").trim();
      if (!key) {
        if (val) {
          return {
            extras: null,
            error: "Hay un valor sin nombre de campo · ponle nombre o bórralo",
          };
        }
        continue;
      }

      const clave = normalizarClave(key);
      if (CLAVES_NUCLEO.has(clave)) {
        return {
          extras: null,
          error: `“${key}” es un campo fijo · elige otro nombre`,
        };
      }
      if (seen.has(clave)) {
        return { extras: null, error: `Campo duplicado: “${key}”` };
      }
      seen.add(clave);
      if (val) out[key] = val;
    }

    return { extras: out, error: null };
  }

  /** Genera el HTML interno de una ficha (usado en rueda y tabla) */
  function htmlFicha(alumno, index) {
    const bits = [];
    if (alumno.curso) {
      bits.push(`<p><span class="field-label">Curso</span> ${escaparHtml(alumno.curso)}</p>`);
    }
    if (alumno.telefono) {
      bits.push(`<p><span class="field-label">Tel.</span> ${escaparHtml(alumno.telefono)}</p>`);
    }
    if (alumno.email) {
      const raw = String(alumno.email).trim();
      const mail = escaparHtml(raw);
      bits.push(
        `<p><span class="field-label">Mail</span> <a class="card-mail" href="mailto:${encodeURIComponent(raw)}" title="Escribir a ${mail}">${mail}</a></p>`
      );
    }

    return `
      <span class="card-index">N.º ${String(index + 1).padStart(3, "0")}</span>
      <div>
        <h3>${escaparHtml(alumno.nombre || "Sin nombre")}</h3>
        ${bits.join("")}
      </div>
      <span class="badge">${escaparHtml(alumno.instrumento || "Sin instrumento")}</span>
    `;
  }

  /** Calcula qué índices de alumnos son visibles en la rueda */
  function indicesVisibles() {
    const n = alumnos.length;
    const current = indiceActivo();
    if (!n) return [];
    if (n <= RANGO_VISIBLE * 2 + 1) {
      return Array.from({ length: n }, (_, i) => i);
    }
    const out = [];
    for (let d = -RANGO_VISIBLE; d <= RANGO_VISIBLE; d++) {
      out.push((current + d + n * 10) % n);
    }
    return out;
  }

  /** Renderiza las fichas visibles en la rueda 3D */
  function renderizarFichas() {
    const current = indiceActivo();
    dom.rolodex.innerHTML = "";

    indicesVisibles().forEach((index) => {
      const card = document.createElement("article");
      card.className = "card" + (index === current ? " is-active" : "");
      card.dataset.index = String(index);
      card.style.transform = transformacionFicha(index);
      card.innerHTML = htmlFicha(alumnos[index], index);
      dom.rolodex.appendChild(card);
    });

    actualizarRotacion(false);
  }

  /** Actualiza la rotación CSS de la rueda y marca la ficha activa */
  function actualizarRotacion(animate = true) {
    const current = indiceActivo();
    dom.rolodex.classList.toggle("is-spinning", animate);
    dom.rolodex.style.transform = `rotateX(${indiceGiro * ANGULO_FICHA}deg)`;

    dom.rolodex.querySelectorAll(".card").forEach((card) => {
      const idx = Number(card.dataset.index);
      const on = idx === current;
      card.classList.toggle("is-active", on);
      card.style.transform = transformacionFicha(idx);
      card.style.pointerEvents = on ? "auto" : "none";
    });

    actualizarContador();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NAVEGACIÓN DE LA RUEDA
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Mueve la rueda a un índice de datos sin invertir en el borde.
   * shortest=true elige la dirección más corta (búsqueda); false mantiene el giro actual.
   */
  function irA(targetIndex, { sound = true, rebuild = true, shortest = true } = {}) {
    if (!alumnos.length) return;
    const n = alumnos.length;
    const normalized = ((targetIndex % n) + n) % n;
    const current = indiceActivo();

    let delta = normalized - current;
    if (shortest) {
      if (delta > n / 2) delta -= n;
      if (delta < -n / 2) delta += n;
    }

    indiceGiro += delta;

    if (rebuild || alumnos.length > RANGO_VISIBLE * 2 + 1) renderizarFichas();
    else actualizarRotacion(true);

    if (sound && delta !== 0) reproducirClic();
  }

  /** Avanza la rueda un paso en la dirección indicada */
  function avanzar(delta, { sinBloqueo = false } = {}) {
    if (modoVista === "tabla") return;
    if (!alumnos.length || modalAbierto()) return;
    if (bloqueoRueda && !sinBloqueo) return;
    if (!sinBloqueo) {
      bloqueoRueda = true;
      window.setTimeout(() => {
        bloqueoRueda = false;
      }, 120);
    }
    indiceGiro += delta;
    const needsRebuild = alumnos.length > RANGO_VISIBLE * 2 + 1;
    if (needsRebuild) renderizarFichas();
    else actualizarRotacion(true);
    reproducirClic();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BÚSQUEDA
  // ══════════════════════════════════════════════════════════════════════════

  function cerrarBusqueda() {
    dom.resultadosBusqueda.hidden = true;
    dom.resultadosBusqueda.innerHTML = "";
    dom.entradaBusqueda.setAttribute("aria-expanded", "false");
  }

  function abrirBusqueda(matches) {
    dom.resultadosBusqueda.innerHTML = "";
    if (!matches.length) {
      cerrarBusqueda();
      return;
    }

    matches.slice(0, 12).forEach(({ alumno, index }, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", i === 0 ? "true" : "false");
      li.dataset.index = String(index);
      li.innerHTML = `
        <strong>${escaparHtml(alumno.nombre || "Sin nombre")}</strong>
        <span class="meta">${escaparHtml(alumno.instrumento || "—")} · ${escaparHtml(alumno.curso || "—")}</span>
      `;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        irA(index);
        dom.entradaBusqueda.value = alumno.nombre || "";
        cerrarBusqueda();
        establecerMenuImportacion(false);
        establecerEstado(`Ficha: ${alumno.nombre}`);
        if (modoVista === "tabla") abrirFicha(index);
      });
      dom.resultadosBusqueda.appendChild(li);
    });

    dom.resultadosBusqueda.hidden = false;
    dom.entradaBusqueda.setAttribute("aria-expanded", "true");
  }

  /** Construye un blob de texto buscable a partir de todos los valores de un alumno */
  function textoBuscable(alumno) {
    return normalizarClave(
      [...Object.values(alumno)].filter((v) => v != null && String(v).trim()).join(" ")
    );
  }

  function ejecutarBusqueda(query) {
    const q = normalizarClave(query);
    if (!q) {
      cerrarBusqueda();
      return;
    }

    const matches = alumnos
      .map((alumno, index) => ({ alumno, index }))
      .filter(({ alumno }) => textoBuscable(alumno).includes(q));

    abrirBusqueda(matches);

    if (matches.length === 1) irA(matches[0].index, { sound: true });
    else if (matches.length > 1) irA(matches[0].index, { sound: false });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // IMPORTACIÓN — MAPEO DE COLUMNAS
  // ══════════════════════════════════════════════════════════════════════════

  /** Detecta el separador CSV (coma o punto y coma) */
  function detectarSeparadorCsv(text) {
    const sample = text.split(/\r?\n/, 3).join("\n");
    const commas = (sample.match(/,/g) || []).length;
    const semis = (sample.match(/;/g) || []).length;
    return semis > commas ? ";" : ",";
  }

  /** Parsea filas crudas desde CSV o Excel usando SheetJS */
  function parsearFilasCrudas(data, isCsv) {
    const wb = isCsv
      ? XLSX.read(data, { type: "string", FS: detectarSeparadorCsv(data) })
      : XLSX.read(data, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return { sheetName: wb.SheetNames[0], rows };
  }

  /** Abre el modal de mapeo de columnas para una importación */
  function abrirMapeadorImportacion({ fileName, sheetName, rows }) {
    if (!rows.length) {
      establecerEstado("El archivo no tiene filas");
      return;
    }

    const headers = Object.keys(rows[0]);
    const used = new Set();

    importacionPendiente = { fileName, sheetName, rows, headers };

    dom.subtituloImportacion.textContent = `${fileName} · hoja "${sheetName}" · ${rows.length} filas`;
    dom.previsualizacion.textContent = `Vista previa: ${headers.slice(0, 5).join(" · ")}${headers.length > 5 ? "…" : ""}`;
    dom.cuerpoMapa.innerHTML = "";

    headers.forEach((header) => {
      let suggested = adivinarCampo(header);
      if (suggested && used.has(suggested)) suggested = "";
      if (suggested) used.add(suggested);

      const sample = rows.slice(0, 3).map((r) => String(r[header] ?? "").trim()).filter(Boolean)[0] || "—";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escaparHtml(header)}</strong></td>
        <td></td>
        <td class="sample" title="${escaparHtml(sample)}">${escaparHtml(sample)}</td>
      `;

      const select = document.createElement("select");
      select.dataset.header = header;
      select.innerHTML =
        `<option value="">— Ignorar —</option>` +
        CAMPOS_CANONICOS.map(
          (f) => `<option value="${f.id}"${f.id === suggested ? " selected" : ""}>${f.label}</option>`
        ).join("") +
        `<option value="__custom__">Campo extra (mismo nombre)</option>`;

      if (!suggested && normalizarClave(header) && !adivinarCampo(header)) {
        /* dejar en ignorar; el usuario puede elegir custom */
      }

      tr.children[1].appendChild(select);
      dom.cuerpoMapa.appendChild(tr);
    });

    const nombreSelect = [...dom.cuerpoMapa.querySelectorAll("select")].find((s) => s.value === "nombre");
    if (!nombreSelect) {
      const first = dom.cuerpoMapa.querySelector("select");
      if (first) first.value = "nombre";
    }

    dom.overlayImportacion.hidden = false;
    establecerModal(true);
  }

  function cerrarMapeadorImportacion() {
    dom.overlayImportacion.hidden = true;
    importacionPendiente = null;
    establecerModal(!dom.overlayFicha.hidden);
  }

  // ── Selección de modo de importación ─────────────────────────────────────

  /** Completa la promesa del modo de importación elegido por el usuario */
  /** Completa la elección de modo de importación */
  function completarModoImportacion(mode) {
    dom.overlayModo.hidden = true;
    establecerModal(
      !dom.overlayImportacion.hidden ||
        !dom.overlayFicha.hidden ||
        (dom.overlayDuplicado && !dom.overlayDuplicado.hidden)
    );
    const resolve = resolverModoImportacion;
    resolverModoImportacion = null;
    if (resolve) resolve(mode);
  }

  /** Muestra el modal preguntando si reemplazar, añadir o cancelar */
  function pedirModoImportacion(incomingCount) {
    if (!alumnos.length) return Promise.resolve("reemplazar");

    dom.subtituloModo.textContent =
      `Hay ${alumnos.length} fichas ahora. El archivo trae ${incomingCount}. ` +
      `¿Sobrescribir la base o añadir las nuevas?`;
    dom.overlayModo.hidden = false;
    establecerModal(true);

    return new Promise((resolve) => {
      resolverModoImportacion = resolve;
    });
  }

  function indicePorNombre(nombre, lista = alumnos) {
    const clave = normalizarClave(nombre);
    if (!clave) return -1;
    return lista.findIndex((a) => normalizarClave(a.nombre) === clave);
  }

  function resumenFichaCorta(alumno) {
    const bits = [
      alumno.instrumento || "—",
      alumno.curso || "—",
      alumno.telefono || "—",
    ];
    return bits.join(" · ");
  }

  function mostrarErrorDuplicado(msg) {
    if (!dom.errorDuplicado) return;
    if (!msg) {
      dom.errorDuplicado.hidden = true;
      dom.errorDuplicado.textContent = "";
      return;
    }
    dom.errorDuplicado.hidden = false;
    dom.errorDuplicado.textContent = msg;
  }

  /**
   * Pregunta qué hacer cuando el nombre importado ya existe.
   * @returns {Promise<{accion:"sobreescribir"|"omitir"|"crear", nombre?:string}>}
   */
  function pedirResolucionDuplicado(nuevo, existente, aviso = "") {
    const nombre = nuevo.nombre || "Sin nombre";
    const prog =
      progresoDuplicado.total > 1
        ? ` (${progresoDuplicado.actual} de ${progresoDuplicado.total})`
        : "";
    const titulo = document.getElementById("dupTitle");
    if (titulo) titulo.textContent = `Nombre duplicado${prog}`;
    dom.subtituloDuplicado.textContent = `Ya existe una ficha llamada “${nombre}”. ¿Qué quieres hacer?`;
    dom.comparacionDuplicado.innerHTML = `
      <div class="dup-compare__col">
        <span class="dup-compare__label">Existente</span>
        <strong>${escaparHtml(existente.nombre || "Sin nombre")}</strong>
        ${escaparHtml(resumenFichaCorta(existente))}
      </div>
      <div class="dup-compare__col">
        <span class="dup-compare__label">Importada</span>
        <strong>${escaparHtml(nuevo.nombre || "Sin nombre")}</strong>
        ${escaparHtml(resumenFichaCorta(nuevo))}
      </div>
    `;
    dom.entradaNombreDuplicado.value = nuevo.nombre || "";
    mostrarErrorDuplicado(aviso);
    dom.overlayDuplicado.hidden = false;
    establecerModal(true);
    window.setTimeout(() => {
      if (dom.entradaNombreDuplicado) {
        dom.entradaNombreDuplicado.focus();
        dom.entradaNombreDuplicado.select();
      }
    }, 40);

    return new Promise((resolve) => {
      resolverDuplicado = resolve;
    });
  }

  function nombreDuplicadoOcupado(nombre) {
    return (
      indicePorNombre(nombre, alumnos) >= 0 ||
      indicePorNombre(nombre, nombresLoteDuplicado) >= 0
    );
  }

  function completarDuplicado(accion) {
    if (!resolverDuplicado) {
      if (dom.overlayDuplicado) dom.overlayDuplicado.hidden = true;
      return;
    }

    if (accion === "crear") {
      const nombre = (dom.entradaNombreDuplicado?.value || "").trim();
      if (!nombre) {
        mostrarErrorDuplicado("Escribe un nombre para la ficha nueva");
        dom.entradaNombreDuplicado?.focus();
        return;
      }
      if (nombreDuplicadoOcupado(nombre)) {
        mostrarErrorDuplicado(
          `“${nombre}” también existe. Cambia el nombre, sobrescribe u omite.`
        );
        dom.entradaNombreDuplicado?.focus();
        dom.entradaNombreDuplicado?.select();
        return;
      }
      const resolve = resolverDuplicado;
      resolverDuplicado = null;
      dom.overlayDuplicado.hidden = true;
      mostrarErrorDuplicado("");
      establecerModal(
        !dom.overlayImportacion.hidden || !dom.overlayFicha.hidden || !dom.overlayModo.hidden
      );
      resolve({ accion: "crear", nombre });
      return;
    }

    const resolve = resolverDuplicado;
    resolverDuplicado = null;
    dom.overlayDuplicado.hidden = true;
    mostrarErrorDuplicado("");
    establecerModal(
      !dom.overlayImportacion.hidden || !dom.overlayFicha.hidden || !dom.overlayModo.hidden
    );
    resolve({ accion });
  }

  /**
   * Al añadir: resuelve conflictos de nombre uno a uno.
   * Puede sobrescribir fichas existentes in-place.
   */
  async function resolverDuplicadosAlAnadir(listaNueva) {
    const anadidas = [];
    nombresLoteDuplicado = anadidas;
    let sobrescritas = 0;
    let omitidas = 0;

    const conflictos = listaNueva.filter((nuevo, i) => {
      if (indicePorNombre(nuevo.nombre, alumnos) >= 0) return true;
      const prev = listaNueva.slice(0, i);
      return indicePorNombre(nuevo.nombre, prev) >= 0;
    });
    progresoDuplicado = { actual: 0, total: conflictos.length };
    let conflictoIdx = 0;

    for (const nuevo of listaNueva) {
      let candidato = { ...nuevo };
      let aviso = "";

      while (true) {
        const idxExistente = indicePorNombre(candidato.nombre, alumnos);
        const idxEnLote = indicePorNombre(candidato.nombre, anadidas);

        if (idxExistente < 0 && idxEnLote < 0) {
          anadidas.push(candidato);
          break;
        }

        conflictoIdx += 1;
        progresoDuplicado.actual = Math.min(conflictoIdx, progresoDuplicado.total || conflictoIdx);

        const existente =
          idxExistente >= 0 ? alumnos[idxExistente] : anadidas[idxEnLote];
        const decision = await pedirResolucionDuplicado(candidato, existente, aviso);
        aviso = "";

        if (decision.accion === "omitir") {
          omitidas += 1;
          break;
        }

        if (decision.accion === "sobreescribir") {
          const reemplazo = { ...candidato, nombre: existente.nombre };
          if (idxExistente >= 0) alumnos[idxExistente] = reemplazo;
          else anadidas[idxEnLote] = reemplazo;
          sobrescritas += 1;
          break;
        }

        /* “crear” ya viene con nombre libre (validado en completarDuplicado) */
        const nombreFinal = (decision.nombre || "").trim();
        if (!nombreFinal) {
          aviso = "Escribe un nombre para la ficha nueva";
          continue;
        }
        anadidas.push({ ...candidato, nombre: nombreFinal });
        break;
      }
    }

    nombresLoteDuplicado = [];
    progresoDuplicado = { actual: 0, total: 0 };
    return { anadidas, sobrescritas, omitidas };
  }

  /** Aplica el mapeo de columnas confirmado y procede a cargar */
  async function aplicarMapeoImportacion() {
    if (!importacionPendiente) return;

    const selects = [...dom.cuerpoMapa.querySelectorAll("select")];
    const mapping = {};
    const claimed = new Map();

    for (const sel of selects) {
      const header = sel.dataset.header;
      const value = sel.value;
      if (!value) continue;

      if (value !== "__custom__") {
        if (claimed.has(value)) {
          establecerEstado(`El campo "${value}" está asignado dos veces`);
          return;
        }
        claimed.set(value, header);
      }
      mapping[header] = value;
    }

    if (![...Object.values(mapping)].includes("nombre") && !claimed.has("nombre")) {
      establecerEstado("Asigna al menos una columna a Nombre");
      return;
    }

    const list = importacionPendiente.rows
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
      establecerEstado("No se encontraron filas con nombre");
      return;
    }

    const label = importacionPendiente.fileName;
    const mode = await pedirModoImportacion(list.length);
    if (mode === "cancelar") return;

    cerrarMapeadorImportacion();
    await cargarAlumnos(list, label, mode);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARGA DE ALUMNOS
  // ══════════════════════════════════════════════════════════════════════════

  /** Carga una lista de alumnos en la app (reemplazando o añadiendo) */
  async function cargarAlumnos(list, label, mode = "reemplazar") {
    if (!list.length) {
      establecerEstado("No se encontraron filas con nombre");
      return;
    }

    if (mode === "anadir") {
      const before = alumnos.length;
      const { anadidas, sobrescritas, omitidas } = await resolverDuplicadosAlAnadir(list);
      alumnos = alumnos.concat(anadidas);
      indiceGiro = Math.min(before, Math.max(0, alumnos.length - 1));
      actualizarVistas();

      const partes = [];
      if (anadidas.length) partes.push(`${anadidas.length} añadidas`);
      if (sobrescritas) partes.push(`${sobrescritas} sobrescritas`);
      if (omitidas) partes.push(`${omitidas} omitidas`);
      if (!partes.length) partes.push("sin cambios");
      establecerEstado(`${partes.join(" · ")} · total ${alumnos.length} · ${label}`);
    } else {
      alumnos = list;
      indiceGiro = 0;
      actualizarVistas();
      establecerEstado(`${list.length} fichas · ${label}`);
    }

    reproducirClic();
    persistirAlumnos();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FICHA ABIERTA — VISUALIZACIÓN Y EDICIÓN
  // ══════════════════════════════════════════════════════════════════════════

  function abrirFicha(index = indiceActivo()) {
    if (!alumnos.length) return;
    const i = ((index % alumnos.length) + alumnos.length) % alumnos.length;
    if (i !== indiceActivo()) irA(i, { sound: false });

    esBorradorNuevo = false;
    editandoFicha = false;
    renderizarFicha();
    dom.overlayFicha.hidden = false;
    reiniciarAnimacionFicha();
    establecerModal(true);
    reproducirClic();
  }

  function reiniciarAnimacionFicha() {
    const card = dom.overlayFicha?.querySelector(".sheet-card");
    if (!card) return;
    card.style.animation = "none";
    void card.offsetWidth;
    card.style.animation = "";
  }

  function cerrarFicha() {
    if (esBorradorNuevo) {
      esBorradorNuevo = false;
      editandoFicha = false;
      dom.formularioFicha.reset();
      dom.camposExtra.innerHTML = "";
      dom.overlayFicha.hidden = true;
      establecerModal(!dom.overlayImportacion.hidden);
      establecerEstado("Nueva ficha cancelada");
      return;
    }
    editandoFicha = false;
    dom.overlayFicha.hidden = true;
    establecerModal(!dom.overlayImportacion.hidden);
  }

  /** Cursos por defecto + los que ya existen en la base */
  const CURSOS_POR_DEFECTO = ["1º Grado", "2º Grado", "3º Grado", "4º Grado"];

  function listarCursosDisponibles(incluir = "") {
    const set = new Set(CURSOS_POR_DEFECTO);
    alumnos.forEach((a) => {
      const c = String(a.curso || "").trim();
      if (c) set.add(c);
    });
    const extra = String(incluir || "").trim();
    if (extra) set.add(extra);
    return [...set].sort((a, b) =>
      a.localeCompare(b, "es", { numeric: true, sensitivity: "base" })
    );
  }

  function rellenarSelectCurso(selected = "") {
    const select = dom.formularioFicha?.querySelector('[name="curso"]');
    if (!select) return;
    const valor = String(selected || "").trim();
    const cursos = listarCursosDisponibles(valor);
    select.innerHTML = "";

    const optEmpty = document.createElement("option");
    optEmpty.value = "";
    optEmpty.textContent = "Sin curso";
    select.appendChild(optEmpty);

    cursos.forEach((curso) => {
      const opt = document.createElement("option");
      opt.value = curso;
      opt.textContent = curso;
      select.appendChild(opt);
    });

    select.value = valor;
    if (valor && select.value !== valor) {
      const opt = document.createElement("option");
      opt.value = valor;
      opt.textContent = valor;
      select.appendChild(opt);
      select.value = valor;
    }
  }

  /** Renderiza el contenido del modal de ficha (vista o formulario) */
  function renderizarFicha() {
    const alumno = esBorradorNuevo ? {} : alumnos[indiceActivo()];
    if (!esBorradorNuevo && !alumno) return;

    const card = dom.overlayFicha?.querySelector(".sheet-card");
    const enEdicion = editandoFicha || esBorradorNuevo;
    if (card) card.classList.toggle("sheet-card--editing", enEdicion);

    if (enEdicion) {
      const num = esBorradorNuevo
        ? "nuevo"
        : String(indiceActivo() + 1).padStart(3, "0");
      const cola = esBorradorNuevo
        ? "pendiente de guardar"
        : `${indiceActivo() + 1} / ${alumnos.length}`;
      dom.numFicha.innerHTML =
        `<span class="edit-badge">Modo edición</span>` +
        `<span>Registro N.º ${num} · ${cola}</span>`;
    } else {
      dom.numFicha.textContent = `Ficha N.º ${String(indiceActivo() + 1).padStart(3, "0")} · ${indiceActivo() + 1} / ${alumnos.length}`;
    }

    if (enEdicion) {
      dom.vistaFicha.hidden = true;
      dom.formularioFicha.hidden = false;
      dom.btnEditar.hidden = true;
      dom.btnCancelarEdicion.hidden = false;
      dom.btnGuardar.hidden = false;
      if (dom.btnImprimir) dom.btnImprimir.hidden = true;
      dom.btnEliminar.hidden = esBorradorNuevo;

      if (esBorradorNuevo) {
        dom.formularioFicha.reset();
        dom.camposExtra.innerHTML = "";
        rellenarSelectCurso("");
      } else {
        for (const field of CAMPOS_CANONICOS) {
          const input = dom.formularioFicha.querySelector(`[name="${field.id}"]`);
          if (!input) continue;
          if (field.id === "curso") {
            rellenarSelectCurso(alumno.curso ?? "");
            continue;
          }
          const raw = alumno[field.id] ?? "";
          input.value = field.id === "telefono" ? soloDigitos(raw) : raw;
        }

        dom.camposExtra.innerHTML = "";
        entradasExtra(alumno).forEach(([key, val]) => {
          dom.camposExtra.appendChild(crearFilaCampoExtra(key, val));
        });
      }
    } else {
      dom.formularioFicha.hidden = true;
      dom.vistaFicha.hidden = false;
      dom.btnEditar.hidden = false;
      dom.btnCancelarEdicion.hidden = true;
      dom.btnGuardar.hidden = true;
      if (dom.btnImprimir) dom.btnImprimir.hidden = false;
      dom.btnEliminar.hidden = false;

      dom.formularioFicha.reset();
      dom.camposExtra.innerHTML = "";

      const emailRaw = (alumno.email || "").trim();
      const emailHtml = emailRaw
        ? `<a href="mailto:${escaparHtml(emailRaw)}">${escaparHtml(emailRaw)}</a>`
        : "—";

      const extras = entradasExtra(alumno)
        .map(
          ([k, v]) => `
          <div>
            <dt>${escaparHtml(k)}</dt>
            <dd class="sheet-value">${escaparHtml(v)}</dd>
          </div>`
        )
        .join("");

      dom.vistaFicha.innerHTML = `
        <div class="sheet-hero">
          <h3 id="sheetDialogTitle">${escaparHtml(alumno.nombre || "Sin nombre")}</h3>
          <span class="badge">${escaparHtml(alumno.instrumento || "Sin instrumento")}</span>
        </div>
        <hr class="sheet-rule" />
        <dl class="sheet-grid">
          <div>
            <dt>Curso</dt>
            <dd class="sheet-value">${escaparHtml(alumno.curso || "—")}</dd>
          </div>
          <div>
            <dt>Dirección</dt>
            <dd class="sheet-value">${escaparHtml(alumno.direccion || "—")}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd class="sheet-value">${escaparHtml(alumno.telefono || "—")}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd class="sheet-value">${emailHtml}</dd>
          </div>
          <div class="sheet-field--full">
            <dt>Notas</dt>
            <dd class="sheet-value">${escaparHtml(alumno.notas || "—")}</dd>
          </div>
          ${extras}
        </dl>
      `;
    }
  }

  function imprimirFicha() {
    if (dom.overlayFicha.hidden || editandoFicha || esBorradorNuevo) return;
    window.print();
  }

  /** Guarda la ficha actual (nueva o editada) */
  function guardarFicha() {
    const next = esBorradorNuevo ? {} : { ...alumnos[indiceActivo()] };

    for (const field of CAMPOS_CANONICOS) {
      const input = dom.formularioFicha.querySelector(`[name="${field.id}"]`);
      if (!input) continue;
      let value = input.value.trim();
      if (field.id === "telefono") value = soloDigitos(value);
      next[field.id] = value;
    }

    if (!next.nombre) {
      establecerEstado("El nombre no puede quedar vacío");
      return;
    }

    const { extras, error } = leerCamposExtraDelFormulario();
    if (error) {
      establecerEstado(error);
      return;
    }

    /* Quitar extras antiguos solo de esta ficha; aplicar los del formulario */
    Object.keys(next).forEach((k) => {
      if (!CLAVES_NUCLEO.has(k)) delete next[k];
    });
    Object.assign(next, extras);

    if (esBorradorNuevo) {
      alumnos.push(next);
      indiceGiro = alumnos.length - 1;
      esBorradorNuevo = false;
      editandoFicha = false;
      actualizarVistas();
      persistirAlumnos();
      renderizarFicha();
      establecerEstado(`Creada: ${next.nombre}`);
      reproducirClic();
      return;
    }

    const i = indiceActivo();
    alumnos[i] = next;
    editandoFicha = false;
    renderizarFicha();
    actualizarVistas();
    establecerEstado(`Guardado: ${next.nombre}`);
    reproducirClic();
    persistirAlumnos();
  }

  /** Crea una nueva ficha en blanco y abre el formulario */
  function crearNuevaFicha() {
    esBorradorNuevo = true;
    editandoFicha = true;
    establecerMenuImportacion(false);
    dom.overlayFicha.hidden = false;
    reiniciarAnimacionFicha();
    establecerModal(true);
    renderizarFicha();

    const nombreInput = dom.formularioFicha.querySelector('[name="nombre"]');
    if (nombreInput) {
      window.setTimeout(() => nombreInput.focus(), 50);
    }
    establecerEstado("Nueva ficha · guarda para crearla");
    reproducirClic();
  }

  /** Elimina la ficha actual previa confirmación */
  function eliminarFichaActual() {
    if (esBorradorNuevo) {
      cerrarFicha();
      return;
    }
    if (!alumnos.length) return;
    const i = indiceActivo();
    const nombre = alumnos[i]?.nombre || "esta ficha";
    const ok = window.confirm(`¿Eliminar la ficha de "${nombre}"? Esta acción no se puede deshacer.`);
    if (!ok) return;

    alumnos.splice(i, 1);
    editandoFicha = false;

    if (!alumnos.length) {
      cerrarFicha();
      indiceGiro = 0;
      actualizarVistas();
      persistirAlumnos();
      establecerEstado("Sin fichas · crea una nueva desde el menú");
      reproducirClic();
      return;
    }

    indiceGiro = Math.min(i, alumnos.length - 1);
    actualizarVistas();
    persistirAlumnos();
    renderizarFicha();
    establecerEstado(`Eliminada: ${nombre}`);
    reproducirClic();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // EVENTOS DEL DOM
  // ══════════════════════════════════════════════════════════════════════════

  /** Arrastre vertical de la rueda */
  const UMBRAL_INICIO_ARRASTRE = 8;
  const UMBRAL_PASO_ARRASTRE = 34;
  let arrastreRueda = null;
  let suprimirClicTrasArrastre = false;

  function finalizarArrastreRueda(e) {
    if (!arrastreRueda || e.pointerId !== arrastreRueda.pointerId) return;

    const fueArrastre = arrastreRueda.activo;
    if (fueArrastre) {
      /* Evita que el click posterior abra la ficha tras un arrastre real */
      suprimirClicTrasArrastre = true;
      window.setTimeout(() => {
        suprimirClicTrasArrastre = false;
      }, 80);
      try {
        dom.escenario.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }

    arrastreRueda = null;
    dom.escenario.classList.remove("is-dragging");
  }

  dom.rolodex.addEventListener("click", (e) => {
    if (suprimirClicTrasArrastre) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const mailLink = e.target.closest("a.card-mail");
    if (mailLink) {
      e.stopPropagation();
      return;
    }
    const card = e.target.closest(".card.is-active");
    if (card) abrirFicha(Number(card.dataset.index));
  });

  dom.escenario.addEventListener(
    "wheel",
    (e) => {
      if (modoVista === "tabla" || modalAbierto()) return;
      e.preventDefault();
      avanzar(e.deltaY > 0 ? 1 : -1);
    },
    { passive: false }
  );

  /* Arrastrar arriba/abajo para girar; un clic corto sigue abriendo la ficha */
  dom.escenario.addEventListener("pointerdown", (e) => {
    if (modoVista === "tabla" || modalAbierto()) return;
    if (e.button !== 0) return;
    if (e.target.closest(".stage-tools, .wheel-sort, a.card-mail")) return;

    arrastreRueda = {
      pointerId: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      acumulado: 0,
      activo: false,
    };
  });

  dom.escenario.addEventListener("pointermove", (e) => {
    if (!arrastreRueda || e.pointerId !== arrastreRueda.pointerId) return;

    const total = e.clientY - arrastreRueda.startY;
    if (!arrastreRueda.activo) {
      if (Math.abs(total) < UMBRAL_INICIO_ARRASTRE) return;
      arrastreRueda.activo = true;
      arrastreRueda.lastY = e.clientY;
      arrastreRueda.acumulado = 0;
      try {
        dom.escenario.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dom.escenario.classList.add("is-dragging");
    }

    const dy = e.clientY - arrastreRueda.lastY;
    arrastreRueda.lastY = e.clientY;
    arrastreRueda.acumulado += dy;

    while (Math.abs(arrastreRueda.acumulado) >= UMBRAL_PASO_ARRASTRE) {
      const dir = arrastreRueda.acumulado > 0 ? 1 : -1;
      arrastreRueda.acumulado -= dir * UMBRAL_PASO_ARRASTRE;
      /* Arrastrar arriba → rueda hacia arriba; abajo → rueda hacia abajo */
      avanzar(-dir, { sinBloqueo: true });
    }
  });

  dom.escenario.addEventListener("pointerup", finalizarArrastreRueda);
  dom.escenario.addEventListener("pointercancel", finalizarArrastreRueda);

  document.addEventListener("keydown", (e) => {
    if (dom.overlayDuplicado && !dom.overlayDuplicado.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        completarDuplicado("omitir");
      } else if (e.key === "Enter" && e.target === dom.entradaNombreDuplicado) {
        e.preventDefault();
        completarDuplicado("crear");
      }
      return;
    }

    if (!dom.overlayModo.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        completarModoImportacion("cancelar");
      }
      return;
    }

    if (!dom.overlayImportacion.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        cerrarMapeadorImportacion();
      }
      return;
    }

    if (!dom.overlayFicha.hidden) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (esBorradorNuevo) {
          cerrarFicha();
        } else if (editandoFicha) {
          editandoFicha = false;
          renderizarFicha();
        } else {
          cerrarFicha();
        }
      }
      return;
    }

    if (menuImportacionAbierto() && e.key === "Escape") {
      e.preventDefault();
      establecerMenuImportacion(false);
      return;
    }

    if (e.target === dom.entradaBusqueda) {
      if (e.key === "Escape") cerrarBusqueda();
      if (e.key === "Enter") {
        const first = dom.resultadosBusqueda.querySelector("li");
        if (first) {
          e.preventDefault();
          const idx = Number(first.dataset.index);
          irA(idx);
          cerrarBusqueda();
          establecerMenuImportacion(false);
          if (modoVista === "tabla") abrirFicha(idx);
        }
      }
      return;
    }

    if (e.key === "ArrowDown" || e.key === "PageDown") {
      if (modoVista === "tabla") return;
      e.preventDefault();
      avanzar(1);
    } else if (e.key === "ArrowUp" || e.key === "PageUp") {
      if (modoVista === "tabla") return;
      e.preventDefault();
      avanzar(-1);
    } else if (e.key === "Home") {
      if (modoVista === "tabla") return;
      e.preventDefault();
      irA(0);
    } else if (e.key === "End") {
      if (modoVista === "tabla") return;
      e.preventDefault();
      irA(alumnos.length - 1);
    } else if (e.key === "Enter") {
      if (modoVista === "tabla") return;
      e.preventDefault();
      abrirFicha();
    }
  });

  dom.botonMenu.addEventListener("click", alternarMenuImportacion);
  dom.fondoImport.addEventListener("click", () => establecerMenuImportacion(false));

  let temporizadorBusqueda;
  dom.entradaBusqueda.addEventListener("input", (e) => {
    window.clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = window.setTimeout(() => ejecutarBusqueda(e.target.value), 120);
  });

  dom.entradaBusqueda.addEventListener("blur", () => {
    window.setTimeout(cerrarBusqueda, 150);
  });

  // ── Importación de archivos ──────────────────────────────────────────────

  /** Maneja la importación de un archivo (SQLite, Excel o CSV) */
  async function manejarArchivoImportacion(file) {
    if (!file) return;

    const isSqlite = /\.(db|sqlite|sqlite3)$/i.test(file.name);

    try {
      establecerEstado(`Leyendo ${file.name}…`);

      if (isSqlite) {
        if (!almacenListo || !window.MdrStore) {
          establecerEstado("SQLite aún no está listo");
          return;
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        const previous = alumnos.slice();
        const list = window.MdrStore.importarBytes(bytes);
        if (!list.length) {
          window.MdrStore.reconstruirDesdeAlumnos(previous);
          establecerEstado("El archivo .db no contiene fichas");
          return;
        }

        const mode = await pedirModoImportacion(list.length);
        if (mode === "cancelar") {
          window.MdrStore.reconstruirDesdeAlumnos(previous);
          await window.MdrStore.persistir();
          establecerEstado("Importación cancelada");
          return;
        }

        await cargarAlumnos(list, file.name, mode);
        return;
      }

      if (typeof XLSX === "undefined") {
        establecerEstado("SheetJS no cargó — revisa la red");
        return;
      }

      const isCsv = /\.csv$/i.test(file.name) || file.type.includes("csv");
      let parsed;

      if (isCsv) {
        parsed = parsearFilasCrudas(await file.text(), true);
      } else {
        parsed = parsearFilasCrudas(new Uint8Array(await file.arrayBuffer()), false);
      }

      abrirMapeadorImportacion({ fileName: file.name, ...parsed });
    } catch (err) {
      console.error(err);
      establecerEstado("Error al importar el archivo");
    }
  }

  dom.entradaExcel.addEventListener("change", async (e) => {
    const file = e.target.files && e.target.files[0];
    await manejarArchivoImportacion(file);
    e.target.value = "";
  });

  dom.btnExportarDb.addEventListener("click", descargarArchivoDb);
  dom.btnNuevaFicha.addEventListener("click", crearNuevaFicha);
  dom.botonSilencio.addEventListener("click", () => establecerSonidoSilenciado(!sonidoSilenciado));
  sincronizarUiSilencio();
  if (dom.botonVista) {
    dom.botonVista.addEventListener("click", () => {
      establecerModoVista(modoVista === "tabla" ? "rueda" : "tabla");
    });
  }
  if (dom.botonOrdenRueda) {
    dom.botonOrdenRueda.addEventListener("click", alternarOrdenRueda);
  }
  sincronizarUiVista();
  sincronizarUiOrdenRueda();

  // ── Zona de arrastrar archivos (dropzone) ────────────────────────────────

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
      await manejarArchivoImportacion(file);
    });
  }

  // ── Botones de modales ───────────────────────────────────────────────────

  dom.btnCancelarImport.addEventListener("click", cerrarMapeadorImportacion);
  dom.btnConfirmarImport.addEventListener("click", () => {
    aplicarMapeoImportacion();
  });

  dom.btnReemplazar.addEventListener("click", () => completarModoImportacion("reemplazar"));
  dom.btnAnadir.addEventListener("click", () => completarModoImportacion("anadir"));
  dom.btnCancelarModo.addEventListener("click", () => completarModoImportacion("cancelar"));
  dom.overlayModo.addEventListener("click", (e) => {
    if (e.target === dom.overlayModo) completarModoImportacion("cancelar");
  });

  if (dom.overlayDuplicado) {
    /* Un solo handler por delegación (evita disparar dos veces el mismo clic) */
    dom.overlayDuplicado.addEventListener("click", (e) => {
      if (e.target === dom.overlayDuplicado) {
        completarDuplicado("omitir");
        return;
      }
      const btn = e.target.closest("[data-dup-action]");
      if (!btn || !dom.overlayDuplicado.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      completarDuplicado(btn.getAttribute("data-dup-action"));
    });
  }

  dom.overlayImportacion.addEventListener("click", (e) => {
    if (e.target === dom.overlayImportacion) cerrarMapeadorImportacion();
  });

  dom.btnCerrar.addEventListener("click", cerrarFicha);
  dom.btnEditar.addEventListener("click", () => {
    editandoFicha = true;
    renderizarFicha();
  });
  dom.btnCancelarEdicion.addEventListener("click", () => {
    if (esBorradorNuevo) {
      cerrarFicha();
      return;
    }
    editandoFicha = false;
    renderizarFicha();
  });
  dom.btnGuardar.addEventListener("click", (e) => {
    e.preventDefault();
    guardarFicha();
  });
  if (dom.btnImprimir) {
    dom.btnImprimir.addEventListener("click", imprimirFicha);
  }
  if (dom.btnAnadirCampo) {
    dom.btnAnadirCampo.addEventListener("click", () => {
      anadirCampoExtraEnFormulario();
      reproducirClic();
    });
  }
  dom.btnEliminar.addEventListener("click", eliminarFichaActual);
  dom.formularioFicha.addEventListener("submit", (e) => {
    e.preventDefault();
    guardarFicha();
  });

  // ── Validación del campo teléfono (solo dígitos) ─────────────────────────

  const telefonoInput = dom.formularioFicha.querySelector('[name="telefono"]');
  if (telefonoInput) {
    telefonoInput.addEventListener("input", () => {
      const cleaned = soloDigitos(telefonoInput.value);
      if (telefonoInput.value !== cleaned) telefonoInput.value = cleaned;
    });
    telefonoInput.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      const digits = soloDigitos(text);
      const start = telefonoInput.selectionStart ?? telefonoInput.value.length;
      const end = telefonoInput.selectionEnd ?? telefonoInput.value.length;
      const next = soloDigitos(
        telefonoInput.value.slice(0, start) + digits + telefonoInput.value.slice(end)
      );
      telefonoInput.value = next.slice(0, telefonoInput.maxLength || 15);
    });
  }

  dom.overlayFicha.addEventListener("click", (e) => {
    if (e.target === dom.overlayFicha && !editandoFicha && !esBorradorNuevo) cerrarFicha();
  });

  // ── Inicialización del contexto de audio al primer gesto del usuario ─────

  ["pointerdown", "keydown"].forEach((evt) => {
    document.addEventListener(
      evt,
      () => {
        if (!contextoAudio) {
          try {
            contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
          } catch {
            /* ignorar */
          }
        }
      },
      { once: true }
    );
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ARRANQUE INICIAL
  // ══════════════════════════════════════════════════════════════════════════

  renderizarFichas();
  establecerMenuImportacion(false);
  establecerEstado("Cargando base SQLite…");

  (async function arrancarAlmacen() {
    try {
      if (!window.MdrStore || typeof initSqlJs !== "function") {
        establecerEstado("No se pudo cargar SQLite (revisa la red)");
        return;
      }

      const legacy = leerAlmacenamientoLegado();
      const seed = legacy && legacy.length ? legacy : ALUMNOS_POR_DEFECTO.map((a) => ({ ...a }));
      const { alumnos: loaded, source } = await window.MdrStore.iniciar(seed);
      alumnos = loaded.length ? loaded : seed;
      almacenListo = true;
      indiceGiro = 0;
      actualizarVistas();

      if (source === "seed" && legacy && legacy.length) {
        localStorage.removeItem(CLAVE_ALMACEN_LEGACY);
        establecerEstado(`${alumnos.length} fichas · migradas a SQLite`);
      } else if (source === "sqlite") {
        establecerEstado(`${alumnos.length} fichas · SQLite`);
      } else {
        establecerEstado(`${alumnos.length} fichas · SQLite lista`);
      }
    } catch (err) {
      console.error(err);
      almacenListo = false;
      establecerEstado("Error al iniciar SQLite");
    }
  })();
})();
