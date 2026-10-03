const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionFlagsBits
} = require('discord.js');
const mongoose = require('mongoose');
const http = require('http'); // <-- AGREGÁS ESTA LINEA AKI :v

// --- TRAMPA DE PUERTO PARA QUE RENDER NO JODA ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Eris ta viva y coleando Pepo :v');
}).listen(PORT, () => {
  console.log(`trampa de puerto jalando nitido en el puerto ${PORT} :v`);
});

// 1. Inicialización de ERIS
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Conexión a Mongo
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('⚡ ERIS: Conectado a Mongo nitidez.'))
  .catch((err) => console.error('❌ ERIS: Clavo al conectar a Mongo:', err));

// 2. Base de Datos
const erisUserSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 1000 }, // XP inicial para jugar
  diasActivos: { type: Number, default: 0 },
  ultimaActividad: { type: Date },
  canalesDesbloqueados: [{ type: String }] // Guardamos las IDs de los canales que ya abrió
});

const ErisUser = mongoose.model('ErisUser', erisUserSchema);

// ===================================================
// CONFIGURACIÓN DE CANALES OCULTOS DE ERIS
// ===================================================
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
  '1456716609975750698',
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
      .setDescription('Desata el caos de ERIS sobre un usuario usando XP')
      .addUserOption(opt => 
        opt.setName('victima')
           .setDescription('El pisado que va a sufrir la maldición')
           .setRequired(true))
      .addStringOption(opt =>
        opt.setName('tipo')
           .setDescription('Elige la maldición')
           .setRequired(true)
           .addChoices(
             { name: '👻 Susto de Ultratumba (1,000 XP)', value: 'susto' },
             { name: '🤡 Apodo Humillante (1,500 XP)', value: 'apodo' },
             { name: '💸 Robo de XP (2,000 XP)', value: 'robo' }
           ))
      .addStringOption(opt =>
        opt.setName('nuevo_apodo')
           .setDescription('El apodo feo (Solo para la maldición de apodo)')
           .setRequired(false))
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ ERIS: Comando /maldicion registrado nitidez.');
  } catch (error) {
    console.error('❌ ERIS: Clavo al subir comandos:', error);
  }
});

// ===================================================
// 5. SISTEMA DE DÍAS ACTIVOS Y DESBLOQUEO DE CANALES
// ===================================================
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

    // Verificar si es un día nuevo
    const esDiferenteDia = !ultima || 
      hoy.getFullYear() !== ultima.getFullYear() ||
      hoy.getMonth() !== ultima.getMonth() ||
      hoy.getDate() !== ultima.getDate();

    if (esDiferenteDia) {
      userData.diasActivos += 1;
      userData.ultimaActividad = hoy;

      // Buscar qué canales del pool TODAVÍA no ha desbloqueado el usuario
      const canalesDisponibles = POOL_CANALES_OCULTOS.filter(
        idCanal => !userData.canalesDesbloqueados.includes(idCanal)
      );

      // Si todavía le quedan canales por desbloquear
      if (canalesDisponibles.length > 0) {
        // Seleccionar uno completametne aleatorio
        const canalRandomId = canalesDisponibles[Math.floor(Math.random() * canalesDisponibles.length)];
        const canalTarget = message.guild.channels.cache.get(canalRandomId);

        if (canalTarget) {
          // Darle permiso explícito al usuario en ese canal de Discord
          await canalTarget.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            SendMessages: true
          });

          // Guardar en la base de datos
          userData.canalesDesbloqueados.push(canalRandomId);

          await message.channel.send(
            `🔓 ¡**${message.author.username}** cumplió **${userData.diasActivos} día(s) activo(s)**! ERIS te desbloqueó un canal secreto aleatorio: ${canalTarget} 👀 > < :v`
          );
        }
      }

      await userData.save();
    }
  } catch (err) {
    console.error('❌ Clavo al procesar la racha de ERIS:', err);
  }
});

