// router/detalleJugadores.js - Rutas para gestión de detalle jugadores siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllDetalleJugadores, mostrarDetalleJugadores, createDetalleJugador, mandarDetalleJugador, getById, update, delete: deleteDetalleJugador } = require('../controller/detalleJugadoresController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllDetalleJugadores);            // Lista de detalle jugadores (ORM)
router.get('/mostrar', mostrarDetalleJugadores);         // Mostrar detalle jugadores (SQL directo)
router.get('/buscar/:id', getById);                      // Buscar detalle jugador específico
router.get('/mandar/:id', mandarDetalleJugador);         // Mandar/enviar detalle jugador
router.post('/crear', createDetalleJugador);             // Crear nuevo detalle jugador
router.put('/actualizar/:id', update);                  // Actualizar detalle jugador
router.delete('/eliminar/:id', deleteDetalleJugador);   // Eliminar detalle jugador

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
