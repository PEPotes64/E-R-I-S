const http = require('http');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder
} = require('discord.js');
const mongoose = require('mongoose');

// --- TRAMPA DE PUERTO PARA QUE RENDER NO JODA ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eris ta viva y lista para el aquelarre Pepo :v');
}).listen(PORT, () => {
  console.log(`trampa de puerto jalando nitido en el puerto ${PORT} :v`);
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
  let total = user.xp || 0;
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

// Verifica si estamos en "La Hora de la Bruja" (6:00 PM a 6:59 PM Guatemala)
function esHoraDeLaBruja() {
  const ahora = new Date();
  const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));
  return horaGT === 18;
}

// Funcion para nombrar a una nueva Bruja por MD y ponerle el Rol
async function agregarNuevaBruja() {
  const disponibles = POOL_CANDIDATOS_BRUJA.filter(id => !BRUJAS_ACTIVAS.includes(id));
  if (disponibles.length > 0) {
    const elegida = disponibles[Math.floor(Math.random() * disponibles.length)];
    BRUJAS_ACTIVAS.push(elegida);
    console.log(`🧙‍♀️ Nueva bruja seleccionada: ${elegida}`);

    // Ponerle el rol d Bruja en el server
    client.guilds.cache.forEach(async (guild) => {
      try {
        const member = await guild.members.fetch(elegida);
        if (member) await member.roles.add(ROL_BRUJA_ID);
      } catch (e) {}
    });

    try {
      const userBruja = await client.users.fetch(elegida);
      await userBruja.send(
        "🧙‍♀️ **¡SOS LA NUEVA BRUJA DE HALLOWEEN!**\n" +
        "Felicitaciones cerote. Todos los días de **6:00 PM a 7:00 PM (Hora GT)** tenés `/maldicion` **TOTALMENTE GRATIS (0 XP)**.\n\n" +
        "⚠️ **REGLAS DE ORO:**\n" +
        "1. Si no tirás ni una sola maldición entre 6 y 7 PM, ERIS te quita los poderes por mula.\n" +
        "2. Si revelás tu identidad en el chat o por privado, te cae bozal inmediato y quedás descalificado(a).\n" +
        "¡Desatá el caos pisado! 💀"
      );
    } catch (e) {
      console.log(`Clavo mandando MD a la bruja ${elegida}:`, e);
    }
  }
}

// 4. CONFIGURACION DE CANALES OCULTOS DE ERIS
const POOL_CANALES_OCULTOS = [
  "1538617880520626880", "1346670096789278730", "1456350408484532416",
  "1447323114328410326", "1445238082122154045", "1452110210176126986",
  "1445443527982186568", "137311870411169653", "1373302270107586784",
  "1456351873010241737", "1540482635569168384", "1422796615604899841",
  "1336314516970918786", "1336712258721419275", "136007051504386068",
  "14578736606855631438", "1456716600975575698", "1456354566055657523",
  "1456354934693036207", "1538630184272666624", "1388348972825055313",
  "13370670800058671157", "134706041409726464", "145635157277766985"
];

