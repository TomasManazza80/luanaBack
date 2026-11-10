const whatsappService = require('../services/QrService/QrService');

const DEFAULT_BEAUTY_TEMPLATE = "¡Hola {{patient_name}}! ✨💅\n\nTe escribimos de nuestro Salón de Belleza para confirmar tu turno de {{service}}.\n\n📅 Fecha: {{date}}\n⏰ Hora: {{time}} hs\n💖 Especialista: {{professional_name}}\n\nPor favor, en caso de no poder asistir te pedimos avisarnos con al menos 24 horas de anticipación.\n\n¡Te esperamos para mimarte! 🌸";

let customTemplate = DEFAULT_BEAUTY_TEMPLATE;
const templatesByProf = new Map();

const isClinicTemplate = (tpl) => {
    if (!tpl) return true;
    return tpl.includes('Centro Kinesiológico') || tpl.includes('Hola {paciente}, te recordamos tu turno para {servicio}');
};

const getTemplateForProf = async (profId) => {
    const numId = parseInt(profId);
    if (!isNaN(numId)) {
        try {
            const { AppDataSource } = await import('../server/database.js');
            if (AppDataSource.isInitialized) {
                const userRepo = AppDataSource.getRepository('User');
                const user = await userRepo.findOne({ where: { id: numId } });
                const dbTpl = user?.whatsapp_creation_template;
                if (dbTpl && !isClinicTemplate(dbTpl)) {
                    return dbTpl;
                }
            }
        } catch (e) {}
        if (templatesByProf.has(String(numId))) {
            return templatesByProf.get(String(numId));
        }
    }
    return isClinicTemplate(customTemplate) ? DEFAULT_BEAUTY_TEMPLATE : customTemplate;
};

const getWhatsappStatus = async (req, res) => {
    try {
        const profId = req.query.prof_id || 'default';
        const data = whatsappService.getStatus();
        const template = await getTemplateForProf(profId);

        res.status(200).json({
            ...data,
            status: data.isConnected ? 'connected' : (data.status || 'disconnected'),
            connectedDevices: typeof data.connectedDevices === 'number' ? data.connectedDevices : (data.isConnected ? 1 : 0),
            deviceInfo: data.deviceInfo || null,
            template,
            profId
        });
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo estado de WhatsApp' });
    }
};

const restartWhatsapp = async (req, res) => {
    try {
        await whatsappService.restart();
        const data = whatsappService.getStatus();
        res.status(200).json({ message: 'Reiniciando...', ...data });
    } catch (error) {
        res.status(500).json({ error: 'Error al reiniciar' });
    }
};

const startWhatsapp = async (req, res) => {
    try {
        await whatsappService.restart();
        const data = whatsappService.getStatus();
        res.status(200).json({
            message: 'Iniciando WhatsApp...',
            status: data.qr ? 'qr' : 'loading',
            qr: data.qr || null,
            connectedDevices: data.connectedDevices || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar WhatsApp' });
    }
};

const disconnectWhatsapp = async (req, res) => {
    try {
        await whatsappService.disconnect();
        await whatsappService.cleanupAuth();
        res.status(200).json({ message: 'Desconectado de WhatsApp', status: 'disconnected', connectedDevices: 0 });
    } catch (error) {
        res.status(500).json({ error: 'Error al desconectar' });
    }
};

const saveTemplate = async (req, res) => {
    try {
        const { template, prof_id } = req.body || {};
        if (template !== undefined) {
            customTemplate = template;
            if (prof_id) {
                templatesByProf.set(String(prof_id), template);
                const numId = parseInt(prof_id);
                if (!isNaN(numId)) {
                    try {
                        const { AppDataSource } = await import('../server/database.js');
                        if (AppDataSource.isInitialized) {
                            const userRepo = AppDataSource.getRepository('User');
                            await userRepo.update(numId, {
                                whatsapp_creation_template: template,
                                whatsapp_connected: true
                            });
                        }
                    } catch (e) {}
                }
            }
        }
        res.status(200).json({ message: 'Plantilla guardada', template: template || customTemplate });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la plantilla' });
    }
};

const sendWhatsappMessage = async (req, res) => {
    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({ error: 'Se requieren los campos phone y message' });
    }

    try {
        const result = await whatsappService.sendMessage(phone, message);
        res.status(200).json(result);
    } catch (error) {
        if (error.message === 'WHATSAPP_NOT_CONNECTED') {
            return res.status(503).json({
                error: 'WhatsApp no está conectado. Escanee el QR primero.',
                code: 'WHATSAPP_NOT_CONNECTED'
            });
        }
        console.error('[WhatsApp] Error al enviar mensaje:', error);
        res.status(500).json({ error: 'Error interno al enviar el mensaje' });
    }
};

module.exports = { 
    getWhatsappStatus, 
    restartWhatsapp,
    startWhatsapp,
    disconnectWhatsapp,
    saveTemplate,
    sendWhatsappMessage
};