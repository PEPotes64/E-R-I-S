const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
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

// 3. Registrar Comandos Slash
client.on('ready', async () => {
  const commands = [
    {
      name: 'maldiciones',
      description: '👁️ Despliega el menú de maldiciones oscuras de Eris.'
    }
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Comando /maldiciones registrado nitidez.');
  } catch (err) {
    console.error('❌ Clavo al registrar comandos:', err);
  }
});

// 4. Manejo de Interacciones
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'maldiciones') {
      const embed = new EmbedBuilder()
        .setTitle('🔥 **ALTAR DE LAS MALDICIONES DE ERIS** 🔥')
        .setDescription('Bienvenido, mortal... Gastá tu XP ganada con Zeus para sembrar el caos y la discordia en este servidor. Elegí tu maldición:')
        .setColor('#8B0000')
        .setThumbnail(client.user.displayAvatarURL())
        .setFooter({ text: 'Eris • Diosa de la Discordia' });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('menu_maldiciones')
        .setPlaceholder('💀 Selecciona una maldición para comprar...')
        .addOptions([
          {
            label: 'Maldición del Apodo Feo',
            description: 'Cambia el apodo de un compa a algo humillante por 1,500 XP.',
            value: 'maldicion_apodo',
            emoji: '🤡'
          },
          {
            label: 'Maldición del Susto',
            description: 'Eris asusta a tu víctima con un mensaje macabro por 1,000 XP.',
            value: 'maldicion_susto',
            emoji: '👻'
          },
          {
            label: 'Robo de XP',
            description: 'Le robás de 200 a 800 XP a un compa al azar por 2,000 XP.',
            value: 'maldicion_robo',
            emoji: '💸'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // Lógica del Menú Desplegable
  if (interaction.isStringSelectMenu() && interaction.customId === 'menu_maldiciones') {
    await interaction.deferReply({ ephemeral: true });

    const opcion = interaction.values[0];
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      let userXpData = await UserXP.findOne({ userId, guildId });
      
      // Calcular XP total acumulada
      const obtenerXpTotal = (data) => {
        if (!data) return 0;
        let total = data.xp;
        for (let i = 1; i < data.level; i++) {
          total += (i + 1) * 100;
        }
        return total;
      };

      const xpTotalActual = obtenerXpTotal(userXpData);

      if (opcion === 'maldicion_susto') {
        const PRECIO = 1000;
        if (xpTotalActual < PRECIO) {
          await interaction.editReply('Puchica maje, no te alcanza la XP para invocar esta maldición.');
          return;
        }
        await interaction.editReply('👻 **Maldición del susto seleccionada.** (Lógica lista para vincular a la víctima).');
      }
      else if (opcion === 'maldicion_apodo') {
        const PRECIO = 1500;
        if (xpTotalActual < PRECIO) {
          await interaction.editReply('Puchica maje, no te alcanza la XP para cambiarle el apodo a nadie.');
          return;
        }
        await interaction.editReply('🤡 **Maldición del apodo seleccionada.**');
      }
      else if (opcion === 'maldicion_robo') {
        const PRECIO = 2000;
        if (xpTotalActual < PRECIO) {
          await interaction.editReply('Puchica maje, necesitas al menos 2,000 XP acumulada para intentar robar.');
          return;
        }
        await interaction.editReply('💸 **Maldición de robo de XP seleccionada.**');
      }
    } catch (err) {
      console.error('Clavo en las maldiciones:', err);
      await interaction.editReply('Puchica, algo tronó al lanzar la maldición.');
    }
  }
});

// 5. Iniciar Sesión con el Token de ERIS
client.login(process.env.DISCORD_TOKEN_ERIS);
          