client.once('ready', async () => {
  console.log(`🔥 ERIS resucitada y lista como ${client.user.tag}`);

  // Bloqueo automatico de canales
  for (const canalId of POOL_CANALES_OCULTOS) {
    try {
      const canal = await client.channels.fetch(canalId);
      if (canal) {
        await canal.permissionOverwrites.edit(canal.guild.id, { ViewChannel: false });
      }
    } catch (e) {}
  }

  // Registrar comandos
  const commands = [
    new SlashCommandBuilder()
      .setName('maldicion')
      .setDescription('Desata el caos de ERIS sobre un pisado')
      .addUserOption(opt => opt.setName('victima').setDescription('El pisado que va a sufrir').setRequired(true))
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
      .addStringOption(opt => opt.setName('nuevo_apodo').setDescription('Solo para la maldicion de apodo').setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ ERIS: Comandos listos Pepo.');
  } catch (error) {
    console.error('❌ ERIS: Clavo al subir comandos:', error);
  }

  // Seleccionamos a la primera bruja si no hay ninguna activa
// REVISION AUTOMATICA (Cada 1 minuto)
setInterval(async () => {
  const ahora = new Date();
  const horaGT = parseInt(ahora.toLocaleTimeString('en-US', { timeZone: 'America/Guatemala', hour12: false, hour: '2-digit' }));

  // 1. A las 7:00 PM (19 hrs GT) revisamos inactividad
  if (horaGT === 19 && !horaInactividadRevisadaHoy) {
    horaInactividadRevisadaHoy = true;
    console.log('🕯️ 7:00 PM GT: Revisando actividad d las Brujas...');

    for (let i = 0; i < BRUJAS_ACTIVAS.length; i++) {
      const brujaId = BRUJAS_ACTIVAS[i];
      if (!registroAtaquesHoy[brujaId] || registroAtaquesHoy[brujaId] === 0) {
        console.log(`💀 Bruja inactiva sacada: ${brujaId}`);

        // Quitarle el rol d Bruja
        client.guilds.cache.forEach(async (guild) => {
          try {
            const member = await guild.members.fetch(brujaId);
            if (member) await member.roles.remove(ROL_BRUJA_ID);
          } catch (e) {}
        });

        try {
          const u = await client.users.fetch(brujaId);
          await u.send("🤡 **PERDISTE TUS PODERES:** No tiraste ni una sola maldición d 6 a 7 PM, así k ERIS te quitó el rol d Bruja por mula. :v");
        } catch (e) {}

        // Reemplazar bruja vaga
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
            await uNueva.send("🧙‍♀️ **¡SOS LA NUEVA BRUJA DE HALLOWEEN!** El cerote anterior no hizo nada d 6 a 7 PM, asi k ERIS te dio el poder. Mañana a las 6:00 PM tenés maldiciones gratis. ¡Usalas pisado! 💀");
          } catch (e) {}
        }
      }
    }
    registroAtaquesHoy = {};
  }

  // 2. A Medianoche (00:00 GT) sumamos 1 dia y agregamos bruja si pasaron 7 dias
  if (horaGT === 0 && horaInactividadRevisadaHoy) {
    horaInactividadRevisadaHoy = false; // Reset p el dia siguiente
    diasDelEvento++;
    console.log(`🌙 Dia ${diasDelEvento} del evento d Halloween.`);

    // Cada 7 dias agregamos 1 bruja mas (maximo 3)
    if (diasDelEvento % 7 === 0 && BRUJAS_ACTIVAS.length < 3) {
      console.log('🧙‍♀️ ¡Se suma una nueva Bruja al aquelarre!');
      await agregarNuevaBruja();
    }
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
    const ultimaFecha = userData.ultimaActividad
      ? new Date(userData.ultimaActividad).toLocaleDateString('es-GT', { timeZone: 'America/Guatemala' })
      : null;

    if (hoyFecha !== ultimaFecha) {
      userData.diasActivos += 1;
      userData.ultimaActividad = hoy;

      const canalesDisponibles = POOL_CANALES_OCULTOS.filter(id => !userData.canalesDesbloqueados.includes(id));

      if (canalesDisponibles.length > 0) {
        const canalRandomId = canalesDisponibles[Math.floor(Math.random() * canalesDisponibles.length)];
        const canalTarget = message.guild.channels.cache.get(canalRandomId);

        if (canalTarget) {
          await canalTarget.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
          userData.canalesDesbloqueados.push(canalRandomId);
          await message.channel.send(`🎉 **${message.author.username}** cumplió **${userData.diasActivos} día(s)** activo(s)! ERIS te desbloqueó un canal secreto.`);
        }
      }
      await userData.save();
    }
  } catch (err) {
    console.error('❌ Clavo al procesar actividad:', err);
  }
});

// 6. LOGICA DE LAS MALDICIONES
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'maldicion') return;

  try {
    await interaction.deferReply();

    const victimaUser = interaction.options.getUser('victima');
    const victimaMember = interaction.options.getMember('victima');
    const tipo = interaction.options.getString('tipo');
    const nuevoApodo = interaction.options.getString('nuevo_apodo');

    const atacanteUser = interaction.user;
    const guildId = interaction.guildId;

    if (!guildId) return await interaction.editReply('Esta mierda solo funciona dentro del servidor Pepo :v');
    if (!victimaUser) return await interaction.editReply('No encontre a ese pisado :v');
    if (victimaUser.bot) return await interaction.editReply('Nee maje, no podes maldecir bots :v');
    if (victimaUser.id === atacanteUser.id) return await interaction.editReply('¿Te vas a maldecir vos solo? No seas mula :v');

    let atacanteData = await ErisUser.findOne({ userId: atacanteUser.id, guildId });
    let victimaData = await ErisUser.findOne({ userId: victimaUser.id, guildId });

    if (!atacanteData) atacanteData = new ErisUser({ userId: atacanteUser.id, guildId });
    if (!victimaData) victimaData = new ErisUser({ userId: victimaUser.id, guildId });

    const xpTotalAtacante = obtenerXpTotal(atacanteData);

    // --- REVISAMOS SI ES BRUJA Y ESTA EN SU HORA DE GLORIA ---
    const esBruja = BRUJAS_ACTIVAS.includes(atacanteUser.id);
    const estaEnLaHora = esHoraDeLaBruja();
    const esGratis = esBruja && estaEnLaHora;

    if (esGratis) {
      registroAtaquesHoy[atacanteUser.id] = (registroAtaquesHoy[atacanteUser.id] || 0) + 1;
    }

    function calcularCosto(costoBase) {
      return esGratis ? 0 : costoBase;
    }

    // --- 1. SUSTO (1,000 XP) ---
    if (tipo === 'susto') {
      const COSTO = calcularCosto(1000);
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Estás mudo de XP maje. Necesitás **${COSTO} XP** y solo tenés **${xpTotalAtacante} XP**.`);
      }

      const gifs = [
        'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyNHdzMDFtdnUzcWJwcmpvODVpMnFheGIzbHNnMzh5NXpwZjZ5dDUxNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/T39By0uZSaAjSYaF9B/giphy.gif',
        'https://media3.giphy.com/media/v1.Y2lkPTZjMDliOTUyMnFtMzJ2YWl1M2t1b2FwczFtOHFtd2w0enQyaGF4bzZoOGV0aWVqZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cYqhkF6jUFXvHfnOt4/giphy.gif',
        'https://media1.giphy.com/media/v1.Y2lkPTZjMDliOTUyNW5uZ3ltNmM2dDAzYnFndnZhamV2NXczaG15ZDNyNTdiMHFyeWZyayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QsgJi30B9ByH7tRhGV/giphy.gif',
        'https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUyOG45ZXB3dGZyb3dwdXBhajRzZmkyeTZ2YTlzN292a21wa2xjaGt4MyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/4R8pzQboylfva/giphy.gif'
      ];

      recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
      await atacanteData.save();

      const embed = new EmbedBuilder()
        .setTitle('💀 ¡LA MALDICIÓN DE ERIS CAYÓ SOBRE TI!')
        .setDescription(`<@${victimaUser.id}>, **${atacanteUser.username}** te mandó un susto cerote!`)
        .setColor('#990000')
        .setImage(gifs[Math.floor(Math.random() * gifs.length)]);

      return await interaction.editReply({ content: `<@${victimaUser.id}>`, embeds: [embed] });
    }

    // --- 2. APODO (1,500 XP) ---
    if (tipo === 'apodo') {
      const COSTO = calcularCosto(1500);
      const apodoPuesto = nuevoApodo || 'Maje Maldito 🤡';

      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Necesitás **${COSTO} XP** para esta mierda.`);
      }

      try {
        if (!victimaMember) throw new Error('No member');
        await victimaMember.setNickname(apodoPuesto);
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`💀 **${atacanteUser.username}** le cambió el apodo a **<@${victimaUser.id}>** por **"${apodoPuesto}"**!`);
      } catch (e) {
        return await interaction.editReply(`No pude cambiarle el apodo a esa mara, seguro tiene mas jerarquia k yo :v`);
      }
    }

    // --- 3. ROBO DE XP (2,000 XP) ---
    if (tipo === 'robo') {
      const COSTO = calcularCosto(2000);
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply('Para intentar un robo necesitás 2,000 XP maje.');
      }

      const xpTotalVictima = obtenerXpTotal(victimaData);
      if (xpTotalVictima < 300) {
        return await interaction.editReply('Ese pisado está más pobre que vos, no tiene ni 300 XP xd');
      }

      const robado = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
      const realRobo = Math.min(robado, xpTotalVictima);
      const exito = Math.random() < 0.5;

      if (exito) {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO + realRobo);
        recalcularProgreso(victimaData, xpTotalVictima - realRobo);
        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`⚔️ **¡ROBO COMPLETADO!** **${atacanteUser.username}** le robó **${realRobo} XP** a **<@${victimaUser.id}>**!`);
      } else {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        recalcularProgreso(victimaData, xpTotalVictima + 500);
        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`❌ **¡ROBO FALLIDO!** **${atacanteUser.username}** comió mierda intentando robarle a **<@${victimaUser.id}>** y le regaló 500 XP :v`);
      }
    }

    // --- 4. SILENCIAR / BOZAL (2,500 XP) ---
    if (tipo === 'silenciar') {
      const COSTO = calcularCosto(2500);
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Para meterle bozal a un pisado necesitás **${COSTO} XP** y solo tenés **${xpTotalAtacante} XP**.`);
      }

      try {
        const objetivo = await interaction.guild.members.fetch(victimaUser.id);
        if (!objetivo) throw new Error('No member');

        await objetivo.timeout(60 * 60 * 1000, 'Maldición de ERIS: Silenciado por 1 hora');

        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`🤐 **¡BOZAL PUESTO!** **${atacanteUser.username}** le metió un bozal a **<@${victimaUser.id}>** por 1 hora completa. ¡A chillar a la llorona pisado! :v`);
      } catch (e) {
        return await interaction.editReply(`No pude silenciar a ese cerote, seguro tiene mas jerarquia k yo o me faltan permisos mano :v`);
      }
    }

    // --- 5. SPAM EN MD (3,000 XP) ---
    if (tipo === 'spam') {
      const COSTO = calcularCosto(3000);
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Para reventarle los MDs a un maje necesitás **${COSTO} XP** y solo tenés **${xpTotalAtacante} XP**.`);
      }

      const mensajesTerror = [
        "Soy MG, este es mi server, Soy MG, voy a darte admin, Soy MG, vuelvo en 3 años, Soy MG, manten el personaje",
        "Heliconia porfavor regresa conmigo esto no es Spam, porfavor perdoname, te acuerdas cuando nos quedabamos hablando hasta la medianoche? podemos volver a intentarlo, podemos volver a hacerlo pero porfavor perdoname, te entendere si no quieres",
        "ay dios mio, ay dios mio, ay dios- *toc-toc* quien es? soy MG jiji, MG estoy ocupado, que es ese ruido? *abre la puerta* NO MG NO, jiii, con la foto de Jane.C maldito pervertido, ZOMBIE, ZOMBIE🗣️, no, no llames a Zombie, que pasooo🗣️, Pepo que estas haciendo, con la foto de Jane.C maldito Pajero *foto* MG que estas haciendo?, lo voy a subir al server jiji",
        "le mando un saludo a: MG, Pepo, Zombie, Red, Juan, Lava, Jerry digo seta elegante, Acuamenta, Manzana, gipmao, viruzz, ciam, gurus, franco, W D G, santigames, yezan, popcap, EA, Xbox, Playstation, Nintendo, Japon, bomba atomica, Oppenheimer, albert einstein, Jeffry epstein",
        "al chile ya me canse de escfibir tanta jalada asi que si algo esta mal escrito ya al chile me pela 3000 vegas bien grandotas y rixas y asi y no se we alv ke pedo por davor ayuda"
      ];

      try {
        await victimaUser.send("😈 **¡LA MALDICIÓN DEL SPAM HA EMPEZADO!** Preparate para 5 minutos d pura tortura en tus MDs... :v");

        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        await interaction.editReply(`🔥 **¡SPAM DESATADO!** **${atacanteUser.username}** le reventó los mensajes privados a **<@${victimaUser.id}>** durante 5 minutos seguidos. ¡Que sufra el pisado! jajaja :v`);

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
          victimaUser.send("🛑 Se acabaron tus 5 minutos d sufrimiento... por ahora. :v").catch(() => {});
        }, tiempoTotal);

      } catch (e) {
        return await interaction.editReply(`❌ El pisado d **<@${victimaUser.id}>** tiene los mensajes privados cerrados, se salvo el culero :v`);
      }
    }

  } catch (error) {
    console.error('❌ Error en el comando de ERIS:', error);
    if (interaction.deferred) await interaction.editReply('Puchica Pepo, hubo un clavo al ejecutar la maldicion :v');
  }
});

client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
