// ============================================================
// FASTLIFE - Sheet de Envíos
// Google Apps Script - Pegar en: Extensions > Apps Script
// ============================================================

const SHEET_NAME = "Envíos";

const COLS = {
  FECHA:              1,
  NOMBRE:             2,
  TELEFONO:           3,
  TIPO_ENVIO:         4,
  // Domicilio
  CALLE:              5,
  NUMERO:             6,
  PISO_DEPTO:         7,
  ENTRE_CALLES:       8,
  BARRIO:             9,
  CIUDAD:             10,
  PROVINCIA:          11,
  CP:                 12,
  // Sucursal
  NOMBRE_SUCURSAL:    13,
  // Logística
  ENVIO_PAGADO:       14,  // Checkbox
  COSTO_ENVIO:        15,  // Lo carga Fede manualmente
  CODIGO_SEGUIMIENTO: 16,
  LINK_TRACKING:      17,
  // Control
  DATOS_FALTANTES:    18,
};

const TOTAL_COLS = 18;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.accion === "nuevo_envio")          return handleNuevoEnvio(data);
    if (data.accion === "actualizar_codigo")    return handleActualizarCodigo(data);
    if (data.accion === "marcar_pago")          return handleMarcarPago(data);

    return respuesta({ ok: false, error: "Acción desconocida" });
  } catch (err) {
    return respuesta({ ok: false, error: err.toString() });
  }
}

function handleNuevoEnvio(data) {
  const sheet = obtenerOCrearSheet();
  const filaActual = sheet.getLastRow() + 1;

  const esDomicilio = data.tipo_envio === "domicilio";

  const valores = [
    data.fecha || new Date().toLocaleString("es-AR"),
    data.nombre || "",
    data.telefono || "",
    esDomicilio ? "🏠 Domicilio" : "📮 Sucursal",
    // Domicilio
    esDomicilio ? (data.calle || "") : "",
    esDomicilio ? (data.numero || "") : "",
    esDomicilio ? (data.piso_depto || "") : "",
    esDomicilio ? (data.entre_calles || "") : "",
    esDomicilio ? (data.barrio || "") : "",
    data.ciudad || "",
    data.provincia || "",
    data.cp || "",
    // Sucursal
    !esDomicilio ? (data.nombre_sucursal || "") : "",
    // Logística
    false,   // Checkbox envio_pagado: empieza en false
    "",      // Costo envío: lo carga Fede
    "",      // Código seguimiento
    "",      // Link tracking
    data.datos_faltantes || "",
  ];

  const rango = sheet.getRange(filaActual, 1, 1, TOTAL_COLS);
  rango.setValues([valores]);

  // Checkbox en columna ENVIO_PAGADO
  sheet.getRange(filaActual, COLS.ENVIO_PAGADO).insertCheckboxes();

  // Color de fila según tipo de envío
  if (esDomicilio) {
    rango.setBackground("#dae8fc"); // azul claro = domicilio
  } else {
    rango.setBackground("#e1d5e7"); // violeta claro = sucursal
  }

  // Resaltar datos faltantes en naranja
  if (data.datos_faltantes) {
    sheet.getRange(filaActual, COLS.DATOS_FALTANTES)
      .setBackground("#f6b26b")
      .setFontWeight("bold");
  }

  // Resaltar celdas vacías importantes
  resaltarVacias(sheet, filaActual, data, esDomicilio);

  return respuesta({ ok: true, fila: filaActual });
}

function handleActualizarCodigo(data) {
  const sheet = obtenerOCrearSheet();
  const fila = parseInt(data.fila);
  if (isNaN(fila) || fila < 2) return respuesta({ ok: false, error: "Fila inválida" });

  sheet.getRange(fila, COLS.CODIGO_SEGUIMIENTO)
    .setValue(data.codigo_seguimiento)
    .setBackground("#cfe2f3")
    .setFontWeight("bold");

  // Link clickeable de tracking
  if (data.link_tracking) {
    sheet.getRange(fila, COLS.LINK_TRACKING)
      .setFormula(`=HYPERLINK("${data.link_tracking}","🔍 Ver tracking")`)
      .setBackground("#cfe2f3");
  }

  return respuesta({ ok: true, fila });
}

