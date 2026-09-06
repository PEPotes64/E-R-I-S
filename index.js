const { Client, GatewayIntentBits, EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const mongoose = require('mongoose');

// 1. Configuración del Bot de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// 2. Conexión a MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB nitidez.'))
  .catch((err) => console.error('❌ Clavo al conectar a MongoDB:', err));

// Esquema de XP
const userXpSchema = new mongoose.Schema({
  userId: String,
  guildId: String,
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

const UserXP = mongoose.model('UserXP', userXpSchema);

// Funciones Auxiliares
function obtenerXpTotal(userData) {
  return userData ? userData.xp : 0;
}

function restarXpTotal(userData, cantidad) {
  if (userData) {
    userData.xp = Math.max(0, userData.xp - cantidad);
  }
}

// 3. Registro de Comandos Slash
client.once('ready', async () => {
  console.log(`🤖 Bot iniciado como ${client.user.tag}`);

  const commands = [
    new SlashCommandBuilder()
      .setName('maldicion')
      .setDescription('Tira una maldición usando tu XP')
      .addStringOption(option =>
        option.setName('tipo')
          .setDescription('Tipo de maldición')
          .setRequired(true)
          .addChoices(
            { name: '👻 Susto (1,000 XP)', value: 'susto' },
            { name: '🤡 Apodo Feo (1,500 XP)', value: 'apodo' },
            { name: '💸 Robo de XP (2,000 XP)', value: 'robo' }
          )
      )
      .addUserOption(option =>
        option.setName('victima')
          .setDescription('Usuario al que le vas a tirar la maldición')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('nuevo_apodo')
          .setDescription('Apodo feo para la víctima (solo si elegiste Apodo)')
          .setRequired(false)
      )
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Comando /maldicion registrado nitidez.');
  } catch (err) {
    console.error('❌ Clavo al registrar comandos:', err);
  }
});

// 4. Lógica de Interacciones / Comandos
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'maldicion') {
    try {
      await interaction.deferReply();

      const tipo = interaction.options.getString('tipo');
      const victimaUser = interaction.options.getUser('victima');
      const victimaMember = interaction.options.getMember('victima');
      const atacante = interaction.member;

      if (!victimaUser) {
        await interaction.editReply('Puchica maje, tenes que seleccionar a una victima valida.');
        return;
      }

      const guildId = interaction.guild?.id;

      if (victimaUser.bot) {
        await interaction.editReply('Puchica maje, no podes maldecir a un bot > < :v');
        return;
      }

      if (victimaUser.id === atacante.id) {
        await interaction.editReply('¿Te vas a maldecir a vos mismo? No seas mero tronco chei.');
        return;
      }

      let atacanteData = await UserXP.findOne({ userId: atacante.id, guildId });
      let victimaData = await UserXP.findOne({ userId: victimaUser.id, guildId });

      if (!atacanteData) atacanteData = new UserXP({ userId: atacante.id, guildId, xp: 0, level: 1 });
      if (!victimaData) victimaData = new UserXP({ userId: victimaUser.id, guildId, xp: 0, level: 1 });

      const xpAtacante = obtenerXpTotal(atacanteData);

      // --- MALDICIÓN 1: SUSTO (1,000 XP) ---
      if (tipo === 'susto') {
        const PRECIO = 1000;
        if (xpAtacante < PRECIO) {
          await interaction.editReply(`No te alcanza la XP maje. Necesitás ${PRECIO} XP y solo tenés ${xpAtacante}.`);
          return;
        }

        const gifsSusto = [
          'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnE2YmZ1M3p1b3JpbmJ5Z3J3NWkyeXJpZHl4Zm9hdWV0YXJuaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif',
          'https://media.tenor.com/tenor_gif994271863456769054.gif',
          'https://media.tenor.com/tenor_gif3871427466295745202.gif',
          'https://media.tenor.com/tenor_gif5250529173064976480.gif',
          'https://media.tenor.com/tenor_gif1626678246351226625.gif',
          'https://media.tenor.com/tenor_gif7555269827273584090.gif',
          'https://media.tenor.com/tenor_gif6368330273635636205.gif'
        ];

        const gifElegido = gifsSusto[Math.floor(Math.random() * gifsSusto.length)];

        restarXpTotal(atacanteData, PRECIO);
        await atacanteData.save();

        const embedSusto = new EmbedBuilder()
          .setTitle('👻 ¡UNA MALDICIÓN HA CAÍDO SOBRE TI!')
          .setDescription(`**${victimaUser}**, las sombras de Eris te persiguen... ¡**${atacante.user.username}** pagó 1,000 XP para pegarte un susto de Halloween! 🎃⚡`)
          .setColor('#8B0000')
          .setImage(gifElegido);

        await interaction.editReply({ content: `${victimaUser}`, embeds: [embedSusto] });
      }

      // --- MALDICIÓN 2: APODO FEO (1,500 XP) ---
      else if (tipo === 'apodo') {
        const PRECIO = 1500;
        const nuevoApodo = interaction.options.getString('nuevo_apodo') || 'Maje Maldito 🤡';

        if (xpAtacante < PRECIO) {
          await interaction.editReply(`No tenés suficiente XP. Necesitás ${PRECIO} XP para cambiarle el apodo a alguien.`);
          return;
        }

        if (!victimaMember) {
          await interaction.editReply('No pude encontrar a ese usuario en el servidor para cambiarle el apodo.');
          return;
        }

        try {
          await victimaMember.setNickname(nuevoApodo);
          restarXpTotal(atacanteData, PRECIO);
          await atacanteData.save();

          await interaction.editReply(`🤡 **¡MALDICIÓN APLICADA!** Eris le ha cambiado el apodo a **${victimaUser.username}** por **"${nuevoApodo}"**.`);
        } catch (err) {
          await interaction.editReply('Puchica, no pude cambiarle el apodo. Revisá si el bot tiene permisos de *Manage Nicknames* y si está por encima del usuario.');
        }
      }

      // --- MALDICIÓN 3: ROBO DE XP (2,000 XP) ---
      else if (tipo === 'robo') {
        const PRECIO = 2000;
        if (xpAtacante < PRECIO) {
          await interaction.editReply(`Para intentar un robo necesitás invertir ${PRECIO} XP.`);
          return;
        }

        const xpVictima = obtenerXpTotal(victimaData);
        if (xpVictima < 300) {
          await interaction.editReply('Ese maje está re pobre de XP, no vale la pena ni robarle.');
          return;
        }

        const xpRobada = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
        const cantidadRealRobada = Math.min(xpRobada, xpVictima);

        restarXpTotal(atacanteData, PRECIO);
        atacanteData.xp += cantidadRealRobada;

        restarXpTotal(victimaData, cantidadRealRobada);

        await atacanteData.save();
        await victimaData.save();

        await interaction.editReply(`💸 **¡ROBO INTERGALÁCTICO!** **${atacante.user.username}** le robó **${cantidadRealRobada} XP** a **${victimaUser.username}**.`);
      }
    } catch (error) {
      console.error('❌ Error ejecutando la maldición:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Puchica maje, ocurrió un clavo interno al tirar la maldición.');
      }
    }
  }
});

// 5. Iniciar Sesión con el Token de ERIS
client.login(process.env.DISCORD_TOKEN_ERIS);
          
