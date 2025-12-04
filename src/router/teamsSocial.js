const express = require('express');
const router = express.Router();

// Rutas básicas para teams social
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de teams social funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear teams social - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de teams social - En desarrollo',
        data: []
    });
});

module.exports = router;