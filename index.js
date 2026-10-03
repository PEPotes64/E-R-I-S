const http = require('http');
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const mongoose = require('mongoose');

// --- TRAMPA DE PUERTO PARA QUE RENDER NO JODA ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eris ta viva y coleando Pepo :v');
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
  .then(() => console.log('⚡ ERIS: Conectado a Mongo nitidez.'))
  .catch((err) => console.error('❌ ERIS: Clavo al conectar a Mongo:', err));

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

// Usamos 'UserXP' para compartir la misma tabla con Zeus :v
const ErisUser = mongoose.model('UserXP', erisUserSchema);

// --- FUNCIONES MÁGICAS DE COMPATIBILIDAD CON ZEUS ---
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

// 3. CONFIGURACION DE CANALES OCULTOS DE ERIS
const POOL_CANALES_OCULTOS = [
  '1538617880520826880',
  '1346670096789278730',
  '1456350480484532416',
  '1447323114324103269',
  '1445238082122154045',
  '1452110210176126986',
  '1445443527982186568',
  '1373118710411169953',
  '1373302270107586784',
  '1456351873010241737',
  '1540482635569168495',
  '1422796615604899841',
  '1336314516979318786',
  '1336712258721419275',
  '1360807051504386068',
  '1457873660856631438',
  '1456716600975750698',
  '1456354566055657523',
  '1456354934693036207',
  '1538630184272666624',
  '1388348972825055313',
  '1337067080058671157',
  '1347060414097264641',
  '1456351572777766985'
];

