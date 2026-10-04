const http = require('http');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const mongoose = require('mongoose');

// TRAMPA DE PUERTO PARA QUE RENDER NO JODA
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eris la viva y lista para el aquelarre Pepo .v');
}).listen(PORT, () => {
  console.log(`trampa d puerto jalando nitido en el puerto ${PORT} :v`);
});

// 1. Inicializacion de ERIS
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Conexion a Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🔥 ERIS: Conectado a Mongo nitidez.'))
  .catch(err => console.error('❌ ERIS: Clavo al conectar a Mongo:', err));

// 2. Base de Datos
const erisUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  diasActivos: { type: Number, default: 0 },
  ultimaActividad: { type: Date },
  canalesDesbloqueados: [{ type: String }]
});

const ErisUser = mongoose.model('UserXP', erisUserSchema);

// --- FUNCIONES MAGICAS DE COMPATIBILIDAD CON ZEUS ---
function obtenerXpTotal(user) {
  let total = user.xp;
  let lvl = user.level || 0;
  for (let i = 0; i < lvl; i++) {
    total += (i + 1) * 100;
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

// 3. EVENTO DE HALLOWEEN: AQUELARRE DE BRUJAS 🧙‍♀️
const ROL_BRUJA_ID = "1556126238295203860";

const POOL_CANDIDATOS_BRUJA = [
  "1173252977042141265",
  "1115394374369542196",
  "1271919251418124288",
  "1242973559454699593",
  "1176261789810425987",
  "1321857131988914299",
  "1106275286112272538",
  "1473102241694224456",
  "1290904875198316576"
];

let BRUJAS_ACTIVAS = [];
let registroAtaquesHoy = {};
let horaInactividadRevisadaHoy = false;
let diasDelEvento = 0;

// LOGICA DE LA HORCA / VOTACION
let registroVotos = {};
let usuariosQueVotaron = [];
let votacionAbierta = false;
let liquidacionHecha = false;

function esHoraDeLaBruja() {
  const ahora = new Date();
  const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));
  return horaGT === 18; // 6:00 PM a 6:59 PM
}

async function agregarNuevaBruja() {
  const disponibles = POOL_CANDIDATOS_BRUJA.filter(id => !BRUJAS_ACTIVAS.includes(id));
  if (disponibles.length > 0) {
    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
    BRUJAS_ACTIVAS.push(elegida);
    console.log(`🧙‍♀️ Nueva bruja seleccionada: ${elegida}`);

    client.guilds.cache.forEach(async (guild) => {
      try {
        const member = await guild.members.fetch(elegida);
        if (member) await member.roles.add(ROL_BRUJA_ID);
      } catch (e) {}
    });

    try {
      const userBruja = await client.users.fetch(elegida);
      await userBruja.send(
        "🧙‍♀️ **¡SOS LA NUEVA BRUJA DE HALLOWEEN!**\n\n" +
        "Felicitaciones cerote. Todos los días de 6:00 PM a 7:00 PM (Hora GT) podés usar `/maldicion` GRATIS.\n\n" +
        "⚠️ **REGLAS DE ORO:**\n" +
        "1. Si no tirás ni una sola maldición entre 6 y 7 PM, ERIS te quita el rol x vaga.\n" +
        "2. Si revelás tu identidad en el chat o por privado, te cae bozazaso x mula.\n" +
        "¡Desatá el caos pisado! 💀"
      );
    } catch (e) {
      console.log(`Clavo mandando MD a la bruja ${elegida}:`, e);
    }
  }
}

function calcularCosto(costoBase, esGratis) {
  return esGratis ? 0 : costoBase;
}

// 4. CONFIGURACION DE CANALES OCULTOS DE ERIS
const POOL_CANALES_OCULTOS = [
  "1518617880520626880", "13465304084687927736", "1456350408484532416",
  "1447323114328410326", "1445238082122154045", "1452110210176126986",
  "1445443527982186568", "13731187041169653", "1373302270107586784",
  "1456351873010241737", "1540482635569168384", "1422796615604899841",
  "1336314516970918786", "1367712258721419275", "136007051504386068",
  "1457873606609557698", "1457716609755756898", "1465316615604899841",
  "1456354934693036207", "1538630184272666624", "1388348972825055313",
  "13370670800058671157", "134705041609726464", "145635152277766985"
];

