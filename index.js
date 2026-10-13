const http = require('http');
const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    SlashCommandBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();

// ==========================================
// --- SECCIÓN 1: CONFIGURACIÓN Y PUERTO RENDER ---
// ==========================================
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Eris la viva y lista para el aquelarre definitivo en cualquier server Pepo :v');
}).listen(PORT, () => {
    console.log(`[+] Trampa d puerto jalando nitido en el puerto ${PORT} :v`);
});

// ==========================================
// --- SECCIÓN 2: CLIENTE Y CONEXIÓN MONGO DB ---
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(() => console.log('🔥 ERIS: Conectado a Mongo nitidazo.'))
    .catch(err => console.error('❌ ERIS: Clave al conectar a Mongo:', err));

// ==========================================
// --- SECCIÓN 3: ESQUEMAS DE BASE DE DATOS ---
// ==========================================
const erisUserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    diasActivos: { type: Number, default: 0 },
    ultimaActividad: { type: Date },
    canalesDesbloqueados: [{ type: String }],
    
    // ROLES Y RECURSOS
    rol: { type: String, default: 'PANA' }, // BRUJA, DEMONIO, VERDUGO, CURA, ESPECTRO, VOZ, PANA
    alma: { type: Number, default: 0 },
    escudoHasta: { type: Date, default: null },
    esEscudoBruja: { type: Boolean, default: false },
    escudosUsadosHoy: { type: Number, default: 0 },
    verdugoCastigadoHasta: { type: Date, default: null }
});

const ErisUser = mongoose.model('ErisUser', erisUserSchema);

const erisGameStateSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    brujasCazadas: { type: Number, default: 0 }, // Meta: 6
    diasSinCazar: { type: Number, default: 0 },   // Meta: 7 seguidos
    juegoActivo: { type: Boolean, default: true },
    palabraProhibida: { type: String, default: null },
    comandosBloqueados: { type: Boolean, default: false }
});

const ErisGameState = mongoose.model('ErisGameState', erisGameStateSchema);

// ESTRUCTURAS DE MEMORIA DINÁMICAS POR GUILD
let comandosPendientesDemonio = new Map(); // Key: guildId_idCmd
let registroVotos = {};
let usuariosQueVotaron = [];
let votacionAbierta = false;
let vozIntervino = false;

// ==========================================
// --- SECCIÓN 4: FUNCIONES AUXILIARES Y TIEMPO ---
// ==========================================
function esHoraDeLaBruja() {
    const ahora = new Date();
    const horaGT = parseInt(ahora.toLocaleTimeString("en-US", { timeZone: "America/Guatemala", hour12: false }));
    return horaGT === 18; // 6:00 PM a 6:59 PM GT
}

function esTormentaDeSangre() {
    const ahora = new Date();
    const diaSemana = ahora.getDay(); // 0 = Domingo, 6 = Sábado
    return (diaSemana === 0 || diaSemana === 6);
}

