const express = require('express');
const router = express.Router();

// Rutas básicas para preferencias de usuario
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de preferencias de usuario funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear preferencias - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de preferencias - En desarrollo',
        data: []
    });
});

module.exports = router;