client.once('ready', async () => {
  console.log(`🔥 ERIS resucitada y lista como ${client.user.tag}`);

  // Registrar comandos
  const commands = [
    new SlashCommandBuilder()
      .setName('maldicion')
      .setDescription('Desata el caos de ERIS sobre un pisado')
      .addUserOption(opt => opt.setName('victima').setDescription('El pisado').setRequired(true))
      .addStringOption(opt =>
        opt.setName('tipo')
          .setDescription('Elige la maldicion')
          .setRequired(true)
          .addChoices(
            { name: 'Susto de Ultratumba (1,000 XP)', value: 'susto' },
            { name: 'Apodo Humillante (1,500 XP)', value: 'apodo' },
            { name: 'Robo de XP (2,000 XP)', value: 'robo' },
            { name: 'Bozal de 1 Hora (2,500 XP)', value: 'silenciar' },
            { name: 'Spam Masivo en MD (3,000 XP)', value: 'spam' }
          )
      )
      .addStringOption(opt => opt.setName('nuevo_apodo').setDescription('Si elegiste apodo')),

    new SlashCommandBuilder()
      .setName('horca')
      .setDescription('Vota para mandar a la horca a un pendejo sospechoso')
      .addUserOption(opt => opt.setName('sospechoso').setDescription('El maje k crees k es bruja').setRequired(true))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ ERIS: Comandos listos Pepo.');
  } catch (error) {
    console.error('❌ ERIS: Clavo al subir comandos:', error);
  }

  // Seleccionamos a la primera bruja si no hay ninguna activa
  if (BRUJAS_ACTIVAS.length === 0) {
    await agregarNuevaBruja();
  }

  // REVISION AUTOMATICA (Cada 1 minuto)
  setInterval(async () => {
    const ahora = new Date();
    const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));
    const minutoGT = ahora.getMinutes();
    const mes = ahora.getMonth(); // 9 = Octubre en JS
    const diaMes = ahora.getDate();

    // 1. A las 7:00 PM (19 hrs GT)
    if (horaGT === 19 && !horaInactividadRevisadaHoy) {
      horaInactividadRevisadaHoy = true;
      console.log('🕯️ 7:00 PM GT: Revisando actividad d las Brujas y estado d la Horca...');

      // A) Revision d inactividad d las Brujas
      for (let i = 0; i < BRUJAS_ACTIVAS.length; i++) {
        const brujaId = BRUJAS_ACTIVAS[i];
        if (!registroAtaquesHoy[brujaId] || registroAtaquesHoy[brujaId] === 0) {
          console.log(`💀 Bruja inactiva sacada: ${brujaId}`);

          client.guilds.cache.forEach(async (guild) => {
            try {
              const member = await guild.members.fetch(brujaId);
              if (member) await member.roles.remove(ROL_BRUJA_ID);
            } catch (e) {}
          });

          try {
            const u = await client.users.fetch(brujaId);
            await u.send("🤡 **PERDISTE TUS PODERES:** No tiraste ni una sola maldición de 6 a 7 PM, así k ERIS te quitó el rol d Bruja por mula. :v");
          } catch (e) {}

          // Reemplazar bruja
          const disponibles = POOL_CANDIDATOS_BRUJA.filter(id => !BRUJAS_ACTIVAS.includes(id));
          if (disponibles.length > 0) {
            const nueva = disponibles[Math.floor(Math.random() * disponibles.length)];
            BRUJAS_ACTIVAS[i] = nueva;

            client.guilds.cache.forEach(async (guild) => {
              try {
                const member = await guild.members.fetch(nueva);
                if (member) await member.roles.add(ROL_BRUJA_ID);
              } catch (e) {}
            });

            try {
              const uNueva = await client.users.fetch(nueva);
              await uNueva.send("🧙‍♀️ **¡SOS LA NUEVA BRUJA DE HALLOWEEN!** El cerote anterior no hizo nada d 6 a 7 PM, así k ERIS te dio el poder. Mañana a las 6:00 PM tenés maldiciones gratis. ¡Usalas pisado! 💀");
            } catch (e) {}
          }
        }
      }
      registroAtaquesHoy = {};

      // B) CADA 2 DIAS SE ABRE/CIERRA LA HORCA
      if (diasDelEvento % 2 === 0 && !votacionAbierta) {
        // Se abren votaciones
        votacionAbierta = true;
        registroVotos = {};
        usuariosQueVotaron = [];

        client.guilds.cache.forEach(async (guild) => {
          const canal = guild.channels.cache.find(c => c.name === 'general' || c.isTextBased());
          if (canal) await canal.send("🔥 **¡SE ABREN LAS VOTACIONES DE LA HORCA!** Tienen 2 días p usar `/horca @maje`. El pendejo con más votos al tercer día se va colgado. 💀 :v");
        });

      } else if (votacionAbierta) {
        // Dia 3: Cierre y ejecucion
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
            if (canal) await canal.send("🤡 **Nadie votó x ningún pendejo.** Hoy no se cuelga a nadie x mulas. :v");
            return;
          }

          const esBruja = BRUJAS_ACTIVAS.includes(acusadoMasVotado);

          if (esBruja) {
            // ERA BRUJA
            BRUJAS_ACTIVAS = BRUJAS_ACTIVAS.filter(id => id !== acusadoMasVotado);

            try {
              const member = await guild.members.fetch(acusadoMasVotado);
              if (member) await member.roles.remove(ROL_BRUJA_ID);
            } catch (e) {}

            const brujasRestantes = BRUJAS_ACTIVAS.length;
            if (canal) await canal.send(`💀 **¡AJÁ PISADOS!** Este pendejillo (<@${acusadoMasVotado}>) **SÍ ERA BRUJA**. Quedan **${brujasRestantes}** brujas entre ustedes. 🧙‍♀️🔥`);

          } else {
            // ERA INOCENTE
            try {
              const member = await guild.members.fetch(acusadoMasVotado);
              if (member) {
                await member.timeout(24 * 60 * 60 * 1000, "Colgado en la horca por pendejo");
              }
            } catch (e) {}

            if (canal) await canal.send(`🤡 Este pendejillo (<@${acusadoMasVotado}>) **NO ERA BRUJA**, ahora el pobre pendejo se quedará silenciado 1 día. :v`);
          }
        });
      }
    }

    // 2. A Medianoche (00:00 GT)
    if (horaGT === 0 && horaInactividadRevisadaHoy) {
      horaInactividadRevisadaHoy = false;
      diasDelEvento++;
      console.log(`🌙 Dia ${diasDelEvento} del evento d Halloween.`);

      // Cada 7 dias se agrega 1 bruja mas (maximo 3)
      if (diasDelEvento % 7 === 0 && BRUJAS_ACTIVAS.length < 3) {
        console.log('🧙‍♀️ ¡Se suma una nueva Bruja al aquelarre!');
        await agregarNuevaBruja();
      }
    }

    // 3. El 31 de Octubre a las 11:59 PM GT: Liquidacion Final
    if (mes === 9 && diaMes === 31 && horaGT === 23 && minutoGT === 59 && !liquidacionHecha) {
      liquidacionHecha = true;
      console.log('🎃 31 DE OCTUBRE: Liquidación final del evento de Halloween...');

      client.guilds.cache.forEach(async (guild) => {
        const canal = guild.channels.cache.find(c => c.name === 'general' || c.isTextBased());

        if (BRUJAS_ACTIVAS.length === 0) {
          if (canal) await canal.send("🏆 **¡SE ACABÓ EL EVENTO! LOS CAZADORES GANARON.** Lograron colgar a todas las brujas pisadas. ¡Cada cazador se lleva **+8,000 XP**! 🔥🎃 :v");
          await ErisUser.updateMany({ guildId: guild.id }, { $inc: { xp: 8000 } });
        } else {
          if (canal) await canal.send(`🧙‍♀️ **¡SE ACABÓ EL EVENTO! LAS BRUJAS GANARON.** Quedaron **${BRUJAS_ACTIVAS.length}** brujas vivas sin descubrir. Los cazadores pierden **8,000 XP** x mulas y las brujas sobrevivientes se llevan **+16,000 XP** cada una! 💀🔥 :v`);

          const todos = await ErisUser.find({ guildId: guild.id });
          for (const u of todos) {
            if (!BRUJAS_ACTIVAS.includes(u.userId)) {
              u.xp = Math.max(0, u.xp - 8000);
              await u.save();
            }
          }

          for (const brujaId of BRUJAS_ACTIVAS) {
            await ErisUser.updateOne({ userId: brujaId, guildId: guild.id }, { $inc: { xp: 16000 } });
          }
        }
      });
    }
  }, 60000);
});

