const express = require('express');
const router = express.Router();

// Rutas básicas para goles
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de goles funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear goles - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de goles - En desarrollo',
        data: []
    });
});

module.exports = router;