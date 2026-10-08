const http = require('http');
const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// --- TRAMPA DE PUERTO PARA QUE RENDER NO JODA ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eris la viva y lista para el aquelarre Pepo :v');
}).listen(PORT, () => {
  console.log(`trampa d puerto jalando nitido en el puerto ${PORT} :v`);
});

// --- INICIALIZACIÓN DE ERIS ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// --- CONEXIÓN A MONGO DB ---
mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
  .then(() => console.log('🔥 ERIS: Conectado a Mongo nitidazo.'))
  .catch(err => console.error('❌ ERIS: Clave al conectar a Mongo:', err));

// --- BASE DE DATOS ---
const erisUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  diasActivos: { type: Number, default: 0 },
  ultimaActividad: { type: Date },
  canalesDesbloqueados: [{ type: String }]
});

const ErisUser = mongoose.model('UserXP', erisUserSchema);

// --- FUNCIONES MÁGICAS DE COMPATIBILIDAD CON ZEUS ---
function obtenerXpTotal(user) {
  let total = user.xp;
  let lvl = user.level || 1;
  for (let l = 1; l < lvl; l++) {
    total += (l + 1) * 100;
  }
  return total;
}

function recalcularProgreso(user, xpTotal) {
  let lvl = 0;
  let xpRestante = Math.max(0, xpTotal);
  let xpNecesaria = (lvl + 1) * 100;

  while (xpRestante >= xpNecesaria) {
    xpRestante -= xpNecesaria;
    lvl++;
    xpNecesaria = (lvl + 1) * 100;
  }

  user.level = lvl;
  user.xp = xpRestante;
}

// --- EVENTO DE HALLOWEEN: AQUELARRE DE BRUJAS 🧙‍♀️ ---
const POOL_CANDIDATOS_BRUJA = [
  '1173252977042141265',
  '1115394374369542196', // Juan
  '1271910251418124288',
  '1247973559546597376',
  '1176261780810425687',
  '1321857131088914299',
  '1106275286112272538',
  '1473102241694224456',
  '1209004875198316576'
];

// --- LISTA DE STAFF EN LAS SOMBRAS ---
const STAFF_IDS = [
  '1259006426978713620', // Pepo
  '1115394374369542196'  // Juan
];

let BRUJAS_ACTIVAS = [];
let registroAtaquesHoy = {};
let horaInactividadRevisadaHoy = false;
let diasDelEvento = 0;

// LÓGICA DE LA HORCA / VOTACIÓN
let registroVotos = {};
let usuariosQueVotaron = [];
let votacionAbierta = false;
let liquidacionHecha = false;

// VARIABLES GLOBALES DE MALDICIONES ULTRA CAÓTICAS
let comandosBloqueados = false;
let palabraProhibida = null;

function esHoraDeLaBruja() {
  const ahora = new Date();
  const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));
  return horaGT === 18; // 6:00 PM a 6:59 PM GT
}

async function agregarNuevaBruja() {
  const disponibles = POOL_CANDIDATOS_BRUJA.filter(id => !BRUJAS_ACTIVAS.includes(id));
  if (disponibles.length === 0) return;

  const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
  BRUJAS_ACTIVAS.push(elegida);
  console.log(`🧙‍♀️ Nueva bruja seleccionada en secreto: ${elegida}`);

  try {
    const userBruja = await client.users.fetch(elegida);
    await userBruja.send(
      "🧙‍♀️ **SOS LA NUEVA BRUJA DE HALLOWEEN!**\n\n" +
      "Felicitaciones cerote. Todos los días de 6:00 PM a 7:00 PM (Hora GT) tenés **PODERES ILIMITADOS y GRATIS**.\n\n" +
      "⚠️ **REGLAS DE ORO:**\n" +
      "1. Si no tirás ni una sola maldición entre 6 y 7 PM, ERIS te quita el puesto por INACTIVA.\n" +
      "2. Ningún usuario puede ver que sos BRUJA (es 100% secreto). Si hablás, te mandan a la horca.\n\n" +
      "¡Desatá el caos en secreto pisado! 💀 :v"
    );
  } catch (e) {
    console.log(`Clavo mandando MD a la bruja ${elegida}:`, e);
  }
}