// 5. SISTEMA DE DIAS ACTIVOS Y DESBLOQUEO DE CANALES
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

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
          await message.channel.send(`🎉 **${message.author.username}** desbloqueó un canal secreto!`);
        }
      }
      await userData.save();
    }
  } catch (err) {
    console.error('❌ Clavo al procesar actividad:', err);
  }
});

// 6. LOGICA DE COMANDOS SLASH (Maldiciones y Horca)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // --- COMANDO /HORCA ---
  if (interaction.commandName === 'horca') {
    if (!votacionAbierta) {
      return await interaction.reply({ content: "❌ Las votaciones están cerradas cerote. Esperá a que ERIS las abra a las 7:00 PM. :v", ephemeral: true });
    }

    if (usuariosQueVotaron.includes(interaction.user.id)) {
      return await interaction.reply({ content: "❌ Ya votaste una vez pisado, no seas tramposo xd. :v", ephemeral: true });
    }

    const victima = interaction.options.getUser('sospechoso');
    if (!victima) return await interaction.reply({ content: "Tenés k etiquetar a un maje p acusarlo.", ephemeral: true });

    registroVotos[victima.id] = (registroVotos[victima.id] || 0) + 1;
    usuariosQueVotaron.push(interaction.user.id);

    return await interaction.reply(`🔥 **${interaction.user.username}** votó para mandar a la horca a <@${victima.id}>. Total de votos para este maje: **${registroVotos[victima.id]}** 💀 :v`);
  }

  // --- COMANDO /MALDICION ---
  if (interaction.commandName === 'maldicion') {
    try {
      await interaction.deferReply();

      const victimaUser = interaction.options.getUser('victima');
      const victimaMember = interaction.options.getMember('victima');
      const tipo = interaction.options.getString('tipo');
      const nuevoApodo = interaction.options.getString('nuevo_apodo');

      const atacanteUser = interaction.user;
      const guildId = interaction.guildId;

      if (!guildId) return await interaction.editReply('Esta mierda solo funciona en server.');
      if (!victimaUser) return await interaction.editReply('No encontré a la víctima.');
      if (victimaUser.bot) return await interaction.editReply('Nee maje, no podés atacar a un bot.');
      if (victimaUser.id === atacanteUser.id) return await interaction.editReply('No seas mula, no te podés maldecir a vos mismo.');

      let atacanteData = await ErisUser.findOne({ userId: atacanteUser.id, guildId });
      let victimaData = await ErisUser.findOne({ userId: victimaUser.id, guildId });

      if (!atacanteData) atacanteData = new ErisUser({ userId: atacanteUser.id, guildId });
      if (!victimaData) victimaData = new ErisUser({ userId: victimaUser.id, guildId });

      const xpTotalAtacante = obtenerXpTotal(atacanteData);

      const esBruja = BRUJAS_ACTIVAS.includes(atacanteUser.id);
      const estaEnLaHora = esHoraDeLaBruja();
      const esGratis = esBruja && estaEnLaHora;

      if (esGratis) {
        registroAtaquesHoy[atacanteUser.id] = (registroAtaquesHoy[atacanteUser.id] || 0) + 1;
      }

      // 1. SUSTO (1,000 XP)
      if (tipo === 'susto') {
        const COSTO = calcularCosto(1000, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Estás mudo de XP maje. Necesitás más.');

        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        const embed = new EmbedBuilder()
          .setTitle('👻 ¡LA MALDICION DE ERIS CAYO SOBRE TI!')
          .setDescription(`<@${victimaUser.id}>, **${atacanteUser.username}** te mandó un susto del inframundo.`)
          .setColor('#890000');

        return await interaction.editReply({ content: `<@${victimaUser.id}>`, embeds: [embed] });
      }

      // 2. APODO (1,500 XP)
      if (tipo === 'apodo') {
        const COSTO = calcularCosto(1500, esGratis);
        const apodoPuesto = nuevoApodo || "Maje Maldito 🤡";

        if (xpTotalAtacante < COSTO) return await interaction.editReply(`Necesitás **${COSTO} XP** para esta mierda.`);

        try {
          if (!victimaMember) throw new Error('No member');
          await victimaMember.setNickname(apodoPuesto);
          recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
          await atacanteData.save();

          return await interaction.editReply(`🤡 **${atacanteUser.username}** le cambió el apodo a <@${victimaUser.id}> por **"${apodoPuesto}"**! :v`);
        } catch (e) {
          return await interaction.editReply('No pude cambiarle el apodo a ese pendejo.');
        }
      }

      // 3. ROBO DE XP (2,000 XP)
      if (tipo === 'robo') {
        const COSTO = calcularCosto(2000, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Para intentar un robo necesitás más XP.');

        const xpTotalVictima = obtenerXpTotal(victimaData);
        if (xpTotalVictima < 300) return await interaction.editReply('Ese pisado está más pobre k vos, no le podés robar ni mrd.');

        const robado = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
        const realRobo = Math.min(robado, xpTotalVictima);
        const exito = Math.random() < 0.5;

        if (exito) {
          recalcularProgreso(atacanteData, xpTotalAtacante - COSTO + realRobo);
          recalcularProgreso(victimaData, xpTotalVictima - realRobo);
          await atacanteData.save();
          await victimaData.save();

          return await interaction.editReply(`⚔️ **¡ROBO COMPLETADO!** **${atacanteUser.username}** le robó **${realRobo} XP** a <@${victimaUser.id}>. 🔥 :v`);
        } else {
          recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
          recalcularProgreso(victimaData, xpTotalVictima + 500);
          await atacanteData.save();
          await victimaData.save();

          return await interaction.editReply(`❌ **¡ROBO FALLIDO!** **${atacanteUser.username}** la cagó y le regaló 500 XP a <@${victimaUser.id}>. 🤡 :v`);
        }
      }

      // 4. SILENCIAR (2,500 XP)
      if (tipo === 'silenciar') {
        const COSTO = calcularCosto(2500, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Para meterle bozal a un pisado necesitás más XP.');

        try {
          const objetivo = await interaction.guild.members.fetch(victimaUser.id);
          if (!objetivo) throw new Error('No member');

          await objetivo.timeout(60 * 60 * 1000, 'Maldición de ERIS: Silenciado');
          recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
          await atacanteData.save();

          return await interaction.editReply(`🤐 **¡BOZAL PUESTO!** **${atacanteUser.username}** muteó a <@${victimaUser.id}> por 1 hora. :v`);
        } catch (e) {
          return await interaction.editReply('No pude silenciar a ese cerote.');
        }
      }

      // 5. SPAM EN MD (3,000 XP)
      if (tipo === 'spam') {
        const COSTO = calcularCosto(3000, esGratis);
        if (xpTotalAtacante < COSTO) return await interaction.editReply('Para reventarle los MDs a un pisado necesitás más XP.');

        const mensajesTerror = [
          "Soy MG, este es mi server, Soy MG, voy a darte admin, MG, vuelvo en 3 años, MG manten el personaje",
          "Heliconta porfavor regresa conmigo esto no es Spam, neta te extraño, recuerdas cuanto nos haciamos paja grupal a las 12:00 pm? volvamos a hacer porfavor perdoname ya no te vuelvo a pegar",
          "Ay dios mio, ay dios mio, toc-toc quien es? soy MG jiji, MG estoy ocupado, k estas haciendo? no MG no, jiii con la foto de Jane.C maldito pervertido, Zombie, Zombie, no no llames a Zombie, que pasooo, jiii, Pepo que estas haciendo, con la foto de Jane.C maldito Pajero *Foto* MG que estas haciendo? lo voy a subir al Server jiji, no no lo hagas, ya te pingee Pepo, puta madre MG",
          "Te mando un saludo a: MG, Pepo, Zombie, Red, Juan, Lava, tu puta madre"
        ];

        try {
          await victimaUser.send("👻 **¡LA MALDICION DEL SPAM HA EMPEZADO!**");
          recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
          await atacanteData.save();

          await interaction.editReply(`🔥 **¡SPAM DESATADO!** **${atacanteUser.username}** le mandó el infierno al MD d <@${victimaUser.id}>. :v`);

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
            victimaUser.send("🛑 Se acabaron tus 5 minutos de sufrimiento.").catch(() => {});
          }, tiempoTotal);

        } catch (e) {
          return await interaction.editReply(`❌ El pisado de <@${victimaUser.id}> tiene bloqueados los MDs.`);
        }
      }

    } catch (error) {
      console.error('❌ Error en el comando de ERIS:', error);
      if (interaction.deferred) await interaction.editReply('Puchica Pepo, la cagó esta mierda.');
    }
  }
});

client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
