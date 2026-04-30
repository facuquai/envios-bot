const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function parsearEnvio(textoLibre) {
  const prompt = `Sos un asistente que extrae datos de envíos de paquetes en Argentina para generar rótulos de Correo Argentino.

Dado el siguiente mensaje, extraé los datos y devolvé SOLO un JSON válido, sin texto extra, sin markdown, sin backticks.

Mensaje:
"""
${textoLibre}
"""

Devolvé exactamente este JSON:
{
  "nombre": "nombre completo del destinatario o null",
  "telefono": "número de teléfono o null",
  "tipo_envio": "domicilio" o "sucursal" o null,

  "domicilio": {
    "calle": "nombre de la calle o null",
    "numero": "número de puerta o null",
    "piso_depto": "piso y/o departamento o null",
    "entre_calles": "entre calles si las mencionan o null",
    "barrio": "barrio o localidad o null",
    "ciudad": "ciudad o localidad principal o null",
    "provincia": "provincia completa (ej: 'Buenos Aires', 'Córdoba', 'Santa Fe') o null",
    "cp": "código postal de 4 dígitos o null"
  },

  "sucursal": {
    "nombre_sucursal": "nombre o número de sucursal de Correo Argentino o null",
    "ciudad": "ciudad de la sucursal o null",
    "provincia": "provincia completa o null",
    "cp": "código postal o null"
  },

  "_faltantes": ["lista de campos críticos que faltan para el rótulo"]
}

Reglas:
- Si menciona "a domicilio", "me lo mandás a casa", una dirección con calle y número → tipo_envio = "domicilio", completar objeto "domicilio"
- Si menciona "sucursal", "retiro en correo", "correo argentino de [ciudad]" → tipo_envio = "sucursal", completar objeto "sucursal"
- El objeto que NO aplique dejarlo con todos sus campos en null
- Para _faltantes incluir solo los campos críticos para el rótulo según el tipo de envío:
  - Domicilio: nombre, calle, numero, ciudad, provincia, cp
  - Sucursal: nombre, ciudad, provincia
- Provincia: normalizarla siempre al nombre completo oficial (ej: "Bs As" → "Buenos Aires", "Cba" → "Córdoba", "Ctes" → "Corrientes")
- CP: si no está en el mensaje pero se puede inferir por la ciudad conocida, intentar deducirlo e indicar "(estimado)" al final
- Si el tipo de envío no está claro pero hay una dirección con calle → asumir domicilio
- Si solo menciona una ciudad sin calle → asumir sucursal`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const texto = response.text.trim();
  const limpio = texto.replace(/```json|```/g, "").trim();
  const envio = JSON.parse(limpio);
  return envio;
}

module.exports = { parsearEnvio };