function calcularCosto(costoBase, esGratis) {
  return esGratis ? 0 : costoBase;
}

// --- CONFIGURACIÓN DE CANALES OCULTOS DE ERIS ---
const POOL_CANALES_OCULTOS = [
  '1518617880520626880', '1346530408468792736', '1456350408484532416',
  '1447313114328410326', '1445218082122154665', '1412110210176126986',
  '1445443527816896576', '1371180741168969853', '1373302270150762524',
  '1456351873010241834', '1540482635569618184', '1422758605004890841',
  '1336314516970018786', '1367712258721419275', '136007051504386048',
  '1457873606659805698', '1537766097558980684', '1465316615604899841',
  '1456354934963036207', '1538603184272665624', '1388340972825055313',
  '1337067086008571157', '14705016097626644', '145151632227776685'
];

client.once('ready', async () => {
  console.log(`🔥 ERIS resucitada y lista como ${client.user.tag}`);

  // REGISTRAR COMANDOS SLASH
  const commands = [
    new SlashCommandBuilder()
      .setName('maldicion')
      .setDescription('Desata el caos de ERIS sobre un pisado')
      .addStringOption(opt =>
        opt.setName('tipo')
          .setDescription('Elige la maldición')
          .setRequired(true)
          .addChoices(
            { name: '👻 Susto de Ultratumba (1,000 XP)', value: 'susto' },
            { name: '🎭 Apodo Humillante (1,500 XP)', value: 'apodo' },
            { name: '⚔️ Robo de XP (2,000 XP)', value: 'robo' },
            { name: '🤐 Bozal de 1 Hora (2,500 XP)', value: 'silenciar' },
            { name: '🔥 Spam Masivo en MD (3,000 XP)', value: 'spam' },
            { name: '📞 Llamada Terrorífica 5 min (SOLO BRUJAS)', value: 'llamada' },
            { name: '🚫 0 Comandos en Server 15 min (SOLO BRUJAS)', value: 'cero_comandos' },
            { name: '🤫 Lista Negra de Palabra (SOLO BRUJAS)', value: 'lista_negra' },
            { name: '💥 Acabar - Spam Total en Canales 5 min (SOLO BRUJA)', value: 'acabar' }
          )
      )
      .addUserOption(opt => opt.setName('victima').setDescription('La víctima').setRequired(false))
      .addStringOption(opt => opt.setName('nuevo_apodo').setDescription('Nuevo apodo humillante').setRequired(false))
      .addStringOption(opt => opt.setName('palabra').setDescription('Palabra a prohibir').setRequired(false))
      .addStringOption(opt => opt.setName('texto').setDescription('Texto para apocalipsis').setRequired(false)),

    new SlashCommandBuilder()
      .setName('horca')
      .setDescription('Vota para mandar a la horca a un pendejo sospechoso')
      .addUserOption(opt => opt.setName('sospechoso').setDescription('El sospechoso d ser bruja').setRequired(true)),

    new SlashCommandBuilder()
      .setName('pedir_a_eris')
      .setDescription('Comando secreto del Staff Secreto p mover a ERIS')
      .addStringOption(opt =>
        opt.setName('accion')
          .setDescription('Qué querés k haga ERIS')
          .setRequired(true)
          .addChoices(
            { name: '📢 Hablar en un canal', value: 'decir' },
            { name: '👑 Dar/Quitar Rol', value: 'rol' },
            { name: '🎭 Cambiar Apodo', value: 'apodo' },
            { name: '🤫 Mutear Maje', value: 'mutear' },
            { name: '🧹 Borrar Mensajes', value: 'limpiar' }
          )
      )
      .addChannelOption(opt => opt.setName('canal').setDescription('Canal destino').setRequired(false))
      .addStringOption(opt => opt.setName('texto').setDescription('Texto a decir o nuevo apodo').setRequired(false))
      .addUserOption(opt => opt.setName('objetivo').setDescription('Usuario objetivo').setRequired(false))
      .addRoleOption(opt => opt.setName('rol').setDescription('Rol a manipular').setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ ERIS: Comandos listos Pepo.');
  } catch (error) {
    console.error('❌ ERIS: Clavo al subir comandos:', error);
  }

  // Seleccionamos a la primera Bruja si no hay ninguna activa
  if (BRUJAS_ACTIVAS.length === 0) {
    await agregarNuevaBruja();
  }

  // REVISIÓN AUTOMÁTICA (Cada 1 minuto)
  setInterval(async () => {
    const ahora = new Date();
    const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));
    const minutoGT = ahora.getMinutes();
    const mes = ahora.getMonth(); // 9 = Octubre en JS
    const d = ahora.getDate();

    // 1. A las 7:00 PM GT (19 hrs GT)
    if (horaGT === 19 && !horaInactividadRevisadaHoy) {
      horaInactividadRevisadaHoy = true;
      console.log('⏰ 7:00 PM GT: Revisando actividad d las Brujas y estatus...');

      // Revisión d Inactividad d las Brujas
      for (let i = 0; i < BRUJAS_ACTIVAS.length; i++) {
        const brujaId = BRUJAS_ACTIVAS[i];
        if (!registroAtaquesHoy[brujaId] || registroAtaquesHoy[brujaId] === 0) {
          console.log(`🧟‍♀️ Bruja inactiva sacada: ${brujaId}`);
          try {
            const u = await client.users.fetch(brujaId);
            await u.send("💀 **PERDISTE TUS PODERES:** No tiraste ni una sola maldición hoy entre 6 y 7 PM...");
          } catch (e) {}

          // Reemplazar bruja al azar
          const disponibles = POOL_CANDIDATOS_BRUJA.filter(id => !BRUJAS_ACTIVAS.includes(id));
          if (disponibles.length > 0) {
            const nueva = disponibles[Math.floor(Math.random() * disponibles.length)];
            BRUJAS_ACTIVAS[i] = nueva;

            try {
              const uNueva = await client.users.fetch(nueva);
              await uNueva.send("🧙‍♀️ **SOS LA NUEVA BRUJA DE HALLOWEEN!**...");
            } catch (e) {}
          }
        }
      }
      registroAtaquesHoy = {};
    }

    // B) CADA 2 DÍAS SE ABRE / CIERRA LA HORCA
    if (diasDelEvento % 2 === 0 && !votacionAbierta) {
      votacionAbierta = true;
      registroVotos = {};
      usuariosQueVotaron = [];

      client.guilds.cache.forEach(async (guild) => {
        const canal = guild.channels.cache.find(c => c.name === 'general' || c.isTextBased());
        if (canal) await canal.send("⚖️ **SE ABREN LAS VOTACIONES DE LA HORCA!** Usen `/horca` p mandar a un sospechoso a colgar. 💀 :v");
      });
    } else if (votacionAbierta && diasDelEvento % 2 !== 0) {
      // Día 3: Cierre y ejecución
      votacionAbierta = false;
      let acusadoMasVotado = null;
      let maxVotos = 0;

      for (const [id, votos] of Object.entries(registroVotos)) {
        if (votos > maxVotos) {
          maxVotos = votos;
          acusadoMasVotado = id;
        }
      }

      client.guilds.cache.forEach(async (guild) => {
        const canal = guild.channels.cache.find(c => c.name === 'general' || c.isTextBased());

        if (!acusadoMasVotado || maxVotos === 0) {
          if (canal) await canal.send("⚖️ **Nadie votó a ningún pendejo, se salvan todos.** :v");
          return;
        }

        const esBruja = BRUJAS_ACTIVAS.includes(acusadoMasVotado);
        if (esBruja) {
          BRUJAS_ACTIVAS = BRUJAS_ACTIVAS.filter(id => id !== acusadoMasVotado);
          if (canal) await canal.send(`💀 **¡AJA PISADOS!** Este pendejo <@${acusadoMasVotado}> SÍ ERA LA BRUJA! Se fue a la horca y perdió sus poderes 🔥 :v`);
        } else {
          try {
            const member = await guild.members.fetch(acusadoMasVotado);
            if (member) await member.timeout(24 * 60 * 60 * 1000, 'Colgado en la horca');
          } catch (e) {}
          if (canal) await canal.send(`💀 Este pendejillo <@${acusadoMasVotado}> ERA INOCENTE. Se comió 24 horas d silencio por mulitas xd :v`);
        }
      });
    }

    // 2. A Medianoche (00:00 GT)
    if (horaGT === 0 && horaInactividadRevisadaHoy) {
      horaInactividadRevisadaHoy = false;
      diasDelEvento++;
      console.log(`📅 Día ${diasDelEvento} del evento d Halloween.`);

      // Cada 7 días se agrega 1 bruja más (máximo 3)
      if (diasDelEvento % 7 === 0 && BRUJAS_ACTIVAS.length < 3) {
        console.log('🧙‍♀️ Se suma una nueva Bruja al aquelarre!');
        await agregarNuevaBruja();
      }
    }

    // 3. El 31 de Octubre a las 11:59 PM GT: Liquidación Final
    if (mes === 9 && d === 31 && horaGT === 23 && minutoGT === 59 && !liquidacionHecha) {
      liquidacionHecha = true;
      console.log('🎃 31 DE OCTUBRE: Liquidación final del evento d Halloween.');

      client.guilds.cache.forEach(async (guild) => {
        const canal = guild.channels.cache.find(c => c.name === 'general' || c.isTextBased());

        if (BRUJAS_ACTIVAS.length === 0) {
          if (canal) await canal.send("🎃 **¡SE ACABÓ EL EVENTO! LOS CAZADORES GANARON.** Toda la villa recibe +5,000 XP 🔥 :v");
          await ErisUser.updateMany({ guildId: guild.id }, { $inc: { xp: 5000 } });
        } else {
          if (canal) await canal.send("🎃 **¡SE ACABÓ EL EVENTO! LAS BRUJAS SOBREVIVIERON.** Los aldeanos pierden XP y las brujas se quedan con el botín! 💀 :v");

          const todos = await ErisUser.find({ guildId: guild.id });
          for (const u of todos) {
            if (!BRUJAS_ACTIVAS.includes(u.userId)) {
              u.xp = Math.max(0, u.xp - 8000);
              await u.save();
            }
          }

          for (const brujaId of BRUJAS_ACTIVAS) {
            await ErisUser.updateOne({ userId: brujaId, guildId: guild.id }, { $inc: { xp: 15000 } });
          }
        }
      });
    }
  }, 60000);
});