// ===================================================
// 6. LÓGICA DE LAS MALDICIONES (/maldicion)
// ===================================================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'maldicion') return;

  try {
    await interaction.deferReply();

    const victimaUser = interaction.options.getUser('victima');
    const victimaMember = interaction.options.getMember('victima');
    const tipo = interaction.options.getString('tipo');
    const nuevoApodo = interaction.options.getString('nuevo_apodo');
    const atacante = interaction.member;
    const guildId = interaction.guildId;

    if (victimaUser.bot) return await interaction.editReply('Nee maje, no podes maldecir bots > < :v');
    if (victimaUser.id === atacante.id) return await interaction.editReply('¿Te vas a maldecir vos solo? No seas cerote chei.');

    let atacanteData = await ErisUser.findOne({ userId: atacante.id, guildId });
    let victimaData = await ErisUser.findOne({ userId: victimaUser.id, guildId });

    if (!atacanteData) atacanteData = new ErisUser({ userId: atacante.id, guildId });
    if (!victimaData) victimaData = new ErisUser({ userId: victimaUser.id, guildId });

    // --- MALDICIÓN 1: SUSTO (1,000 XP) ---
    if (tipo === 'susto') {
      const COSTO = 1000;
      if (atacanteData.xp < COSTO) {
        return await interaction.editReply(`Estás mudo de XP maje. Necesitás **${COSTO} XP** y solo tenés **${atacanteData.xp} XP**.`);
      }

      const gifs = [
        'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif',
        'https://media.tenor.com/tenor_gif994271863456769054.gif',
        'https://media.tenor.com/tenor_gif3871427466295745202.gif'
      ];

      atacanteData.xp -= COSTO;
      await atacanteData.save();

      const embed = new EmbedBuilder()
        .setTitle('👻 ¡LA MALDICIÓN DE ERIS CAYÓ SOBRE TI!')
        .setDescription(`¡**${victimaUser}**, **${atacante.user.username}** gastó 1,000 XP para mandarte un susto cerote! 🎃⚡`)
        .setColor('#992d22')
        .setImage(gifs[Math.floor(Math.random() * gifs.length)]);

      return await interaction.editReply({ content: `${victimaUser}`, embeds: [embed] });
    }

    // --- MALDICIÓN 2: APODO (1,500 XP) ---
    if (tipo === 'apodo') {
      const COSTO = 1500;
      const apodoPuesto = nuevoApodo || 'Maje Maldito 🤡';

      if (atacanteData.xp < COSTO) {
        return await interaction.editReply(`Necesitás **${COSTO} XP** para esta mierda.`);
      }

      try {
        await victimaMember.setNickname(apodoPuesto);
        atacanteData.xp -= COSTO;
        await atacanteData.save();

        return await interaction.editReply(`🤡 ¡**MALDICIÓN APLICADA**! ERIS le cambió el apodo a **${victimaUser.username}** por **"${apodoPuesto}"**.`);
      } catch (e) {
        return await interaction.editReply('Puchica, no pude cambiarle el apodo. Revisá si el rol de ERIS está arriba del usuario y tiene permisos de *Manage Nicknames*.');
      }
    }

    // --- MALDICIÓN 3: ROBO DE XP (2,000 XP) ---
    if (tipo === 'robo') {
      const COSTO = 2000;

      if (atacanteData.xp < COSTO) {
        return await interaction.editReply(`Para intentar un robo necesitás apostar **${COSTO} XP**.`);
      }

      if (victimaData.xp < 300) {
        return await interaction.editReply('Ese pisado está más pobre que uno, ni vale la pena robarle.');
      }

      const robado = Math.floor(Math.random() * (700 - 300 + 1)) + 300;
      const realRobo = Math.min(robado, victimaData.xp);

      atacanteData.xp = (atacanteData.xp - COSTO) + realRobo;
      victimaData.xp -= realRobo;

      await atacanteData.save();
      await victimaData.save();

      return await interaction.editReply(`💸 ¡**ROBO COMPLETADO**! **${atacante.user.username}** le robó **${realRobo} XP** a **${victimaUser.username}**.`);
    }

  } catch (error) {
    console.error('❌ Error en el comando de ERIS:', error);
    if (interaction.deferred) await interaction.editReply('Puchica Pepo, saltó un clavo con la maldición.');
  }
});

client.login(process.env.DISCORD_TOKEN);
        
