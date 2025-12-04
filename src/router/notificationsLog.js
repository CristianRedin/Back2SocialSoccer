const express = require('express');
const router = express.Router();

// Rutas básicas para log de notificaciones
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de log notificaciones funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear log notificaciones - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de log notificaciones - En desarrollo',
        data: []
    });
});

module.exports = router;