// ASIGNACIÓN ALEATORIA DE ROLES DINÁMICA POR SERVIDOR
async function repartirRolesGeneral(guild) {
    let state = await ErisGameState.findOne({ guildId: guild.id });
    if (!state) state = await ErisGameState.create({ guildId: guild.id });

    await ErisUser.updateMany({ guildId: guild.id }, { $set: { rol: 'PANA', alma: 0, esEscudoBruja: false, escudoHasta: null } });

    // Obtener miembros reales del servidor actual (excluyendo bots)
    await guild.members.fetch();
    let disponibles = guild.members.cache.filter(m => !m.user.bot).map(m => m.user.id);
    disponibles.sort(() => Math.random() - 0.5); // Mezcla 100% Aleatoria

    if (disponibles.length < 7) {
        console.log(`⚠️ [${guild.name}] No hay suficientes miembros humanos (mínimo 7) para repartir los roles.`);
        return false;
    }

    const idBruja1 = disponibles.pop();
    const idBruja2 = disponibles.pop();
    const idDemonio = disponibles.pop();
    const idVerdugo = disponibles.pop();
    const idCura = disponibles.pop();
    const idEspectro = disponibles.pop();
    const idVoz = disponibles.pop();

    await ErisUser.updateOne({ userId: idBruja1, guildId: guild.id }, { rol: 'BRUJA' }, { upsert: true });
    await ErisUser.updateOne({ userId: idBruja2, guildId: guild.id }, { rol: 'BRUJA' }, { upsert: true });
    await ErisUser.updateOne({ userId: idDemonio, guildId: guild.id }, { rol: 'DEMONIO' }, { upsert: true });
    await ErisUser.updateOne({ userId: idVerdugo, guildId: guild.id }, { rol: 'VERDUGO' }, { upsert: true });
    await ErisUser.updateOne({ userId: idCura, guildId: guild.id }, { rol: 'CURA' }, { upsert: true });
    await ErisUser.updateOne({ userId: idEspectro, guildId: guild.id }, { rol: 'ESPECTRO' }, { upsert: true });
    await ErisUser.updateOne({ userId: idVoz, guildId: guild.id }, { rol: 'VOZ' }, { upsert: true });

    const notificar = async (id, msg) => {
        try {
            const u = await client.users.fetch(id);
            if (u) await u.send(msg);
        } catch (e) {}
    };

    await notificar(idBruja1, `🧙‍♀️ **SOS BRUJA DE LA PURGA en ${guild.name}.** Escondete del pueblo, junta ALMA cada día y desatálos.`);
    await notificar(idBruja2, `🧙‍♀️ **SOS BRUJA DE LA PURGA en ${guild.name}.** Escondete del pueblo, junta ALMA cada día y desatálos.`);
    await notificar(idDemonio, `👹 **SOS EL DEMONIO en ${guild.name}.** Controlás y modificás las maldiciones de las Brujas antes de que se ejecuten. Sos el titiritero supremo.`);
    await notificar(idVerdugo, `🗡️ **SOS EL VERDUGO en ${guild.name}.** Podés ejecutar a una Bruja en la Hora de la Bruja (6-7 PM GT). ¡Si te equivocás, quedás mulo y silenciado!`);
    await notificar(idCura, `🛡️ **SOS EL CURA en ${guild.name}.** Podés dar 2 escudos al día de 3h. Si le ponés escudo a una bruja por error y ataca, ¡se rompen todos!`);
    await notificar(idEspectro, `👻 **SOS EL ESPECTRO en ${guild.name}.** Podés asustar, cambiar apodos y PROFANAR identidades copiando fotos de perfil.`);
    await notificar(idVoz, `🎙️ **SOS LA VOZ en ${guild.name}.** Podés cambiar los resultados de la horca a último segundo.`);

    console.log(`🔥 Roles repartidos aleatoriamente con éxito en el servidor: ${guild.name}`);
    return true;
}

