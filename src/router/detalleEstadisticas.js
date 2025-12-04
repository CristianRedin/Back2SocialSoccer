// router/detalleEstadisticas.js - Rutas para gestión de detalle estadísticas siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllDetalleEstadisticas, mostrarDetalleEstadisticas, createDetalleEstadistica, mandarDetalleEstadistica, getById, update, delete: deleteDetalleEstadistica } = require('../controller/detalleEstadisticasController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllDetalleEstadisticas);             // Lista de detalle estadísticas (ORM)
router.get('/mostrar', mostrarDetalleEstadisticas);          // Mostrar detalle estadísticas (SQL directo)
router.get('/buscar/:id', getById);                          // Buscar detalle estadística específico
router.get('/mandar/:id', mandarDetalleEstadistica);         // Mandar/enviar detalle estadística
router.post('/crear', createDetalleEstadistica);             // Crear nuevo detalle estadística
router.put('/actualizar/:id', update);                      // Actualizar detalle estadística
router.delete('/eliminar/:id', deleteDetalleEstadistica);   // Eliminar detalle estadística

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
