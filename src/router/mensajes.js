const express = require('express');
const router = express.Router();

// Rutas básicas para mensajes
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de mensajes funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear mensajes - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de mensajes - En desarrollo',
        data: []
    });
});

module.exports = router;