const express = require('express');
const router = express.Router();

// Rutas básicas para likes
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Router de likes funcionando',
        data: []
    });
});

router.post('/crear', (req, res) => {
    res.json({
        success: true,
        message: 'Endpoint para crear likes - En desarrollo'
    });
});

router.get('/lista', (req, res) => {
    res.json({
        success: true,
        message: 'Lista de likes - En desarrollo',
        data: []
    });
});

module.exports = router;