// --- SISTEMA DE DÍAS ACTIVOS, DESBLOQUEO DE CANALES Y LISTA NEGRA ---
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

  // BORRADO POR LISTA NEGRA O LA BRUJA
  if (palabraProhibida && message.content.toLowerCase().includes(palabraProhibida.toLowerCase())) {
    try {
      await message.delete();
      const aviso = await message.channel.send(`⚠️ <@${userId}> dijo la palabra prohibida y su mensaje fue destruido por ERIS :v`);
      setTimeout(() => aviso.delete().catch(() => {}), 5000);
    } catch (e) {}
  }

  try {
    let userData = await ErisUser.findOne({ userId, guildId });
    if (!userData) userData = new ErisUser({ userId, guildId });

    const hoy = new Date();
    const hoyFecha = hoy.toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' });
    const ultimaFecha = userData.ultimaActividad ? new Date(userData.ultimaActividad).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' }) : null;

    if (hoyFecha !== ultimaFecha) {
      userData.diasActivos += 1;
      userData.ultimaActividad = hoy;

      const canalesDisponibles = POOL_CANALES_OCULTOS.filter(id => !userData.canalesDesbloqueados.includes(id));
      if (canalesDisponibles.length > 0) {
        const canalRandomId = canalesDisponibles[Math.floor(Math.random() * canalesDisponibles.length)];
        const canalTarget = message.guild.channels.cache.get(canalRandomId);

        if (canalTarget) {
          await canalTarget.permissionOverwrites.edit(userId, { ViewChannel: true });
          userData.canalesDesbloqueados.push(canalRandomId);
          await message.channel.send(`🔓 **¡NUEVO CANAL DESBLOQUEADO!** <@${userId}> ahora tiene acceso a un canal secreto 🎉 :v`);
        }
      }
    }
    await userData.save();
  } catch (err) {
    console.error('❌ Clavo al procesar actividad:', err);
  }
});

