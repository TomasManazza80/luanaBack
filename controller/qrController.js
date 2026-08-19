const whatsappService = require('../services/QrService/QrService');

let customTemplate = "Hola {paciente}, te recordamos tu turno para {servicio} el día {fecha} a las {hora} hs.";

const getWhatsappStatus = (req, res) => {
    const data = whatsappService.getStatus();
    res.status(200).json({
        ...data,
        status: data.status || (data.isConnected ? 'connected' : 'disconnected'),
        template: customTemplate,
        profId: req.query.prof_id || 'default'
    });
};

const restartWhatsapp = async (req, res) => {
    try {
        await whatsappService.restart();
        res.status(200).json({ message: 'Reiniciando...' });
    } catch (error) {
        res.status(500).json({ error: 'Error al reiniciar' });
    }
};

const startWhatsapp = async (req, res) => {
    try {
        await whatsappService.restart();
        res.status(200).json({ message: 'Iniciando WhatsApp...', status: 'loading' });
    } catch (error) {
        res.status(500).json({ error: 'Error al iniciar WhatsApp' });
    }
};

const disconnectWhatsapp = async (req, res) => {
    try {
        await whatsappService.disconnect();
        await whatsappService.cleanupAuth();
        res.status(200).json({ message: 'Desconectado de WhatsApp' });
    } catch (error) {
        res.status(500).json({ error: 'Error al desconectar' });
    }
};

const saveTemplate = async (req, res) => {
    try {
        if (req.body && req.body.template) {
            customTemplate = req.body.template;
        }
        res.status(200).json({ message: 'Plantilla guardada', template: customTemplate });
    } catch (error) {
        res.status(500).json({ error: 'Error al guardar la plantilla' });
    }
};

module.exports = { 
    getWhatsappStatus, 
    restartWhatsapp,
    startWhatsapp,
    disconnectWhatsapp,
    saveTemplate
};