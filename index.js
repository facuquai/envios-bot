require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");
const { parsePedido } = require("./parser");
const { enviarASheet, actualizarSeguimiento } = require("./sheets");
const { handleCanalEnvios } = require("./handler-envios");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Canales
const CANAL_PEDIDOS = process.env.CANAL_PEDIDOS_ID;
const CANAL_ENVIOS  = process.env.CANAL_ENVIOS_ID;

client.once(Events.ClientReady, () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  console.log(`📦 Canal pedidos : ${CANAL_PEDIDOS}`);
  console.log(`🚚 Canal envíos  : ${CANAL_ENVIOS}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  // ── CANAL DE ENVÍOS ────────────────────────────────────────────────────────
  if (message.channelId === CANAL_ENVIOS) {
    return handleCanalEnvios(message);
  }

  // ── CANAL DE PEDIDOS ───────────────────────────────────────────────────────
  if (message.channelId !== CANAL_PEDIDOS) return;

  // !pedido
  if (message.content.startsWith("!pedido")) {
    const texto = message.content.replace("!pedido", "").trim();

    if (!texto) {
      return message.reply(
        "⚠️ Mandá el texto del cliente después de `!pedido`.\n" +
        "Ejemplo: `!pedido Hola soy Juan, quiero la remera M, pago con transferencia, envío a Correo Argentino sucursal Palermo`"
      );
    }

    const procesando = await message.reply("⏳ Procesando pedido...");

    try {
      const pedido = await parsePedido(texto);
      const resultado = await enviarASheet(pedido);

      const campos = [
        `👤 **Cliente:** ${pedido.nombre || "⚠️ No detectado"}`,
        `📦 **Producto:** ${pedido.producto || "⚠️ No detectado"}`,
        `🚚 **Tipo envío:** ${pedido.tipo_envio || "⚠️ No detectado"}`,
        `📍 **Dirección/Sucursal:** ${pedido.direccion || "—"}`,
        `💰 **Monto:** ${pedido.monto || "⚠️ No detectado"}`,
        `💳 **Pago:** ${pedido.estado_pago || "⚠️ No detectado"}`,
        `📱 **Teléfono:** ${pedido.telefono || "—"}`,
        `🔢 **Código seguimiento:** —`,
      ].join("\n");

      const advertencias =
        pedido._faltantes?.length
          ? `\n\n⚠️ **Datos faltantes:** ${pedido._faltantes.join(", ")} — cargado igual en el Sheet.`
          : "";

      await procesando.edit(
        `✅ **Pedido cargado en Sheet** (fila ${resultado.fila})\n\n${campos}${advertencias}`
      );
    } catch (err) {
      console.error(err);
      await procesando.edit(`❌ Error al procesar: ${err.message}\nRevisá los logs.`);
    }
    return;
  }

  // !seguimiento
  if (message.content.startsWith("!seguimiento")) {
    const partes = message.content.split(" ");
    if (partes.length < 3) {
      return message.reply(
        "Uso: `!seguimiento <número_de_fila> <código>`\nEjemplo: `!seguimiento 5 CX123456789AR`"
      );
    }
    const [, fila, codigo] = partes;
    try {
      await actualizarSeguimiento(fila, codigo);
      await message.reply(`✅ Código de seguimiento **${codigo}** cargado en fila ${fila}.`);
    } catch (err) {
      await message.reply(`❌ Error: ${err.message}`);
    }
    return;
  }

  // !ayuda
  if (message.content === "!ayuda") {
    message.reply(
      `**📦 Comandos disponibles (canal pedidos):**\n\n` +
      `\`!pedido <texto>\` — Parsea y carga un pedido nuevo\n` +
      `\`!seguimiento <fila> <código>\` — Agrega código de seguimiento\n` +
      `\`!ayuda\` — Muestra este mensaje\n\n` +
      `**Ejemplo:**\n` +
      `\`!pedido Soy María González, quiero 2 remeras talle L color negro, envío a domicilio en Av. Corrientes 1234 CABA, pagué con transferencia, mi celu es 11-5555-4444\``
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
