const express = require('express');
const router = express.Router();
const { getAllDetalleDivision, mostrarDetalleDivision, createDetalleDivision, mandarDetalleDivision, getById, update, delete: deleteDetalleDivision } = require('../controller/detalleDivisionController');

// Rutas descriptivas para Detalle División
router.get('/lista', getAllDetalleDivision);           // Lista básica con ORM
router.get('/mostrar', mostrarDetalleDivision);        // Vista completa con SQL + JOIN
router.get('/buscar/:id', getById);                    // Buscar por ID
router.get('/mandar/:id', mandarDetalleDivision);      // Mandar con encriptación
router.post('/crear', createDetalleDivision);          // Crear nuevo
router.put('/actualizar/:id', update);                 // Actualizar existente
router.delete('/eliminar/:id', deleteDetalleDivision); // Eliminar (lógico)

// Rutas de compatibilidad (mantienen funcionalidad anterior)

module.exports = router;
