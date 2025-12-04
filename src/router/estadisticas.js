// router/estadisticas.js - Rutas para gestión de estadísticas siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllEstadisticas, mostrarEstadisticas, createEstadistica, mandarEstadistica, getById, update, delete: deleteEstadistica } = require('../controller/estadisticasController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllEstadisticas);           // Lista de estadísticas (ORM)
router.get('/mostrar', mostrarEstadisticas);        // Mostrar estadísticas (SQL directo)
router.get('/buscar/:id', getById);                 // Buscar estadística específica
router.get('/mandar/:id', mandarEstadistica);       // Mandar/enviar estadística
router.post('/crear', createEstadistica);           // Crear nueva estadística
router.put('/actualizar/:id', update);             // Actualizar estadística
router.delete('/eliminar/:id', deleteEstadistica); // Eliminar estadística

// Rutas de compatibilidad (mantener funcionalidad existente)
router.get('/', getAllEstadisticas);
router.get('/:id', getById);
router.post('/', createEstadistica);
router.put('/:id', update);
router.delete('/:id', deleteEstadistica);

module.exports = router;
