const fetch = require("node-fetch");

const WEBHOOK_URL = process.env.GOOGLE_SHEETS_WEBHOOK;

async function enviarASheet(pedido) {
  const payload = {
    accion: "nuevo_pedido",
    nombre: pedido.nombre || "",
    producto: pedido.producto || "",
    tipo_envio: pedido.tipo_envio || "",
    direccion: pedido.direccion || "",
    monto: pedido.monto || "",
    estado_pago: pedido.estado_pago || "",
    telefono: pedido.telefono || "",
    codigo_seguimiento: "",
    datos_faltantes: pedido._faltantes ? pedido._faltantes.join(", ") : "",
    fecha: new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }),
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al enviar al Sheet: ${response.status}`);
  }

  const data = await response.json();
  return data; // Espera { fila: N } del Apps Script
}

async function actualizarSeguimiento(fila, codigo) {
  const payload = {
    accion: "actualizar_seguimiento",
    fila: parseInt(fila),
    codigo_seguimiento: codigo,
  };

  const response = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Error al actualizar seguimiento: ${response.status}`);
  }

  return await response.json();
}

module.exports = { enviarASheet, actualizarSeguimiento };
