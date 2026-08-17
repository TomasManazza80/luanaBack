const express = require('express');
const router = express.Router();
const HomeContentConfig = require('../models/config/homeContentConfig');

// GET /api/home-content -> Obtener contenido configurado del Home
router.get('/', async (req, res) => {
    try {
        const config = await HomeContentConfig.findOne({ order: [['id', 'DESC']] });
        if (!config || !config.content) {
            return res.json({ content: null });
        }
        res.json({ content: config.content });
    } catch (error) {
        console.error("Error al obtener contenido del Home:", error);
        res.status(500).json({ error: "Error interno del servidor al obtener contenido del Home" });
    }
});

// POST /api/home-content -> Guardar/Actualizar contenido configurado del Home
router.post('/', async (req, res) => {
    try {
        const { content } = req.body;
        if (!content) {
            return res.status(400).json({ error: "Contenido requerido" });
        }
        let config = await HomeContentConfig.findOne();
        if (!config) {
            config = await HomeContentConfig.create({ content });
        } else {
            await config.update({ content });
        }
        res.json({ message: "Contenido de inicio guardado correctamente en la base de datos", content: config.content });
    } catch (error) {
        console.error("Error al guardar contenido del Home:", error);
        res.status(500).json({ error: "Error interno del servidor al guardar contenido del Home" });
    }
});

module.exports = router;
