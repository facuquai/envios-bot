const { parsearEnvio } = require("./parser-envios");
const { enviarEnvioASheet, actualizarCodigo, marcarPago } = require("./sheets-envios");

async function handleCanalEnvios(message) {

  // ── !envio ──────────────────────────────────────────────────────────────────
  if (message.content.startsWith("!envio")) {
    const texto = message.content.replace("!envio", "").trim();

    if (!texto) {
      return message.reply(
        "⚠️ Pegá los datos del cliente después de `!envio`.\n" +
        "Ejemplo: `!envio Juan Pérez, 11-5555-4444, Av. San Martín 1234 piso 3B, Rosario, Santa Fe, CP 2000`"
      );
    }

    const procesando = await message.reply("⏳ Procesando datos del envío...");

    try {
      const envio = await parsearEnvio(texto);
      console.log("EMAIL PARSEADO:", envio.email);
      const resultado = await enviarEnvioASheet(envio);
      const fila = resultado.fila;
      const esDomicilio = envio.tipo_envio === "domicilio";
      const d = envio.domicilio || {};
      const s = envio.sucursal || {};

      // Armar resumen del rótulo
      let direccionLinea = "";
      if (esDomicilio) {
        const partes = [d.calle, d.numero, d.piso_depto, d.entre_calles ? `(entre ${d.entre_calles})` : null, d.barrio].filter(Boolean);
        direccionLinea = partes.join(" ") || "⚠️ No detectada";
      } else {
        direccionLinea = s.nombre_sucursal ? `Suc. ${s.nombre_sucursal}` : "⚠️ No detectada";
      }

      const ciudad    = esDomicilio ? d.ciudad    : s.ciudad;
      const provincia = esDomicilio ? d.provincia : s.provincia;
      const cp        = esDomicilio ? d.cp        : s.cp;

      const campos = [
        `👤 **Destinatario:** ${envio.nombre || "⚠️ No detectado"}`,
        `📱 **Teléfono:** ${envio.telefono || "—"}`,
        `🚚 **Tipo:** ${esDomicilio ? "🏠 Domicilio" : "📮 Sucursal Correo Argentino"}`,
        `📍 **Dirección:** ${direccionLinea}`,
        `🏙️ **Ciudad:** ${ciudad || "⚠️ No detectada"}`,
        `🗺️ **Provincia:** ${provincia || "⚠️ No detectada"}`,
        `🔢 **CP:** ${cp || "⚠️ No detectado"}`,
      ].join("\n");

      const advertencias = envio._faltantes?.length
        ? `\n\n⚠️ **Datos faltantes para el rótulo:** ${envio._faltantes.join(", ")}`
        : "\n\n✅ Datos completos para el rótulo.";

      const instrucciones =
        `\n\n📌 **Comandos para esta fila (${fila}):**\n` +
        `\`!codigo ${fila} <número>\` — Cargar código de seguimiento\n` +
        `\`!pago ${fila} si\` / \`!pago ${fila} no\` — Marcar si el cliente abonó el envío`;

      await procesando.edit(
        `✅ **Envío cargado en Sheet** (fila ${fila})\n\n${campos}${advertencias}${instrucciones}`
      );

    } catch (err) {
      console.error(err);
      await procesando.edit(`❌ Error: ${err.message}`);
    }
    return;
  }

  // ── !codigo ─────────────────────────────────────────────────────────────────
  if (message.content.startsWith("!codigo")) {
    const partes = message.content.split(" ");
    if (partes.length < 3) {
      return message.reply("Uso: `!codigo <fila> <código>`\nEjemplo: `!codigo 5 CX123456789AR`");
    }
    const [, fila, codigo] = partes;
    try {
      await actualizarCodigo(fila, codigo);
      message.reply(
        `✅ Código **${codigo}** cargado en fila ${fila}.\n` +
        `🔗 Tracking: https://www.correoargentino.com.ar/formularios/ondnc?id=${codigo}`
      );
    } catch (err) {
      message.reply(`❌ Error: ${err.message}`);
    }
    return;
  }

  // ── !pago ────────────────────────────────────────────────────────────────────
  if (message.content.startsWith("!pago")) {
    const partes = message.content.split(" ");
    if (partes.length < 3) {
      return message.reply("Uso: `!pago <fila> <si/no>`\nEjemplo: `!pago 5 si`");
    }
    const [, fila, valor] = partes;
    const pagado = valor.toLowerCase() === "si" || valor.toLowerCase() === "sí";
    try {
      await marcarPago(fila, pagado);
      message.reply(
        pagado
          ? `✅ Fila ${fila} marcada como **envío abonado** 💚`
          : `🔴 Fila ${fila} marcada como **envío pendiente de pago**`
      );
    } catch (err) {
      message.reply(`❌ Error: ${err.message}`);
    }
    return;
  }

  // ── !ayuda-envios ────────────────────────────────────────────────────────────
  if (message.content === "!ayuda-envios") {
    message.reply(
      `**📦 Comandos del canal de envíos:**\n\n` +
      `\`!envio <datos>\` — Parsea y carga un envío nuevo al Sheet\n` +
      `\`!codigo <fila> <código>\` — Carga el código de seguimiento de Correo Argentino\n` +
      `\`!pago <fila> si/no\` — Marca si el cliente abonó el envío\n` +
      `\`!ayuda-envios\` — Muestra este mensaje\n\n` +
      `**Ejemplos:**\n` +
      `\`!envio María González, 11-5555-4444, Corrientes 1234 4B, CABA, CP 1043\`\n` +
      `\`!envio Pedro Díaz 3516-223344 sucursal correo argentino Córdoba capital\`\n` +
      `\`!codigo 3 CX123456789AR\`\n` +
      `\`!pago 3 si\``
    );
  }
}

module.exports = { handleCanalEnvios };
