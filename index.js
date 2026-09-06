const { Client, GatewayIntentBits, EmbedBuilder, ApplicationCommandOptionType } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// 1. Conexión a MongoDB (Usa la misma base de datos de Zeus)
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('🔥 ERIS se conectó con éxito a MongoDB'))
  .catch((err) => console.error('❌ Clavo al conectar MongoDB:', err));

// Esquema de UserXP (Mismo de Zeus para compartir los puntos acumulados)
const userXpSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 }
});

const UserXP = mongoose.models.UserXP || mongoose.model('UserXP', userXpSchema);

// Función para calcular la XP Total Acumulada
const obtenerXpTotal = (data) => {
  if (!data) return 0;
  let total = data.xp;
  for (let i = 1; i < data.level; i++) {
    total += (i + 1) * 100;
  }
  return total;
};

// Función para restar XP Total consumiendo niveles si es necesario
const restarXpTotal = (data, costo) => {
  let xpRestante = costo;
  
  if (data.xp >= xpRestante) {
    data.xp -= xpRestante;
  } else {
    xpRestante -= data.xp;
    data.xp = 0;
    while (xpRestante > 0 && data.level > 1) {
      data.level -= 1;
      let xpDelNivel = data.level * 100;
      if (xpDelNivel >= xpRestante) {
        data.xp = xpDelNivel - xpRestante;
        xpRestante = 0;
      } else {
        xpRestante -= xpDelNivel;
      }
    }
  }
};

// 2. Configuración del Cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`🔥 ¡ERIS ha despertado como ${client.user.tag}!`);
});

