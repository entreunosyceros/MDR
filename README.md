# MDR — MacroData Rhythm
<p align="center">
<img width="1024" height="559" alt="logo" src="https://github.com/user-attachments/assets/2697f2c3-6b06-482d-932e-2f32005d374d" />
</p>
Fichero digital estilo **Rolodex** para gestionar alumnos de una escuela de música. Interfaz retro con acentos cyberpunk: rueda 3D de fichas, vista por cursos, importación/exportación y persistencia local con SQLite en el navegador.

## Características

<p align="center">
<img width="1916" height="930" alt="Peek 2026-07-23 17-37" src="https://github.com/user-attachments/assets/64ea4364-e86a-4c1c-b781-57f4de8e66d6" />
</p>

- **Rueda 3D**: navega con la rueda del ratón o las flechas; clic (o Enter) para abrir la ficha
- **Vista tabla**: fichas agrupadas por curso (máx. 4 por fila), con scroll vertical
- **Arrastrar entre cursos**: en la vista tabla, mueve una ficha a otro curso y se actualiza solo
- **Orden alfabético**: A→Z / Z→A en la rueda y en cada grupo de la tabla
- **Alta, edición y borrado** de fichas (nombre, instrumento, curso, dirección, teléfono, email, notas)
- **Teléfono solo numérico** al crear o editar
- **Importación**: SQLite (`.db`), Excel (`.xlsx` / `.xls`) y CSV, con mapeo de columnas
- **Exportación** de la base SQLite (`.db`) para llevarla a otro equipo
- **Persistencia** en el navegador (sql.js + IndexedDB)
- Splash de arranque, sonido de clic (silenciable) y menú lateral de búsqueda / importación

## Requisitos

- Navegador moderno con JavaScript y soporte de IndexedDB / WebAssembly
- Conexión a internet la primera vez (CDN: SheetJS, sql.js y fuentes de Google)

No hace falta backend ni base de datos en servidor.

## Cómo ejecutarlo

Sirve la carpeta del proyecto con cualquier servidor estático (necesario para algunas APIs del navegador y para cargar el WASM de sql.js con comodidad):

```bash
# Python
python3 -m http.server 8765

# o Node
npx --yes serve -p 8765
```

Abre en el navegador:

```
http://127.0.0.1:8765/
```

También puedes publicar la carpeta en GitHub Pages u otro hosting estático.

## Estructura del proyecto

```
ROLEX-OCHENTERO/
├── index.html                      # UI principal, splash y modales
├── css/
│   └── rolodex.css                 # Estilos (rueda, tabla, overlays)
├── js/
│   ├── app.js                      # Lógica de la aplicación
│   └── sqlite-store.js             # SQLite (sql.js) + IndexedDB
├── img/
│   └── logo.png                    # Logo del splash
├── datos-ejemplo.csv               # CSV de prueba para importar
├── datos-ejemplo-importacion.db    # SQLite de prueba para importar
└── README.md
```

## Datos de ejemplo

| Archivo | Uso |
|---------|-----|
| `datos-ejemplo.csv` | Importar desde el menú (Excel/CSV) |
| `datos-ejemplo-importacion.db` | Importar un `.db` compatible con MDR |

En el menú hamburguesa: arrastra el archivo o selecciónalo. Si ya hay datos, puedes **sobrescribir** o **añadir**.

## Campos de una ficha

| Campo | Descripción |
|-------|-------------|
| `nombre` | Obligatorio |
| `instrumento` | Especialidad |
| `curso` | Nivel / grupo (agrupa la vista tabla) |
| `direccion` | Dirección postal |
| `telefono` | Solo dígitos al editar |
| `email` | Correo (enlace `mailto:` en la ficha) |
| `notas` | Observaciones |
| *(extras)* | Columnas adicionales al importar |

## Atajos

| Acción | Control |
|--------|---------|
| Girar rueda | Rueda del ratón / ↑ ↓ |
| Abrir ficha | Clic en ficha activa / Enter |
| Buscar | Menú → campo de búsqueda |
| Vista tabla / rueda | Botón **TABLA** / **RUEDA** (abajo izquierda) |
| Silenciar | Botón **SONIDO** / **MUTE** (abajo derecha) |

## Tecnologías

- HTML, CSS y JavaScript (vanilla)
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel / CSV
- [sql.js](https://sql.js.org/) — SQLite en WebAssembly
- IndexedDB — guardar la base en el navegador
- Google Fonts — Special Elite, Barlow Condensed, Source Serif 4

## Licencia

Bajo GPL-3.0 license. Uso libre para el proyecto escolar / personal. 