// ==========================================
// --- SECCIÓN 5: REGISTRO DE COMANDOS SLASH ---
// ==========================================
client.once('ready', async () => {
    console.log(`🔥 ERIS resucitada y lista como ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('maldicion')
            .setDescription('Lanza una maldición sobre un usuario (Brujas/Demonio)')
            .addStringOption(opt =>
                opt.setName('tipo')
                   .setDescription('Tipo de maldición')
                   .setRequired(true)
                   .addChoices(
                       { name: '👻 Susto (1 ALMA)', value: 'susto' },
                       { name: '🏷️ Apodo Humillante (2 ALMA)', value: 'apodo' },
                       { name: '⚔️ Robo de XP/ALMA (2 ALMA)', value: 'robo' },
                       { name: '🤐 Bozal de 1 Hora (3 ALMA)', value: 'silenciar' },
                       { name: '📩 Spam Masivo en MD (3 ALMA)', value: 'spam' },
                       { name: '📞 Llamada Terrorífica 5 min (4 ALMA)', value: 'llamada' },
                       { name: '🚫 Cero Comandos 15 min (5 ALMA)', value: 'cero_comandos' },
                       { name: '🖤 Lista Negra de Palabra (5 ALMA)', value: 'lista_negra' },
                       { name: '💥 Acabar - Apocalipsis Chat (6 ALMA)', value: 'acabar' }
                   ))
            .addUserOption(opt => opt.setName('victima').setDescription('Víctima').setRequired(false))
            .addStringOption(opt => opt.setName('texto').setDescription('Texto opcional, apodo o palabra prohibida')),

        new SlashCommandBuilder()
            .setName('demonio_panel')
            .setDescription('Panel del Demonio para interceptar comandos')
            .addStringOption(opt => opt.setName('id_comando').setDescription('ID de la maldición retenida').setRequired(true))
            .addStringOption(opt =>
                opt.setName('accion')
                   .setDescription('Aprobar, bloquear o modificar')
                   .setRequired(true)
                   .addChoices(
                       { name: '✅ Aprobar', value: 'aprobar' },
                       { name: '❌ Denegar', value: 'denegar' },
                       { name: '🔄 Revertir a la Bruja', value: 'revertir' }
                   )),

        new SlashCommandBuilder()
            .setName('ejecutar')
            .setDescription('Comando del Verdugo para matar a una Bruja en su hora de poder')
            .addUserOption(opt => opt.setName('sospechoso').setDescription('A quién querés ejecutar').setRequired(true)),

        new SlashCommandBuilder()
            .setName('proteger')
            .setDescription('Comando del Cura para otorgar un escudo de 3 horas')
            .addUserOption(opt => opt.setName('usuario').setDescription('A quién vas a proteger').setRequired(true)),

        new SlashCommandBuilder()
            .setName('maldicion_espectro')
            .setDescription('Comando del Espectro para joder en el chat')
            .addStringOption(opt =>
                opt.setName('tipo')
                   .setDescription('Tipo de susto espectral')
                   .setRequired(true)
                   .addChoices(
                       { name: '👻 Asustar', value: 'susto' },
                       { name: '🏷️ Cambiar Apodo', value: 'apodo' },
                       { name: '🎭 Profanar Identidad (Clonar)', value: 'profanar' }
                   ))
            .addUserOption(opt => opt.setName('victima').setDescription('Víctima').setRequired(true))
            .addStringOption(opt => opt.setName('texto').setDescription('Texto o Apodo')),

        new SlashCommandBuilder()
            .setName('voltear_voto')
            .setDescription('Comando de La Voz para cambiar el destino de la votación')
            .addUserOption(opt => opt.setName('salvar').setDescription('A quién querés salvar de la horca').setRequired(true)),

        new SlashCommandBuilder()
            .setName('horca')
            .setDescription('Vota para mandar a la horca a un sospechoso')
            .addUserOption(opt => opt.setName('sospechoso').setDescription('El mulo sospechoso').setRequired(true)),

        new SlashCommandBuilder()
            .setName('pedir_a_eris')
            .setDescription('Comando de Administración para mover a ERIS')
            .addStringOption(opt =>
                opt.setName('accion')
                   .setDescription('Qué querés que haga ERIS')
                   .setRequired(true)
                   .addChoices(
                       { name: '🗣️ Hablar en un canal', value: 'decir' },
                       { name: '👑 Dar/Quitar Rol', value: 'rol' },
                       { name: '🏷️ Cambiar Apodo', value: 'apodo' },
                       { name: '🤐 Mutear Maje', value: 'mutear' },
                       { name: '🧹 Borrar Mensajes', value: 'limpiar' }
                   ))
            .addChannelOption(opt => opt.setName('canal').setDescription('Canal de destino'))
            .addStringOption(opt => opt.setName('texto').setDescription('Texto a enviar'))
            .addUserOption(opt => opt.setName('objetivo').setDescription('Usuario objetivo'))
            .addRoleOption(opt => opt.setName('rol').setDescription('Rol a administrar'))
    ];

    try {
        await client.application.commands.set(commands);
        console.log('✅ ERIS: Todos los Comandos Slash registrados correctamente.');
    } catch (error) {
        console.error('❌ ERIS: Clave al subir comandos:', error);
    }

    for (const guild of client.guilds.cache.values()) {
        const count = await ErisUser.countDocuments({ guildId: guild.id, rol: { $ne: 'PANA' } });
        if (count === 0) {
            await repartirRolesGeneral(guild);
        }
    }
});

// ==========================================
// --- SECCIÓN 6: BUCLE AUTOMÁTICO (REVISIÓN DÍA A DÍA) ---
// ==========================================
setInterval(async () => {
    const ahora = new Date();
    const horaGT = parseInt(ahora.toLocaleTimeString("en-US", { timeZone: "America/Guatemala", hour12: false }));
    const minutoGT = ahora.getMinutes();

    // 00:00 GT - Ganancia de ALMA (+3 ALMA por día)
    if (horaGT === 0 && minutoGT === 0) {
        for (const guild of client.guilds.cache.values()) {
            let state = await ErisGameState.findOne({ guildId: guild.id });
            if (!state || !state.juegoActivo) continue;

            await ErisUser.updateMany(
                { guildId: guild.id, rol: { $in: ['BRUJA', 'DEMONIO'] } },
                { $inc: { alma: 3 } }
            );

            await ErisUser.updateMany({ guildId: guild.id }, { $set: { escudosUsadosHoy: 0 } });

            state.diasSinCazar += 1;
            if (state.diasSinCazar >= 7) {
                state.juegoActivo = false;
                const canalGen = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased());
                if (canalGen) await canalGen.send('🏆 **¡LAS BRUJAS HAN GANADO LA PURGA!** Han pasado 7 días consecutivos sin que el Pueblo cazara a ninguna Bruja. Se acabaron los juegos alv.');
            }
            await state.save();

            console.log(`🌙 Medianoche GT: +3 ALMA otorgadas en ${guild.name}`);
        }
    }
}, 60000);

// ==========================================
// --- SECCIÓN 7: EVENTO DE MENSAJES (CANALES Y PALABRA PROHIBIDA) ---
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const userId = message.author.id;
    const guildId = message.guild.id;

    let gameState = await ErisGameState.findOne({ guildId });
    if (gameState && gameState.palabraProhibida && message.content.toLowerCase().includes(gameState.palabraProhibida.toLowerCase())) {
        try {
            await message.delete();
            const aviso = await message.channel.send(`⚠️ <@${userId}> dijo la palabra prohibida impuesta por la Bruja.`);
            setTimeout(() => aviso.delete().catch(() => {}), 5000);
        } catch (e) {}
    }

    try {
        let userData = await ErisUser.findOne({ userId, guildId });
        if (!userData) userData = new ErisUser({ userId, guildId });

        const hoy = new Date();
        const hoyFecha = hoy.toLocaleDateString("es-GT", { timeZone: "America/Guatemala" });
        const ultimaFecha = userData.ultimaActividad ? new Date(userData.ultimaActividad).toLocaleDateString("es-GT", { timeZone: "America/Guatemala" }) : null;

        if (hoyFecha !== ultimaFecha) {
            userData.diasActivos += 1;
            userData.ultimaActividad = hoy;

            // Obtener canales de texto del servidor actual de manera dinámica
            const canalesServidor = message.guild.channels.cache.filter(c => c.isTextBased()).map(c => c.id);
            const canalesDisponibles = canalesServidor.filter(id => !userData.canalesDesbloqueados.includes(id));

            if (canalesDisponibles.length > 0) {
                const canalRandomId = canalesDisponibles[Math.floor(Math.random() * canalesDisponibles.length)];
                const canalTarget = message.guild.channels.cache.get(canalRandomId);

                if (canalTarget) {
                    await canalTarget.permissionOverwrites.edit(userId, { ViewChannel: true }).catch(() => {});
                    userData.canalesDesbloqueados.push(canalRandomId);
                    await message.channel.send(`🔓 **¡NUEVO CANAL DESBLOQUEADO PARA <@${userId}>!** Por andar activo te ganaste acceso a un canal secreto :v`).catch(() => {});
                }
            }
        }
        await userData.save();
    } catch (err) {
        console.error('❌ Clavo al procesar actividad:', err);
    }
});

// ==========================================
// --- SECCIÓN 8: HANDLER DE COMANDOS SLASH ---
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, guildId, user, member, guild } = interaction;

    let gameState = await ErisGameState.findOne({ guildId }) || await ErisGameState.create({ guildId });

    if (gameState.comandosBloqueados && !member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '🚫 **LOS COMANDOS ESTÁN BLOQUEADOS TEMPORALMENTE EN TODO EL SERVER.**', ephemeral: true });
    }

    let userData = await ErisUser.findOne({ userId: user.id, guildId }) || await ErisUser.create({ userId: user.id, guildId });

    // A. /maldicion (BRUJAS)
    if (commandName === 'maldicion') {
        if (userData.rol !== 'BRUJA' && userData.rol !== 'DEMONIO') {
            return interaction.reply({ content: '❌ Vos no sos ninguna Bruja cerote.', ephemeral: true });
        }

        const tipo = options.getString('tipo');
        const victimaUser = options.getUser('victima');

        const costesAlma = { 
            susto: 1, apodo: 2, robo: 2, silenciar: 3, 
            spam: 3, llamada: 4, cero_comandos: 5, lista_negra: 5, acabar: 6 
        };
        const costo = esTormentaDeSangre() ? 0 : costesAlma[tipo];

        if (!esTormentaDeSangre() && userData.alma < costo) {
            return interaction.reply({ content: `❌ No tenés suficiente ALMA. Necesitás ${costo} de ALMA y tenés ${userData.alma}.`, ephemeral: true });
        }

        // RETENCIÓN EN BUFFER PARA EL DEMONIO
        const demonio = await ErisUser.findOne({ guildId, rol: 'DEMONIO' });
        if (demonio && userData.rol !== 'DEMONIO') {
            const idCmd = Math.random().toString(36).substring(7);
            const keyBuffer = `${guildId}_${idCmd}`;
            comandosPendientesDemonio.set(keyBuffer, {
                guildId,
                atacante: user.id,
                victima: victimaUser ? victimaUser.id : null,
                tipo,
                costo,
                texto: options.getString('texto')
            });

            try {
                const uDemonio = await client.users.fetch(demonio.userId);
                await uDemonio.send(`👹 **MALDICIÓN RETENIDA EN BUFFER (${guild.name}):**\nBruja: <@${user.id}>\nVíctima: ${victimaUser ? `<@${victimaUser.id}>` : 'N/A'}\nTipo: \`${tipo}\`\nUsa \`/demonio_panel id_comando:${idCmd} accion:[aprobar/denegar/revertir]\` en los próximos 45s.`);
            } catch (e) {}

            await interaction.reply({ content: '🔮 La maldición se está procesando en las sombras (Buffer de la Bruja activa)...', ephemeral: true });

            setTimeout(async () => {
                if (comandosPendientesDemonio.has(keyBuffer)) {
                    await ejecutarMaldicion(interaction, comandosPendientesDemonio.get(keyBuffer));
                    comandosPendientesDemonio.delete(keyBuffer);
                }
            }, 45000);
            return;
        }

        await ejecutarMaldicion(interaction, {
            guildId,
            atacante: user.id,
            victima: victimaUser ? victimaUser.id : null,
            tipo,
            costo,
            texto: options.getString('texto')
        });
    }

    // B. /demonio_panel (DEMONIO)
        if (commandName === 'demonio_panel') {
        if (userData.rol !== 'DEMONIO') {
            return interaction.reply({ content: '❌ Solo el Demonio titiritero puede usar este panel.', ephemeral: true });
        }

        const idCmd = options.getString('id_comando');
        const accion = options.getString('accion');
        const keyBuffer = `${guildId}_${idCmd}`;

        if (!comandosPendientesDemonio.has(keyBuffer)) {
            return interaction.reply({ content: '❌ Esa maldición ya expiró o fue procesada.', ephemeral: true });
        }

        const cmdData = comandosPendientesDemonio.get(keyBuffer);
        comandosPendientesDemonio.delete(keyBuffer);

        if (accion === 'denegar') {
            return interaction.reply({ content: '🚫 Cancelaste la maldición de la Bruja en secreto.', ephemeral: true });
        }

        if (accion === 'revertir') {
            cmdData.victima = cmdData.atacante;
            await ejecutarMaldicion(interaction, cmdData);
            return interaction.reply({ content: '🔄 Revertiste la maldición contra la misma Bruja jajaja.', ephemeral: true });
        }

        await ejecutarMaldicion(interaction, cmdData);
        return interaction.reply({ content: '✅ Maldición aprobada y ejecutada.', ephemeral: true });
    }

    // C. /ejecutar (VERDUGO)
    if (commandName === 'ejecutar') {
        if (userData.rol !== 'VERDUGO') {
            return interaction.reply({ content: '❌ Vos no sos el Verdugo.', ephemeral: true });
        }

        if (userData.verdugoCastigadoHasta && userData.verdugoCastigadoHasta > new Date()) {
            return interaction.reply({ content: '❌ Estás castigado como Pana común por haber ejecutado a un inocente.', ephemeral: true });
        }

        if (!esHoraDeLaBruja()) {
            return interaction.reply({ content: '❌ El Verdugo solo puede actuar durante la **Hora de la Bruja** (6:00 PM a 7:00 PM GT).', ephemeral: true });
        }

        const sospechoso = options.getUser('sospechoso');
        const sospechosoData = await ErisUser.findOne({ userId: sospechoso.id, guildId });

        if (sospechosoData && (sospechosoData.rol === 'BRUJA' || sospechosoData.rol === 'DEMONIO')) {
            gameState.brujasCazadas += 1;
            gameState.diasSinCazar = 0;
            await gameState.save();

            await ErisUser.updateOne({ userId: sospechoso.id, guildId }, { rol: 'ESPECTRO' });

            await interaction.reply(`🗡️ **¡EL VERDUGO HA EJECUTADO A UNA BRUJA DE VERDAD!**\n<@${sospechoso.id}> era una Bruja y ha muerto. Progreso del Pueblo: **${gameState.brujasCazadas}/6 Brujas Cazadas**.`);

            if (gameState.brujasCazadas >= 6) {
                gameState.juegoActivo = false;
                await gameState.save();
                return interaction.followUp('🏆 **¡EL PUEBLO HA GANADO EL JUEGO! Han cazado a las 6 Brujas.**');
            }
        } else {
            const castigo = new Date();
            castigo.setDate(castigo.getDate() + 2);

            userData.verdugoCastigadoHasta = castigo;
            userData.rol = 'PANA';
            await userData.save();

            const memberVictima = await interaction.guild.members.fetch(sospechoso.id).catch(() => null);
            if (memberVictima) await memberVictima.timeout(24 * 60 * 60 * 1000, "Error del Verdugo").catch(() => {});

            await interaction.reply(`🤡 **¡EL VERDUGO SE EQUIVOCÓ!** <@${sospechoso.id}> era un inocente. El inocente queda silenciado 1 día y el Verdugo pierde sus poderes 2 días.`);
        }
    }

    // D. /proteger (CURA)
    if (commandName === 'proteger') {
        if (userData.rol !== 'CURA') {
            return interaction.reply({ content: '❌ Vos no sos el Cura.', ephemeral: true });
        }

        if (userData.escudosUsadosHoy >= 2) {
            return interaction.reply({ content: '❌ Ya usaste tus 2 escudos de hoy.', ephemeral: true });
        }

        const objetivo = options.getUser('usuario');
        let objetivoData = await ErisUser.findOne({ userId: objetivo.id, guildId }) || await ErisUser.create({ userId: objetivo.id, guildId });

        const tresHoras = new Date(Date.now() + 3 * 60 * 60 * 1000);
        objetivoData.escudoHasta = tresHoras;

        if (objetivoData.rol === 'BRUJA' || objetivoData.rol === 'DEMONIO') {
            objetivoData.esEscudoBruja = true;
        }

        await objetivoData.save();

        userData.escudosUsadosHoy += 1;
        await userData.save();

        return interaction.reply(`✨ **<@${objetivo.id}> ha sido bendecido con un escudo sagrado de 3 horas.**`);
    }

    // E. /maldicion_espectro (ESPECTRO)
    if (commandName === 'maldicion_espectro') {
        if (userData.rol !== 'ESPECTRO') {
            return interaction.reply({ content: '❌ Solo los Espectros colgados pueden usar este poder.', ephemeral: true });
        }

        const tipo = options.getString('tipo');
        const victima = options.getUser('victima');

        if (tipo === 'profanar') {
            const member = await interaction.guild.members.fetch(victima.id).catch(() => null);
            await interaction.channel.send({
                content: `👻 **[PROFANACIÓN DE IDENTIDAD]** <@${victima.id}> dice: "${options.getString('texto') || 'Auxilio cerotes'}"`,
                avatarURL: member ? member.user.displayAvatarURL() : null
            });
            return interaction.reply({ content: '🎭 Identidad profanada en el chat.', ephemeral: true });
        }

        return interaction.reply(`👻 El Espectro ha lanzado un susto sobre <@${victima.id}>.`);
    }

    // F. /voltear_voto (LA VOZ)
    if (commandName === 'voltear_voto') {
        if (userData.rol !== 'VOZ') {
            return interaction.reply({ content: '❌ Solo La Voz puede alterar el juicio.', ephemeral: true });
        }

        vozIntervino = true;
        const salvar = options.getUser('salvar');
        return interaction.reply(`🎙️ **LA VOZ HA HABLADO:** <@${salvar.id}> ha sido salvado d la pira d último segundo.`);
    }

    // G. /horca (GENERAL)
    if (commandName === 'horca') {
        if (!votacionAbierta) {
            return interaction.reply({ content: '❌ La horca no está abierta en este momento.', ephemeral: true });
        }

        if (usuariosQueVotaron.includes(user.id)) {
            return interaction.reply({ content: '❌ Ya votaste cerote.', ephemeral: true });
        }

        const sospechoso = options.getUser('sospechoso');
        registroVotos[sospechoso.id] = (registroVotos[sospechoso.id] || 0) + 1;
        usuariosQueVotaron.push(user.id);

        return interaction.reply(`🔥 **${user.username}** votó para mandar a la pira a <@${sospechoso.id}>.`);
    }

    // H. /pedir_a_eris (ADMINISTRACIÓN UNIVERSAL)
    if (commandName === 'pedir_a_eris') {
        if (!member.permissions.has(PermissionFlagsBits.Administrator) && user.id !== guild.ownerId) {
            return interaction.reply({ content: '❌ ¿Qué querés vos pisado? Solo los Administradores de este servidor pueden usar esto.', ephemeral: true });
        }

        const accion = options.getString('accion');
        const canalDestino = options.getChannel('canal') || interaction.channel;
        const textoInput = options.getString('texto');
        const objetivo = options.getMember('objetivo');
        const rolInput = options.getRole('rol');

        try {
            if (accion === 'decir') {
                if (!textoInput) {
                    return interaction.reply({ content: '❌ Tenés que escribir el mensaje en el campo `texto`.', ephemeral: true });
                }
                await canalDestino.send(textoInput);
                return interaction.reply({ content: '📝 Mensaje enviado con éxito.', ephemeral: true });

            } else if (accion === 'limpiar') {
                await canalDestino.bulkDelete(10, true).catch(() => {});
                return interaction.reply({ content: '🧹 Mensajes limpiados.', ephemeral: true });

            } else if (accion === 'rol') {
                if (!objetivo || !rolInput) {
                    return interaction.reply({ content: '❌ Tenés que seleccionar el `objetivo` (usuario) y el `rol`.', ephemeral: true });
                }
                if (objetivo.roles.cache.has(rolInput.id)) {
                    await objetivo.roles.remove(rolInput.id);
                    return interaction.reply({ content: `✅ Se le quitó el rol **${rolInput.name}** a <@${objetivo.id}>.`, ephemeral: true });
                } else {
                    await objetivo.roles.add(rolInput.id);
                    return interaction.reply({ content: `✅ Se le asignó el rol **${rolInput.name}** a <@${objetivo.id}> nitidazo.`, ephemeral: true });
                }

            } else if (accion === 'apodo') {
                if (!objetivo || !textoInput) {
                    return interaction.reply({ content: '❌ Tenés que seleccionar el `objetivo` y escribir el nuevo apodo en `texto`.', ephemeral: true });
                }
                await objetivo.setNickname(textoInput);
                return interaction.reply({ content: `✏️ Apodo de <@${objetivo.id}> cambiado a **${textoInput}**.`, ephemeral: true });

            } else if (accion === 'mutear') {
                if (!objetivo) {
                    return interaction.reply({ content: '❌ Tenés que seleccionar el `objetivo`.', ephemeral: true });
                }
                await objetivo.timeout(60 * 60 * 1000, 'Muteado por ERIS Staff');
                return interaction.reply({ content: `🔇 <@${objetivo.id}> muteado por 1 hora.`, ephemeral: true });
            }
        } catch (err) {
            console.error("❌ Error en pedir_a_eris:", err);
            return interaction.reply({ content: `❌ Clavo al ejecutar la acción: ${err.message}. Asegurate de que el rol de ERIS esté más ARRIBA que los demás roles.`, ephemeral: true });
        }
    }
});