// 4. Registrar Comandos Slash
client.once('ready', async () => {
  console.log(`🔥 ERIS resucitada y lista como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('maldicion')
      .setDescription('Desata el caos de ERIS sobre un usuario')
      .addUserOption(opt =>
        opt.setName('victima')
          .setDescription('El pisado que va a sufrir la maldición')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('tipo')
          .setDescription('Elige la maldición')
          .setRequired(true)
          .addChoices(
            { name: 'Susto de Ultratumba (1,000 XP)', value: 'susto' },
            { name: 'Apodo Humillante (1,500 XP)', value: 'apodo' },
            { name: 'Robo de XP (2,000 XP)', value: 'robo' }
          )
      )
      .addStringOption(opt =>
        opt.setName('nuevo_apodo')
          .setDescription('El apodo feo (Solo para la maldición de apodo)')
          .setRequired(false)
      )
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ ERIS: Comando /maldicion registrado nitidez.');
  } catch (error) {
    console.error('❌ ERIS: Clavo al subir comandos:', error);
  }
});

// 5. SISTEMA DE DIAS ACTIVOS Y DESBLOQUEO DE CANALES
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;

  try {
    let userData = await ErisUser.findOne({ userId, guildId });
    if (!userData) {
      userData = new ErisUser({ userId, guildId });
    }

    const hoy = new Date();
    const ultima = userData.ultimaActividad ? new Date(userData.ultimaActividad) : null;

    const esDiferenteDia = !ultima ||
      hoy.getFullYear() !== ultima.getFullYear() ||
      hoy.getMonth() !== ultima.getMonth() ||
      hoy.getDate() !== ultima.getDate();

    if (esDiferenteDia) {
      userData.diasActivos += 1;
      userData.ultimaActividad = hoy;

      const canalesDisponibles = POOL_CANALES_OCULTOS.filter(
        idKanal => !userData.canalesDesbloqueados.includes(idKanal)
      );

      if (canalesDisponibles.length > 0) {
        const canalRandomId = canalesDisponibles[Math.floor(Math.random() * canalesDisponibles.length)];
        const canalTarget = message.guild.channels.cache.get(canalRandomId);

        if (canalTarget) {
          await canalTarget.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            SendMessages: true
          });

          userData.canalesDesbloqueados.push(canalRandomId);

          await message.channel.send(
            `🎉 **${message.author.username}** cumplió **${userData.diasActivos} día(s) activo(s)**! ERIS te desbloqueó un canal secreto.`
          );
        }
      }
    }

    await userData.save();
  } catch (err) {
    console.error('❌ Clavo al procesar actividad:', err);
  }
});

// 6. LOGICA DE LAS MALDICIONES (/maldicion)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'maldicion') return;

  try {
    await interaction.deferReply();

    const victimaUser = interaction.options.getUser('victima');
    const victimaMember = interaction.options.getMember('victima');
    const tipo = interaction.options.getString('tipo');
    const nuevoApodo = interaction.options.getString('nuevo_apodo');
    
    // Usamos el User directo para que nunca venga nulo ni de clavo
    const atacanteUser = interaction.user;
const guildId = interaction.guildId; // <--- ESTE NUNCA FALLA EN SERVIDORES
    
    if (!guildId) return await interaction.editReply('Esta mierda solo funciona dentro del servidor Pepo :v');
    if (!victimaUser) return await interaction.editReply('No encontre a ese pisado :v');
    if (victimaUser.bot) return await interaction.editReply('Nee maje, no podes maldecir bots :v');
    if (victimaUser.id === atacanteUser.id) return await interaction.editReply('¿Te vas a maldecir vos solo? No seas cerote :v');

    let atacanteData = await ErisUser.findOne({ userId: atacanteUser.id, guildId });
    let victimaData = await ErisUser.findOne({ userId: victimaUser.id, guildId });

    if (!atacanteData) atacanteData = new ErisUser({ userId: atacanteUser.id, guildId });
    if (!victimaData) victimaData = new ErisUser({ userId: victimaUser.id, guildId });

    // Calculamos el XP total tomando en cuenta los niveles de Zeus
    const xpTotalAtacante = obtenerXpTotal(atacanteData);

    // --- MALDICION 1: SUSTO (1,000 XP) ---
    if (tipo === 'susto') {
      const COSTO = 1000;
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Estás mudo de XP maje. Necesitás **${COSTO} XP** y solo tenés **${xpTotalAtacante} XP**.`);
      }

      const gifs = [
        'https://media.giphy.com/media/3o7TKSjRRFIPjeiKyM/giphy.gif',
        'https://media.tenor.com/tenor_gif994273863456769154.gif',
        'https://media.tenor.com/gif3071823061295705202.gif'
      ];

      recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
      await atacanteData.save();

      const embed = new EmbedBuilder()
        .setTitle('💀 ¡LA MALDICIÓN DE ERIS CAYÓ SOBRE TI!')
        .setDescription(`**<@${victimaUser.id}>**, **${atacanteUser.username}** gastó 1,000 XP para mandarte un susto cerote!`)
        .setColor('#990000')
        .setImage(gifs[Math.floor(Math.random() * gifs.length)]);

      return await interaction.editReply({ content: `<@${victimaUser.id}>`, embeds: [embed] });
    }

    // --- MALDICION 2: APODO (1,500 XP) ---
    if (tipo === 'apodo') {
      const COSTO = 1500;
      const apodoPuesto = nuevoApodo || 'Maje Maldito 🤡';

      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Necesitás **${COSTO} XP** para esta mierda.`);
      }

      try {
        if (!victimaMember) throw new Error('No member');
        await victimaMember.setNickname(apodoPuesto);
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        await atacanteData.save();

        return await interaction.editReply(`💀 **${atacanteUser.username}** le cambió el apodo a **<@${victimaUser.id}>** a **"${apodoPuesto}"** por mala nota :v`);
      } catch (e) {
        return await interaction.editReply(`No pude cambiarle el apodo a ese maje, seguro tiene un rol más alto que el mío o no esta en la cache :v`);
      }
    }

    // --- MALDICION 3: ROBO DE XP (2,000 XP) ---
    if (tipo === 'robo') {
      const COSTO = 2000;
      if (xpTotalAtacante < COSTO) {
        return await interaction.editReply(`Para intentar un robo necesitás apostar **${COSTO} XP**.`);
      }

      const xpTotalVictima = obtenerXpTotal(victimaData);
      if (xpTotalVictima < 300) {
        return await interaction.editReply(`Ese pisado está más pobre que uno, ni vale la pena robarle :v`);
      }

      const robado = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
      const realRobo = Math.min(robado, xpTotalVictima);

      // 50% de probabilidad de éxito
      const exito = Math.random() < 0.5;

      if (exito) {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO + realRobo);
        recalcularProgreso(victimaData, xpTotalVictima - realRobo);

        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`⚔️ **¡ROBO COMPLETADO!** **${atacanteUser.username}** le robó **${realRobo} XP** a **<@${victimaUser.id}>**! 🎉`);
      } else {
        recalcularProgreso(atacanteData, xpTotalAtacante - COSTO);
        recalcularProgreso(victimaData, xpTotalVictima + 500);

        await atacanteData.save();
        await victimaData.save();

        return await interaction.editReply(`❌ **¡ROBO FALLIDO!** **${atacanteUser.username}** la cagó intentando robar y perdió sus 2000 XP. **<@${victimaUser.id}>** se quedó con 500 XP de recompensa :v`);
      }
    }

  } catch (error) {
    console.error('❌ Error en el comando de ERIS:', error);
    if (interaction.deferred) await interaction.editReply('Puchica Pepo, saltó un clavo con la maldición :v');
  }
});

client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
          