// --- LÓGICA DE COMANDOS SLASH (Maldiciones, Horca y Staff) ---
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // BLOQUEO DE COMANDOS SI LA BRUJA ACTIVÓ 0_COMANDOS
  if (comandosBloqueados && !BRUJAS_ACTIVAS.includes(interaction.user.id) && !STAFF_IDS.includes(interaction.user.id)) {
    return await interaction.reply({ content: '🚫 **0 COMANDOS ACTIVADO:** La Bruja Secreta deshabilitó los comandos. ¡Se me quedan mudos pisados! :v', ephemeral: true });
  }

  // === COMANDO STAFF SECRETOS (/pedir_a_eris) ===
  if (interaction.commandName === 'pedir_a_eris') {
    if (!STAFF_IDS.includes(interaction.user.id)) {
      return await interaction.reply({ content: "🤡 **¿Qué querés vos pisado?** ERIS solo recibe órdenes de los patrones en las sombras.", ephemeral: true });
    }

    const accion = interaction.options.getString('accion');
    const canalDestino = interaction.options.getChannel('canal') || interaction.channel;
    const textoInput = interaction.options.getString('texto');
    const objetivo = interaction.options.getMember('objetivo');
    const rolInput = interaction.options.getRole('rol');

    if (accion === 'decir') {
      if (!textoInput) return await interaction.reply({ content: 'Escribí el texto Pepo.', ephemeral: true });
      await canalDestino.send(textoInput);
      return await interaction.reply({ content: `✅ Mensaje mandado a <#${canalDestino.id}> d una!`, ephemeral: true });
    }

    if (accion === 'rol') {
      if (!objetivo || !rolInput) return await interaction.reply({ content: 'Falta objetivo o rol.', ephemeral: true });
      try {
        if (objetivo.roles.cache.has(rolInput.id)) {
          await objetivo.roles.remove(rolInput);
          return await interaction.reply({ content: `👑 Le quité el rol **${rolInput.name}** a <@${objetivo.id}>.`, ephemeral: true });
        } else {
          await objetivo.roles.add(rolInput);
          return await interaction.reply({ content: `👑 Le di el rol **${rolInput.name}** a <@${objetivo.id}>.`, ephemeral: true });
        }
      } catch (e) {
        return await interaction.reply({ content: '❌ No pude cambiar ese rol.', ephemeral: true });
      }
    }

    if (accion === 'apodo') {
      if (!objetivo || !textoInput) return await interaction.reply({ content: 'Poné objetivo y nuevo apodo.', ephemeral: true });
      try {
        await objetivo.setNickname(textoInput);
        return await interaction.reply({ content: `🎭 Le cambié el apodo a <@${objetivo.id}> por "${textoInput}".`, ephemeral: true });
      } catch (e) {
        return await interaction.reply({ content: '❌ No pude cambiarle el apodo a ese pisado.', ephemeral: true });
      }
    }

    if (accion === 'mutear') {
      if (!objetivo) return await interaction.reply({ content: 'Falta el objetivo.', ephemeral: true });
      try {
        await objetivo.timeout(15 * 60 * 1000, 'Orden del Staff Secreto');
        return await interaction.reply({ content: `🤫 <@${objetivo.id}> fue silenciado 15 min.`, ephemeral: true });
      } catch (e) {
        return await interaction.reply({ content: '❌ No pude mutear a ese cerote.', ephemeral: true });
      }
    }

    if (accion === 'limpiar') {
      try {
        await canalDestino.bulkDelete(10, true);
        return await interaction.reply({ content: `🧹 Borré 10 mensajes en <#${canalDestino.id}>.`, ephemeral: true });
      } catch (e) {
        return await interaction.reply({ content: '❌ No pude borrar mensajes.', ephemeral: true });
      }
    }
  }

  // === COMANDO HORCA ===
  if (interaction.commandName === 'horca') {
    if (!votacionAbierta) return await interaction.reply({ content: '❌ Las votaciones están cerradas ahorita pisado.', ephemeral: true });
    if (usuariosQueVotaron.includes(interaction.user.id)) return await interaction.reply({ content: '❌ Ya votaste una vez pisado, no seas tramposo.', ephemeral: true });

    const victima = interaction.options.getUser('sospechoso');
    if (!victima) return await interaction.reply({ content: 'Tenés k etiquetar al sospechoso.', ephemeral: true });

    registroVotos[victima.id] = (registroVotos[victima.id] || 0) + 1;
    usuariosQueVotaron.push(interaction.user.id);

    return await interaction.reply(`🔥 **${interaction.user.username}** votó por mandar a la horca a <@${victima.id}>. 💀 :v`);
  }

  // === COMANDO MALDICION ===
  if (interaction.commandName === 'maldicion') {
    try {
      await interaction.deferReply();

      const victimaUser = interaction.options.getUser('victima');
      const victimaMember = interaction.options.getMember('victima');
          const tipo = interaction.options.getString('tipo');
    const nuevoApodo = interaction.options.getString('nuevo_apodo');
    const palabraInput = interaction.options.getString('palabra');
    const textoInput = interaction.options.getString('texto');

    const atacanteUser = interaction.user;
    const guildId = interaction.guildId;

    if (!guildId) return await interaction.editReply('Esta mierda solo sirve en servidores.');

    let atacanteData = await ErisUser.findOne({ userId: atacanteUser.id, guildId });
    if (!atacanteData) atacanteData = new ErisUser({ userId: atacanteUser.id, guildId });

    let victimaData = null;
    if (victimaUser) {
      victimaData = await ErisUser.findOne({ userId: victimaUser.id, guildId });
      if (!victimaData) victimaData = new ErisUser({ userId: victimaUser.id, guildId });
    }

    const xpTotalAtacante = obtenerXpTotal(atacanteData);
    const esBruja = BRUJAS_ACTIVAS.includes(atacanteUser.id);
    const estaEnHora = esHoraDeLaBruja();
    const esGratis = esBruja && estaEnHora;

    if (esGratis) {
      registroAtaquesHoy[atacanteUser.id] = (registroAtaquesHoy[atacanteUser.id] || 0) + 1;
    }

    // 1. SUSTO (1,000 XP)
    if (tipo === 'susto') {
      if (!victimaUser) return await interaction.editReply('Seleccioná una víctima.');
      const COSTO = calcularCosto(1000, esGratis);
      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP p tirar un susto.');

      recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
      await atacanteData.save();

      const embed = new EmbedBuilder()
        .setTitle('👻 ¡LA MALDICION DE ERIS CAYÓ SOBRE TI!')
        .setDescription(`<@${victimaUser.id}>, **${atacanteUser.username}** te mandó un susto d ultratumba! 💀`)
        .setColor('#800080');

      return await interaction.editReply({ content: `<@${victimaUser.id}>`, embeds: [embed] });
    }

    // 2. APODO (1,500 XP)
    if (tipo === 'apodo') {
      if (!victimaUser) return await interaction.editReply('Seleccioná una víctima.');
      const COSTO = calcularCosto(1500, esGratis);
      const apodoPuesto = nuevoApodo || "Maje Muldito";

      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP p cambiarle el apodo.');

      try {
        if (!victimaMember) throw new Error('No member');
        await victimaMember.setNickname(apodoPuesto);

        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`🎭 **${atacanteUser.username}** le cambió el apodo a <@${victimaUser.id}> por **"${apodoPuesto}"**. 🤡 :v`);
      } catch (e) {
        return await interaction.editReply('No pude cambiarle el apodo a ese pisado.');
      }
    }

    // 3. ROBO DE XP (2,000 XP)
    if (tipo === 'robo') {
      if (!victimaUser) return await interaction.editReply('Seleccioná una víctima.');
      const COSTO = calcularCosto(2000, esGratis);
      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP p intentar robar.');

      const xpTotalVictima = obtenerXpTotal(victimaData);
      if (xpTotalVictima < 300) return await interaction.editReply('Ese pisado está más pobre k vos, no le podés robar nada.');

      const robado = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
      const realRobo = Math.min(robado, xpTotalVictima);
      const exito = Math.random() < 0.5;

      if (exito) {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO + realRobo);
        recalcularProgreso(victimaData, xpTotalVictima - realRobo);
        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`⚔️ **¡ROBO COMPLETADO!** **${atacanteUser.username}** le robó **${realRobo} XP** a <@${victimaUser.id}> 🔥 :v`);
      } else {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        recalcularProgreso(victimaData, xpTotalVictima + 500);
        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`❌ **¡ROBO FALLIDO!** **${atacanteUser.username}** la cagó y le regaló 500 XP a <@${victimaUser.id}> 🤡 :v`);
      }
    }

    // 4. SILENCIAR (2,500 XP)
    if (tipo === 'silenciar') {
      if (!victimaUser) return await interaction.editReply('Seleccioná una víctima.');
      const COSTO = calcularCosto(2500, esGratis);
      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP p silenciar.');

      try {
        const objetivo = await interaction.guild.members.fetch(victimaUser.id);
        if (!objetivo) throw new Error('No member');

        await objetivo.timeout(60 * 60 * 1000, 'Maldición de ERIS');
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`🤐 **¡BOZAL PUESTO!** **${atacanteUser.username}** muteó a <@${victimaUser.id}> por 1 hora :v`);
      } catch (e) {
        return await interaction.editReply('No pude silenciar a ese cerote.');
      }
    }

    // 5. SPAM EN MD (3,000 XP)
    if (tipo === 'spam') {
      if (!victimaUser) return await interaction.editReply('Seleccioná una víctima.');
      const COSTO = calcularCosto(3000, esGratis);
      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP p el spam.');

      const mensajesTerror = [
        "Soy MG, este es mi server, Soy MG, voy a darte admin...",
        "Heliconta porfavor regresa conmigo esto no me gusta...",
        "Ay dios mio, ay dios mio, toc-toc quien es? soy MG...",
        "Te mando un saludo a: MG, Pepo, Zombie, Red, Juan, Laura..."
      ];

      try {
        await victimaUser.send("👻 **¡LA MALDICION DEL SPAM HA EMPEZADO!**");
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        await interaction.editReply(`🔥 **¡SPAM DESATADO!** **${atacanteUser.username}** le mandó el infierno al MD d <@${victimaUser.id}> :v`);

        const intervalo = 5000;
        const tiempoTotal = 5 * 60 * 1000;

        const spamLoop = setInterval(async () => {
          const fraseAzar = mensajesTerror[Math.floor(Math.random() * mensajesTerror.length)];
          try {
            await victimaUser.send(fraseAzar);
          } catch (err) {
            clearInterval(spamLoop);
          }
        }, intervalo);

        setTimeout(() => {
          clearInterval(spamLoop);
          victimaUser.send("🔴 Se acabaron tus 5 minutos de sufrimiento.").catch(() => {});
        }, tiempoTotal);

      } catch (e) {
        return await interaction.editReply(`❌ El pisado d <@${victimaUser.id}> tiene bloqueados los MDs.`);
      }
    }

    // --- MALDICIONES ULTRA CAÓTICAS EXCLUSIVAS DE BRUJA ---

    // 6. LLAMADA TERRORÍFICA (5 MINUTOS - SOLO BRUJAS)
    if (tipo === 'llamada') {
      if (!esBruja) return await interaction.editReply('❌ **Nee cerote!** Solo las Brujas pueden usar la llamada.');
      if (!victimaUser) return await interaction.editReply('Tenés k seleccionar a la víctima.');

      const COSTO = calcularCosto(4000, esGratis);
      if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP.');

      const victimaMemberVoice = await interaction.guild.members.fetch(victimaUser.id).catch(() => null);
      if (!victimaMemberVoice || !victimaMemberVoice.voice || !victimaMemberVoice.voice.channel) {
        return await interaction.editReply('❌ Ese pisado ni siquiera está en canal d voz.');
      }

      recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
      await atacanteData.save();

              await interaction.editReply(`📞 **¡LLAMADA TERRORÍFICA ACTIVADA!** ERIS ensordeciendo a <@${victimaUser.id}> por 5 minutos 💀 :v`);

        const loopLlamada = setInterval(async () => {
          try {
            if (victimaMemberVoice.voice && victimaMemberVoice.voice.channel) {
              await victimaMemberVoice.voice.setDeaf(true, 'Llamada d ERIS');
              setTimeout(() => victimaMemberVoice.voice.setDeaf(false).catch(() => {}), 2500);
            } else {
              clearInterval(loopLlamada);
            }
          } catch (e) {}
        }, 8000);

        setTimeout(() => { clearInterval(loopLlamada); }, 5 * 60 * 1000);
      }

      // 7. 0 COMANDOS EN EL SERVER (15 MINUTOS - SOLO BRUJAS)
      if (tipo === 'cero_comandos') {
        if (!esBruja) return await interaction.editReply('❌ Solo la Bruja Secreta puede apagar comandos.');

        const COSTO = calcularCosto(5000, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP.');

        comandosBloqueados = true;
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        setTimeout(() => { comandosBloqueados = false; }, 15 * 60 * 1000);

        return await interaction.editReply('🚫 **¡0 COMANDOS EN TODO EL SERVER!** La Bruja Secreta deshabilitó los comandos 15 min 🤡🔥 :v');
      }

      // 8. LISTA NEGRA DE PALABRAS (SOLO BRUJAS)
      if (tipo === 'lista_negra') {
        if (!esBruja) return await interaction.editReply('❌ Solo las Brujas pueden meter palabras a la lista.');
        if (!palabraInput) return await interaction.editReply('Escribí la palabra a prohibir.');

        const COSTO = calcularCosto(4500, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP.');

        palabraProhibida = palabraInput;
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`🤫 **¡PALABRA PROHIBIDA ACTIVADA!** Se prohíbe decir **"${palabraInput}"** en todo el server 💀 :v`);
      }

      // 9. ACABAR (SPAM PERSONALIZADO EN TODOS LOS CANALES POR 5 MINUTOS)
      if (tipo === 'acabar') {
        if (!esBruja) return await interaction.editReply('❌ Solo la Bruja Secreta puede invocar /acabar.');

        const textoCustom = textoInput || "🔥 ¡ERIS HA TOMADO EL CONTROL DE ESTE CANAL!";
        const COSTO = calcularCosto(8000, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Te falta XP.');

        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        await interaction.editReply('💥 **¡DESATANDO EL APOCALIPSIS DE 5 MINUTOS!** ERIS mandando ráfagas en todos lados 💀 :v');

        const canalesTexto = interaction.guild.channels.cache.filter(c => c.isTextBased() && !c.isThread());

        const mandarRafaga = async () => {
          canalesTexto.forEach(async (canal) => {
            try { await canal.send(`📢 **MENSAJE DE LA BRUJA SECRETA:**\n"${textoCustom}"`); } catch (e) {}
          });
        };

        await mandarRafaga();
        const intervaloApocalipsis = setInterval(async () => { await mandarRafaga(); }, 10000);

        setTimeout(() => {
          clearInterval(intervaloApocalipsis);
          canalesTexto.forEach(async (canal) => {
            try { await canal.send("🛑 **Se acabaron los 5 minutos del apocalipsis d la Bruja.** Respiren cerotes :v"); } catch (e) {}
          });
        }, 5 * 60 * 1000);
      }

    } catch (error) {
      console.error('❌ Error en el comando de ERIS:', error);
      if (interaction.deferred) await interaction.editReply('Puchica Pepo, la cagó esta mierda.');
    }
  }
});

// --- INICIAR SESIÓN ---
client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);

      