// ==========================================
// --- SECCIÓN 9: EJECUTOR COMPLETO DE MALDICIONES ---
// ==========================================
async function ejecutarMaldicion(interaction, cmdData) {
    const { guildId, atacante, victima, tipo, costo, texto } = cmdData;
    const guild = interaction.guild;

    const atacanteData = await ErisUser.findOne({ userId: atacante, guildId });
    const victimaData = victima ? await ErisUser.findOne({ userId: victima, guildId }) : null;

    if (!esTormentaDeSangre() && atacanteData) {
        atacanteData.alma = Math.max(0, atacanteData.alma - costo);
        await atacanteData.save();
    }

    if (atacanteData && (atacanteData.rol === 'BRUJA' || atacanteData.rol === 'DEMONIO') && atacanteData.esEscudoBruja) {
        await ErisUser.updateMany({ guildId }, { $set: { escudoHasta: null, esEscudoBruja: false } });
        await interaction.channel.send('💥 **¡LA BRUJA ATACÓ TENIENDO ESCUDO DEL CURA! TODOS LOS ESCUDOS SAGRADOS SE HAN ROTO EN EL SERVIDOR.**').catch(() => {});
    }

    if (victimaData && victimaData.escudoHasta && victimaData.escudoHasta > new Date()) {
        const rebota = Math.random() < 0.5;
        if (rebota) {
            await interaction.channel.send(`🪞 **¡EL ESCUDO DEL CURA REFLEJÓ LA MALDICIÓN!** La maldición rebotó d regreso a <@${atacante}>.`).catch(() => {});
            return;
        }
    }

    const memberVictima = victima ? await guild.members.fetch(victima).catch(() => null) : null;
    let gameState = await ErisGameState.findOne({ guildId });

    // 1. SUSTO
    if (tipo === 'susto') {
        await interaction.channel.send(`ghost **¡LA MALDICIÓN CAYÓ SOBRE <@${victima}>!** Sentís un escalofrío en las nalgas :v`).catch(() => {});
    } 
    // 2. APODO
    else if (tipo === 'apodo' && memberVictima) {
        await memberVictima.setNickname(texto || 'Maje Maldito').catch(() => {});
        await interaction.channel.send(`🏷️ **¡APODO CAMBIADO!** <@${victima}> ahora c llama **${texto || 'Maje Maldito'}**.`);
    } 
    // 3. ROBO DE ALMA / XP
    else if (tipo === 'robo' && victimaData) {
        const robado = 200;
        victimaData.xp = Math.max(0, victimaData.xp - robado);
        await victimaData.save();
        await interaction.channel.send(`⚔️ **¡ROBO COMPLETO!** <@${atacante}> le robó XP a <@${victima}> alv.`);
    } 
    // 4. BOZAL (SILENCIAR 1 HORA)
    else if (tipo === 'silenciar' && memberVictima) {
        await memberVictima.timeout(60 * 60 * 1000, "Maldición de ERIS").catch(() => {});
        await interaction.channel.send(`🤐 **¡BOZAL PUESTO!** <@${victima}> quedó silenciado 1 hora alv.`);
    } 
    // 5. SPAM MASIVO EN MD
    else if (tipo === 'spam' && memberVictima) {
        await interaction.channel.send(`🔥 **¡SPAM EN MD DESATADO SOBRE <@${victima}>!**`);
        for (let i = 0; i < 5; i++) {
            await memberVictima.send(`🔥 **ERIS TIENE EL CONTROL D TU ALMA en ${guild.name}:** Cuidado con las brujas alv :v`).catch(() => {});
        }
    } 
    // 6. LLAMADA TERRORÍFICA (DEAFEN EN VOZ)
    else if (tipo === 'llamada' && memberVictima) {
        if (memberVictima.voice && memberVictima.voice.channel) {
            await memberVictima.voice.setDeaf(true, "Llamada Terrorífica").catch(() => {});
            setTimeout(() => memberVictima.voice.setDeaf(false).catch(() => {}), 5 * 60 * 1000);
            await interaction.channel.send(`📞 **¡LLAMADA TERRORÍFICA ACTIVADA!** <@${victima}> quedó ensordecido en voz por 5 minutos.`);
        } else {
            await interaction.channel.send(`📞 <@${victima}> no está en ningún canal de voz p ensordecerlo.`);
        }
    } 
    // 7. CERO COMANDOS EN TODO EL SERVER
    else if (tipo === 'cero_comandos') {
        if (gameState) {
            gameState.comandosBloqueados = true;
            await gameState.save();
            setTimeout(async () => {
                gameState.comandosBloqueados = false;
                await gameState.save();
            }, 15 * 60 * 1000);
        }
        await interaction.channel.send('🚫 **¡LA BRUJA BLOQUEÓ TODOS LOS COMANDOS EN EL SERVER POR 15 MINUTOS!**');
    } 
    // 8. LISTA NEGRA DE PALABRAS
    else if (tipo === 'lista_negra') {
        if (gameState) {
            gameState.palabraProhibida = texto || 'cerote';
            await gameState.save();
        }
        await interaction.channel.send(`🖤 **¡NUEVA PALABRA PROHIBIDA ESTABLECIDA!** La palabra es **"${texto || 'cerote'}"**.`);
    } 
    // 9. ACABAR (SPAM APOCALÍPTICO)
    else if (tipo === 'acabar') {
        await interaction.channel.send('💥 **¡DESATANDO EL APOCALIPSIS DE SPAM EN TODOS LOS CANALES!**');
        guild.channels.cache.forEach(async (canal) => {
            if (canal.isTextBased()) {
                await canal.send(`🔥 **¡ERIS HA TOMADO EL CONTROL DEL SERVIDOR!** ${texto || '¡MUERTE AL PUEBLO!'}`).catch(() => {});
            }
        });
    }
}

// ==========================================
// --- SECCIÓN 10: INICIO DE SESIÓN ---
// ==========================================
client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);
                
