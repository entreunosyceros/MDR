/**
 * ─────────────────────────────────────────────────────────────────────────────
 * sqlite-store.js — Capa de persistencia SQLite (sql.js + IndexedDB)
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestiona la base de datos SQLite en memoria y la almacena en IndexedDB.
 * Expone la API global window.MdrStore con métodos para iniciar, leer,
 * reconstruir, persistir, exportar e importar la base de datos.
 * ─────────────────────────────────────────────────────────────────────────────
 */
(() => {
  "use strict";

  // ── Constantes de configuración ──────────────────────────────────────────

  const CDN_SQL = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/";
  const IDB_NAME = "mdr-sqlite-v1";
  const IDB_STORE = "databases";
  const IDB_KEY = "mdr.db";
  const COLUMNAS_NUCLEO = ["nombre", "instrumento", "curso", "direccion", "telefono", "email", "notas"];

  // ── Estado interno ───────────────────────────────────────────────────────

  let SQL = null;
  let db = null;

  // ── Acceso a IndexedDB ───────────────────────────────────────────────────

  /** Abre (o crea) la base IndexedDB donde se almacena el archivo .db */
  function abrirIdb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains(IDB_STORE)) {
          idb.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** Obtiene los bytes de la base almacenada en IndexedDB */
  async function idbObtener() {
    const idb = await abrirIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /** Guarda bytes en IndexedDB */
  async function idbGuardar(bytes) {
    const idb = await abrirIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ── Utilidades de esquema ────────────────────────────────────────────────

  /** Devuelve la lista de columnas de una tabla */
  function columnasTabla(database, table) {
    try {
      const info = database.exec(`PRAGMA table_info(${table})`);
      if (!info.length) return [];
      const nameIdx = info[0].columns.indexOf("name");
      return info[0].values.map((row) => row[nameIdx]);
    } catch {
      return [];
    }
  }

  /** Crea las tablas necesarias y añade columnas faltantes */
  function asegurarEsquema(database) {
    database.run(`
      CREATE TABLE IF NOT EXISTS alumnos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        instrumento TEXT,
        curso TEXT,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        notas TEXT,
        extras TEXT DEFAULT '{}'
      );
    `);
    database.run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    const cols = new Set(columnasTabla(database, "alumnos"));
    if (cols.size === 0) return;
    for (const col of ["direccion", "instrumento", "curso", "telefono", "email", "notas", "extras"]) {
      if (!cols.has(col)) {
        try {
          database.run(`ALTER TABLE alumnos ADD COLUMN ${col} TEXT`);
        } catch {
          /* la columna puede ya existir */
        }
      }
    }
  }

  /** Crea una base SQLite vacía con el esquema base y metadatos iniciales */
  function crearBaseVacia() {
    const database = new SQL.Database();
    asegurarEsquema(database);
    database.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["app", "MDR"]);
    database.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["version", "1"]);
    return database;
  }

  // ── Conversión alumno ↔ fila SQL ────────────────────────────────────────

  /** Extrae campos no-núcleo de un alumno y los serializa como JSON */
  function alumnoAExtras(alumno) {
    const extras = {};
    for (const [k, v] of Object.entries(alumno || {})) {
      if (COLUMNAS_NUCLEO.includes(k) || k === "id") continue;
      if (v == null || String(v).trim() === "") continue;
      extras[k] = String(v).trim();
    }
    return JSON.stringify(extras);
  }

  /** Convierte una fila SQL en un objeto alumno limpio */
  function filaAAlumno(row) {
    const out = {
      nombre: row.nombre || "Sin nombre",
    };
    for (const key of COLUMNAS_NUCLEO) {
      if (key === "nombre") continue;
      if (row[key] != null && String(row[key]).trim() !== "") out[key] = String(row[key]).trim();
    }
    try {
      const extras = JSON.parse(row.extras || "{}");
      if (extras && typeof extras === "object") {
        for (const [k, v] of Object.entries(extras)) {
          if (v != null && String(v).trim() !== "") out[k] = String(v).trim();
        }
      }
    } catch {
      /* extras malformados — se ignoran */
    }
    return out;
  }

  // ── Operaciones principales ──────────────────────────────────────────────

  /** Lee todos los alumnos de la tabla ordenados por id */
  function leerAlumnos(database = db) {
    if (!database) return [];
    const result = database.exec(
      "SELECT nombre, instrumento, curso, direccion, telefono, email, notas, extras FROM alumnos ORDER BY id ASC"
    );
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((vals) => {
      const row = {};
      columns.forEach((col, i) => {
        row[col] = vals[i];
      });
      return filaAAlumno(row);
    });
  }

  /** Reconstruye la base completa a partir de un array de alumnos */
  function reconstruirDesdeAlumnos(alumnos) {
    if (!SQL) throw new Error("SQLite no inicializado");
    if (db) {
      db.close();
      db = null;
    }
    db = crearBaseVacia();
    for (const alumno of alumnos) {
      db.run(
        `INSERT INTO alumnos (nombre, instrumento, curso, direccion, telefono, email, notas, extras)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          alumno.nombre || "Sin nombre",
          alumno.instrumento || null,
          alumno.curso || null,
          alumno.direccion || null,
          alumno.telefono || null,
          alumno.email || null,
          alumno.notas || null,
          alumnoAExtras(alumno),
        ]
      );
    }
  }

  /** Persiste la base en memoria a IndexedDB */
  async function persistir() {
    if (!db) return false;
    const data = db.export();
    await idbGuardar(data);
    return true;
  }

  /** Exporta la base como Uint8Array (para descarga .db) */
  function exportarBytes() {
    if (!db) throw new Error("No hay base de datos");
    return db.export();
  }

  /** Importa bytes de un archivo .db externo y devuelve los alumnos */
  function importarBytes(uint8) {
    if (!SQL) throw new Error("SQLite no inicializado");
    if (db) {
      db.close();
      db = null;
    }
    db = new SQL.Database(uint8);
    asegurarEsquema(db);
    return leerAlumnos(db);
  }

  // ── Inicialización ───────────────────────────────────────────────────────

  /**
   * Inicializa sql.js, carga la base desde IndexedDB o crea una nueva
   * con los alumnos semilla proporcionados.
   */
  async function iniciar(seedAlumnos) {
    SQL = await initSqlJs({
      locateFile: (file) => CDN_SQL + file,
    });

    const saved = await idbObtener();
    if (saved && saved.length) {
      db = new SQL.Database(saved);
      asegurarEsquema(db);
      const list = leerAlumnos(db);
      if (list.length) {
        reconstruirDesdeAlumnos(list);
        await persistir();
        return { alumnos: list, source: "sqlite" };
      }
    }

    reconstruirDesdeAlumnos(seedAlumnos || []);
    await persistir();
    return { alumnos: leerAlumnos(), source: "seed" };
  }

  // ── API pública ──────────────────────────────────────────────────────────

  window.MdrStore = {
    iniciar,
    leerAlumnos,
    reconstruirDesdeAlumnos,
    persistir,
    exportarBytes,
    importarBytes,
  };
})();
