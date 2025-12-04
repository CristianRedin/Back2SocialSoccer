const express = require('express');
const router = express.Router();

// Rutas básicas para notificaciones
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de notificaciones funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear notificaciones - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de notificaciones - En desarrollo',
        data: []
    });
});

module.exports = router;