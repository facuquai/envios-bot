const fetch = require("node-fetch");

const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK_ENVIOS;

async function enviarEnvioASheet(envio) {
  const esDomicilio = envio.tipo_envio === "domicilio";
  const d = envio.domicilio || {};
  const s = envio.sucursal || {};

  const payload = {
    accion: "nuevo_envio",
    nombre: envio.nombre || "",
    telefono: envio.telefono || "",
    email: envio.email || "",
    tipo_envio: envio.tipo_envio || "",

    // Campos domicilio
    calle: d.calle || "",
    numero: d.numero || "",
    piso_depto: d.piso_depto || "",
    entre_calles: d.entre_calles || "",
    barrio: d.barrio || "",
    ciudad: esDomicilio ? (d.ciudad || "") : (s.ciudad || ""),
    provincia: esDomicilio ? (d.provincia || "") : (s.provincia || ""),
    cp: esDomicilio ? (d.cp || "") : (s.cp || ""),

    // Campo sucursal
    nombre_sucursal: s.nombre_sucursal || "",

    // Control
    datos_faltantes: envio._faltantes ? envio._faltantes.join(", ") : "",
    fecha: new Date().toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Error al enviar al Sheet de envíos: ${response.status}`);
  }

  return await response.json();
}

async function actualizarCodigo(fila, codigo) {
  const payload = {
    accion: "actualizar_codigo",
    fila: parseInt(fila),
    codigo_seguimiento: codigo,
    link_tracking: `https://www.correoargentino.com.ar/formularios/ondnc?id=${codigo}`,
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al actualizar código: ${response.status}`);
  }

  return await response.json();
}

async function marcarPago(fila, pagado) {
  const payload = {
    accion: "marcar_pago",
    fila: parseInt(fila),
    envio_pagado: pagado,
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al marcar pago: ${response.status}`);
  }

  return await response.json();
}

module.exports = { enviarEnvioASheet, actualizarCodigo, marcarPago };
