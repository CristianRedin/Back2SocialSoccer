// router/detalleResultados.js - Rutas para gestión de detalle resultados siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllDetalleResultados, mostrarDetalleResultados, createDetalleResultado, mandarDetalleResultado, getById, update, delete: deleteDetalleResultado } = require('../controller/detalleResultadosController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllDetalleResultados);             // Lista de detalle resultados (ORM)
router.get('/mostrar', mostrarDetalleResultados);          // Mostrar detalle resultados (SQL directo)
router.get('/buscar/:id', getById);                        // Buscar detalle resultado específico
router.get('/mandar/:id', mandarDetalleResultado);         // Mandar/enviar detalle resultado
router.post('/crear', createDetalleResultado);             // Crear nuevo detalle resultado
router.put('/actualizar/:id', update);                    // Actualizar detalle resultado
router.delete('/eliminar/:id', deleteDetalleResultado);   // Eliminar detalle resultado

// Rutas de compatibilidad (mantener funcionalidad existente)


module.exports = router;
