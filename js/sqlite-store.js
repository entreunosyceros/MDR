(() => {
  "use strict";

  const SQL_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/";
  const IDB_NAME = "mdr-sqlite-v1";
  const IDB_STORE = "databases";
  const IDB_KEY = "mdr.db";
  const CORE_COLUMNS = ["nombre", "instrumento", "curso", "direccion", "telefono", "email", "notas"];

  let SQL = null;
  let db = null;

  function openIdb() {
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

  async function idbGet() {
    const idb = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(bytes) {
    const idb = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function tableColumns(database, table) {
    try {
      const info = database.exec(`PRAGMA table_info(${table})`);
      if (!info.length) return [];
      const nameIdx = info[0].columns.indexOf("name");
      return info[0].values.map((row) => row[nameIdx]);
    } catch {
      return [];
    }
  }

  function ensureSchema(database) {
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

    const cols = new Set(tableColumns(database, "alumnos"));
    if (cols.size === 0) return;
    for (const col of ["direccion", "instrumento", "curso", "telefono", "email", "notas", "extras"]) {
      if (!cols.has(col)) {
        try {
          database.run(`ALTER TABLE alumnos ADD COLUMN ${col} TEXT`);
        } catch {
          /* column may already exist */
        }
      }
    }
  }

  function createEmptyDb() {
    const database = new SQL.Database();
    ensureSchema(database);
    database.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["app", "MDR"]);
    database.run("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)", ["version", "1"]);
    return database;
  }

  function alumnoToExtras(alumno) {
    const extras = {};
    for (const [k, v] of Object.entries(alumno || {})) {
      if (CORE_COLUMNS.includes(k) || k === "id") continue;
      if (v == null || String(v).trim() === "") continue;
      extras[k] = String(v).trim();
    }
    return JSON.stringify(extras);
  }

  function rowToAlumno(row) {
    const out = {
      nombre: row.nombre || "Sin nombre",
    };
    for (const key of CORE_COLUMNS) {
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
      /* ignore bad extras */
    }
    return out;
  }

  function readAlumnos(database = db) {
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
      return rowToAlumno(row);
    });
  }

  function rebuildFromAlumnos(alumnos) {
    if (!SQL) throw new Error("SQLite no inicializado");
    if (db) {
      db.close();
      db = null;
    }
    db = createEmptyDb();
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
          alumnoToExtras(alumno),
        ]
      );
    }
  }

  async function persist() {
    if (!db) return false;
    const data = db.export();
    await idbSet(data);
    return true;
  }

  function exportBytes() {
    if (!db) throw new Error("No hay base de datos");
    return db.export();
  }

  function importBytes(uint8) {
    if (!SQL) throw new Error("SQLite no inicializado");
    if (db) {
      db.close();
      db = null;
    }
    db = new SQL.Database(uint8);
    ensureSchema(db);
    return readAlumnos(db);
  }

  async function init(seedAlumnos) {
    SQL = await initSqlJs({
      locateFile: (file) => SQL_CDN + file,
    });

    const saved = await idbGet();
    if (saved && saved.length) {
      db = new SQL.Database(saved);
      ensureSchema(db);
      const list = readAlumnos(db);
      if (list.length) {
        /* rewrite once so new columns like direccion are persisted */
        rebuildFromAlumnos(list);
        await persist();
        return { alumnos: list, source: "sqlite" };
      }
    }

    rebuildFromAlumnos(seedAlumnos || []);
    await persist();
    return { alumnos: readAlumnos(), source: "seed" };
  }

  window.MdrStore = {
    init,
    readAlumnos,
    rebuildFromAlumnos,
    persist,
    exportBytes,
    importBytes,
  };
})();