// 3. Registrar Comando Slash /maldicion
client.on('ready', async () => {
  const commands = [
    {
      name: 'maldicion',
      description: '👁️ Lanza una maldición de Eris a un usuario usando tu XP.',
      options: [
        {
          name: 'tipo',
          description: 'Selecciona el tipo de maldición',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            { name: '🤡 Apodo Feo (1,500 XP)', value: 'apodo' },
            { name: '👻 Susto Macabro (1,000 XP)', value: 'susto' },
            { name: '💸 Robo de XP (2,000 XP)', value: 'robo' }
          ]
        },
        {
          name: 'victima',
          description: 'El usuario que va a sufrir la maldición',
          type: ApplicationCommandOptionType.User,
          required: true
        },
        {
          name: 'nuevo_apodo',
          description: 'El apodo feo (Solo para la maldición de Apodo)',
          type: ApplicationCommandOptionType.String,
          required: false
        }
      ]
    }
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
      const victima = interaction.options.getMember('victima');
      const atacante = interaction.member;

      // VALIDACION DE VICTIMA (Evita que truene el id)
      if (!victima) {
        await interaction.editReply('Puchica maje, tenes que seleccionar a una victima valida.');
        return;
      }

      const guildId = interaction.guild?.id;

      if (victima.user.bot) {
        await interaction.editReply('Puchica maje, no podes maldecir a un bot > < :v');
        return;
      }

      if (victima.id === atacante.id) {
        await interaction.editReply('¿Te vas a maldecir a vos mismo? No seas mero tronco chei.');
        return;
      }

      // Correccion de variables (guildId bien escrito)
      let atacanteData = await UserXP.findOne({ userId: atacante.id, guildId });
      let victimaData = await UserXP.findOne({ userId: victima.id, guildId });

      if (!atacanteData) atacanteData = new UserXP({ userId: atacante.id, guildId, xp: 0, level: 1 });
      if (!victimaData) victimaData = new UserXP({ userId: victima.id, guildId, xp: 0, level: 1 });

      const xpAtacante = obtenerXpTotal(atacanteData);


    // --- MALDICIÓN 1: SUSTO (1,000 XP) ---
    if (tipo === 'susto') {
      const PRECIO = 1000;
      if (xpAtacante < PRECIO) {
        await interaction.editReply(`No te alcanza la XP maje. Necesitás ${PRECIO} XP y solo tenés ${xpAtacante}.`);
        return;
      }

      // Galería completa con los GIFs turbios que pasaste
      const gifsSusto = [
        'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnE2YmZ1M3p1b3JpbmJ5Z3J3NWkyeXJpZHl4Zm9hdWV0YXJuaCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif',
        'https://media.tenor.com/tenor_gif994271863456769054.gif',
        'https://media.tenor.com/tenor_gif3871427466295745202.gif', // Esqueleto bailando
        'https://media.tenor.com/tenor_gif5250529173064976480.gif', // Entidad oscura
        'https://media.tenor.com/tenor_gif1626678246351226625.gif', // Criatura extraña
        'https://media.tenor.com/tenor_gif7555269827273584090.gif', // Monstruo en la pared
        'https://media.tenor.com/tenor_gif6368330273635636205.gif'  // Susto en la oscuridad
      ];

      const gifElegido = gifsSusto[Math.floor(Math.random() * gifsSusto.length)];

      restarXpTotal(atacanteData, PRECIO);
      await atacanteData.save();

      const embedSusto = new EmbedBuilder()
        .setTitle('👻 ¡UNA MALDICIÓN HA CAÍDO SOBRE TI!')
        .setDescription(`**${victima}**, las sombras de Eris te persiguen... ¡**${atacante.user.username}** pagó 1,000 XP para pegarte un susto de Halloween! 🎃⚡`)
        .setColor('#8B0000')
        .setImage(gifElegido);

      await interaction.editReply({ content: `${victima}`, embeds: [embedSusto] });
    }

    // --- MALDICIÓN 2: APODO FEO (1,500 XP) ---
    else if (tipo === 'apodo') {
      const PRECIO = 1500;
      const nuevoApodo = interaction.options.getString('nuevo_apodo') || 'Maje Maldito 🤡';

      if (xpAtacante < PRECIO) {
        await interaction.editReply(`No tenés suficiente XP. Necesitás ${PRECIO} XP para cambiarle el apodo a alguien.`);
        return;
      }

      try {
        await victima.setNickname(nuevoApodo);
        restarXpTotal(atacanteData, PRECIO);
        await atacanteData.save();

        await interaction.editReply(`🤡 **¡MALDICIÓN APLICADA!** Eris le ha cambiado el apodo a **${victima.user.username}** por **"${nuevoApodo}"**. Se gastaron 1,500 XP.`);
      } catch (err) {
        await interaction.editReply('Puchica, no pude cambiarle el apodo. Asegurate de que el bot tenga permisos de *Manage Nicknames* y su rol esté por encima del de la víctima.');
      }
    }

    // --- MALDICIÓN 3: ROBO DE XP (2,000 XP) ---
    else if (tipo === 'robo') {
      const PRECIO = 2000;
      if (xpAtacante < PRECIO) {
        await interaction.editReply(`Para intentar un robo necesitás invertir ${PRECIO} XP.`);
        return;
      }

      if (!victimaData) {
        await interaction.editReply('Esa víctima está tan limpia que ni registro de XP tiene en la base de datos.');
        return;
      }

      const xpVictima = obtenerXpTotal(victimaData);
      if (xpVictima < 300) {
        await interaction.editReply('Ese maje está re pobre de XP, no vale la pena ni robarle.');
        return;
      }

      // Cantidad aleatoria de robo entre 300 y 800 XP
      const xpRobada = Math.floor(Math.random() * (800 - 300 + 1)) + 300;
      const cantidadRealRobada = Math.min(xpRobada, xpVictima);

      // Descontar costo del ataque y sumar lo robado
      restarXpTotal(atacanteData, PRECIO);
      atacanteData.xp += cantidadRealRobada;

      // Restar XP a la víctima
      restarXpTotal(victimaData, cantidadRealRobada);

      await atacanteData.save();
      await victimaData.save();

      await interaction.editReply(`💸 **¡ROBO INTERGALÁCTICO!** **${atacante.user.username}** usó la magia negra de Eris para robarle **${cantidadRealRobada} XP** a **${victima.user.username}**.`);
    }
  }
});

// 5. Iniciar Sesión con el Token de ERIS desde las variables de Render / .env
client.login(process.env.DISCORD_TOKEN_ERIS);
