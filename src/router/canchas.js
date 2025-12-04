const express = require('express');
const router = express.Router();
const { getAllCanchas, mostrarCanchas, createCancha, mandarCancha, getById, update, delete: deleteCancha } = require('../controller/canchasController');

// Rutas descriptivas para Canchas
router.get('/lista', getAllCanchas);           // Lista básica con ORM
router.get('/mostrar', mostrarCanchas);        // Vista completa con SQL + estadísticas
router.get('/buscar/:id', getById);            // Buscar por ID
router.get('/mandar/:id', mandarCancha);       // Mandar con encriptación
router.post('/crear', createCancha);           // Crear nueva
router.put('/actualizar/:id', update);         // Actualizar existente
router.delete('/eliminar/:id', deleteCancha); // Eliminar (lógico)

// Rutas de compatibilidad (mantienen funcionalidad anterior)

module.exports = router;