function handleMarcarPago(data) {
  const sheet = obtenerOCrearSheet();
  const fila = parseInt(data.fila);
  if (isNaN(fila) || fila < 2) return respuesta({ ok: false, error: "Fila inválida" });

  sheet.getRange(fila, COLS.ENVIO_PAGADO).setValue(data.envio_pagado);

  // Color del checkbox según estado
  sheet.getRange(fila, COLS.ENVIO_PAGADO)
    .setBackground(data.envio_pagado ? "#b7e1cd" : "#f4cccc");

  return respuesta({ ok: true, fila });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function obtenerOCrearSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    agregarEncabezados(sheet);
  } else if (sheet.getLastRow() === 0) {
    agregarEncabezados(sheet);
  }
  return sheet;
}

function agregarEncabezados(sheet) {
  const headers = [
    "📅 Fecha",
    "👤 Destinatario",
    "📱 Teléfono",
    "🚚 Tipo Envío",
    "🛣️ Calle",
    "🔢 Número",
    "🏢 Piso/Depto",
    "↔️ Entre calles",
    "🏘️ Barrio",
    "🏙️ Ciudad",
    "🗺️ Provincia",
    "📮 CP",
    "📬 Sucursal",
    "💳 Envío Pagado",
    "💰 Costo Envío",
    "🔎 Código Seguimiento",
    "🔗 Link Tracking",
    "⚠️ Datos Faltantes",
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1a1a2e");
  headerRange.setFontColor("#ffffff");
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);

  // Anchos
  const anchos = [150, 170, 130, 110, 160, 80, 90, 150, 120, 150, 130, 70, 180, 110, 110, 160, 120, 200];
  anchos.forEach((ancho, i) => sheet.setColumnWidth(i + 1, ancho));

  // Checkbox en el encabezado de "Envío Pagado" para referencia visual
  sheet.getRange(1, COLS.ENVIO_PAGADO).setNote("TRUE = pagado, FALSE = pendiente");
}

function resaltarVacias(sheet, fila, data, esDomicilio) {
  const camposCriticos = esDomicilio
    ? [
        { col: COLS.NOMBRE,   val: data.nombre },
        { col: COLS.CALLE,    val: data.calle },
        { col: COLS.NUMERO,   val: data.numero },
        { col: COLS.CIUDAD,   val: data.ciudad },
        { col: COLS.PROVINCIA,val: data.provincia },
        { col: COLS.CP,       val: data.cp },
      ]
    : [
        { col: COLS.NOMBRE,          val: data.nombre },
        { col: COLS.CIUDAD,          val: data.ciudad },
        { col: COLS.PROVINCIA,       val: data.provincia },
        { col: COLS.NOMBRE_SUCURSAL, val: data.nombre_sucursal },
      ];

  camposCriticos.forEach(({ col, val }) => {
    if (!val) {
      sheet.getRange(fila, col).setBackground("#efefef").setValue("—");
    }
  });
}

function respuesta(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Test manual ───────────────────────────────────────────────────────────────
function testDomicilio() {
  const e = {
    postData: {
      contents: JSON.stringify({
        accion: "nuevo_envio",
        nombre: "María González",
        telefono: "11-5555-4444",
        tipo_envio: "domicilio",
        calle: "Av. Corrientes",
        numero: "1234",
        piso_depto: "4B",
        entre_calles: "",
        barrio: "",
        ciudad: "CABA",
        provincia: "Buenos Aires",
        cp: "1043",
        nombre_sucursal: "",
        datos_faltantes: "",
        fecha: new Date().toLocaleString("es-AR"),
      }),
    },
  };
  Logger.log(doPost(e).getContent());
}

function testSucursal() {
  const e = {
    postData: {
      contents: JSON.stringify({
        accion: "nuevo_envio",
        nombre: "Pedro Díaz",
        telefono: "351-6223344",
        tipo_envio: "sucursal",
        calle: "", numero: "", piso_depto: "", entre_calles: "", barrio: "",
        ciudad: "Córdoba",
        provincia: "Córdoba",
        cp: "5000",
        nombre_sucursal: "Correo Argentino Córdoba Centro",
        datos_faltantes: "",
        fecha: new Date().toLocaleString("es-AR"),
      }),
    },
  };
  Logger.log(doPost(e).getContent());
}
