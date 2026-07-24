# MDR — MacroData Rhythm

<p align="center">
<img width="1024" height="559" alt="logo" src="https://github.com/user-attachments/assets/2697f2c3-6b06-482d-932e-2f32005d374d" />
</p>

Fichero digital estilo **Rolodex** para gestionar alumnos de una escuela de música. Interfaz retro cassette-punk / Lumon: rueda 3D de fichas, clasificador por cursos, edición tipo máquina de escribir, importación/exportación y persistencia local con SQLite en el navegador.

Repositorio: [github.com/entreunosyceros/MDR](https://github.com/entreunosyceros/MDR)

## Características

<img width="1916" height="930" alt="Peek 2026-07-24 15-58" src="https://github.com/user-attachments/assets/c8bd9c0f-d24d-44ef-831d-9bce0f2dbdb2" />

### Rueda 3D
- Navegación con rueda del ratón, flechas ↑↓ o **arrastre vertical** (arriba/abajo)
- Clic (o Enter) solo en la **ficha central** para abrirla
- El enlace de email solo es clicable en la ficha del centro
- Sonido de giro tipo cartulina/plástico (silenciable)
- Orden A→Z / Z→A de la rueda desde el escenario

### Vista clasificador (tabla)
- Cajones por curso con estética de archivador / terminal
- Fichas compactas (nombre, instrumento, teléfono) con **grip** de arrastre
- Arrastrar y soltar entre cajones; el destino se ilumina en cian
- Orden A→Z / Z→A independiente en cada curso

### Ficha abierta
- Se abre como la **misma tarjeta en zoom** (papel rayado, muesca metálica, backdrop con blur)
- Vista de lectura en 2 columnas; edición con cajetines de máquina de escribir
- Badge **MODO EDICIÓN** en rojo neón
- Curso con desplegable (1º–4º Grado + cursos ya existentes)
- Campos personalizados: **añadir / quitar** solo en esa ficha
- Acciones al pie: Editar, Imprimir, Eliminar (teclas/sellos)
- Impresión de la ficha sin la muesca de plástico ni la barra de botones

### Datos e importación
- Alta, edición y borrado de fichas
- Teléfono solo numérico al crear o editar
- Importación SQLite (`.db`), Excel (`.xlsx` / `.xls`) y CSV, con mapeo de columnas
- Al añadir a una base existente: si hay **nombre duplicado**, elegir sobrescribir, omitir o crear con otro nombre
- Exportación de la base SQLite (`.db`)
- Persistencia en el navegador (sql.js + IndexedDB)

### Interfaz
- Splash de arranque, favicon del logo MDR
- Menú lateral: búsqueda, nueva ficha, importar / exportar
- Enlace al repositorio en el pie de página

## Requisitos

- Navegador moderno con JavaScript y soporte de IndexedDB / WebAssembly
- Conexión a internet la primera vez (CDN: SheetJS, sql.js y fuentes de Google)

No hace falta backend ni base de datos en servidor.

## Cómo ejecutarlo

Sirve la carpeta del proyecto con cualquier servidor estático (necesario para algunas APIs del navegador y para cargar el WASM de sql.js):

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

También puedes publicar la carpeta en [GitHub Pages](https://pages.github.com/) u otro hosting estático.

## Estructura del proyecto

```
MDR/
├── index.html                      # UI principal, splash y modales
├── css/
│   └── rolodex.css                 # Estilos (rueda, clasificador, ficha, overlays)
├── js/
│   ├── app.js                      # Lógica de la aplicación
│   └── sqlite-store.js             # SQLite (sql.js) + IndexedDB
├── img/
│   └── logo.png                    # Logo / favicon / splash
├── datos-ejemplo.csv               # CSV de prueba para importar
├── datos-ejemplo-importacion.db    # SQLite de prueba para importar
├── LICENSE                         # GPL-3.0
└── README.md
```

## Datos de ejemplo

| Archivo | Uso |
|---------|-----|
| `datos-ejemplo.csv` | Importar desde el menú (Excel/CSV) |
| `datos-ejemplo-importacion.db` | Importar un `.db` compatible con MDR |

En el menú hamburguesa: arrastra el archivo o selecciónalo. Si ya hay datos, puedes **sobrescribir** o **añadir**. Al añadir, si un nombre ya existe se pregunta si **sobrescribir**, **omitir** o **crear** con otro nombre.

## Campos de una ficha

<img width="1916" height="930" alt="Peek 2026-07-24 16-02" src="https://github.com/user-attachments/assets/94648f8b-8471-46dd-a93f-163861166ec6" />

| Campo | Descripción |
|-------|-------------|
| `nombre` | Obligatorio (clave para detectar duplicados al importar) |
| `instrumento` | Especialidad |
| `curso` | Nivel / grupo (cajones del clasificador; desplegable al editar) |
| `direccion` | Dirección postal |
| `telefono` | Solo dígitos al editar |
| `email` | Correo (`mailto:` en rueda y ficha abierta) |
| `notas` | Observaciones |
| *(extras)* | Campos personalizados por ficha (añadir/quitar al editar) |

## Atajos

| Acción | Control |
|--------|---------|
| Girar rueda | Rueda del ratón / ↑ ↓ / arrastre vertical |
| Abrir ficha | Clic en ficha central / Enter |
| Cerrar modal | Esc (o × en la ficha) |
| Buscar | Menú → campo de búsqueda |
| Vista clasificador / rueda | Botón **TABLA** / **RUEDA** (abajo izquierda) |
| Silenciar | Botón **SONIDO** / **MUTE** (abajo derecha) |
| Imprimir ficha | En la ficha abierta → **Imprimir** |
| Repositorio | Enlace **GitHub** en el pie |

## Tecnologías

- HTML, CSS y JavaScript (vanilla)
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel / CSV
- [sql.js](https://sql.js.org/) — SQLite en WebAssembly
- IndexedDB — guardar la base en el navegador
- Google Fonts — Special Elite, Barlow Condensed, Source Serif 4

## Licencia

Bajo [GPL-3.0](LICENSE). Uso libre para el proyecto escolar / personal.
