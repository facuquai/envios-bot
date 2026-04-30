const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parsePedido(textoLibre) {
  const prompt = `Sos un asistente que extrae datos de pedidos de ropa de mensajes de clientes argentinos.

Dado el siguiente mensaje de un cliente, extraé los datos y devolvé SOLO un JSON válido, sin texto extra, sin markdown, sin explicaciones.

Mensaje del cliente:
"""
${textoLibre}
"""

Devolvé exactamente este JSON (con los campos que puedas detectar, y null para los que no estén):
{
  "nombre": "nombre completo del cliente o null",
  "producto": "descripción del producto (remera, talle, color, cantidad, etc.) o null",
  "tipo_envio": "domicilio" o "sucursal" o null,
  "direccion": "dirección completa o nombre de sucursal/correo o null",
  "monto": "monto en pesos como string (ej: '$15000') o null",
  "estado_pago": "pagado" o "pendiente" o null,
  "telefono": "número de teléfono o null",
  "_faltantes": ["lista de campos que NO se pudieron detectar, solo los importantes: nombre, producto, tipo_envio, monto, estado_pago"]
}

Reglas:
- Si menciona "transferencia", "pagué", "abonado", "ya pagué" → estado_pago = "pagado"
- Si menciona "te pago", "voy a pagar", "cuando llegue", sin mención de pago → estado_pago = "pendiente"
- Si menciona "domicilio", "a casa", "me lo mandás a" + dirección → tipo_envio = "domicilio"
- Si menciona "sucursal", "Correo Argentino", "OCA", "Andreani", "retiro" → tipo_envio = "sucursal"
- El campo _faltantes solo incluí: nombre, producto, tipo_envio, monto, estado_pago (NO incluyas telefono ni direccion en faltantes)
- Si no hay ningún dato → devolvé todo null y _faltantes con todos los campos importantes`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const texto = response.text.trim();

  // Limpiar posibles backticks si el modelo los pone igual
  const limpio = texto.replace(/```json|```/g, "").trim();

  const pedido = JSON.parse(limpio);
  return pedido;
}

module.exports = { parsePedido };
