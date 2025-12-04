// router/inscripcionesTorneo.js - Rutas para gestión de inscripciones a torneos siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllInscripciones, mostrarInscripciones, createInscripcion, mandarInscripcion, getById, update, delete: deleteInscripcion } = require('../controller/inscripcionesTorneoController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllInscripciones);           // Lista de inscripciones (ORM)
router.get('/mostrar', mostrarInscripciones);        // Mostrar inscripciones (SQL directo)
router.get('/buscar/:id', getById);                  // Buscar inscripción específica
router.get('/mandar/:id', mandarInscripcion);        // Mandar/enviar inscripción
router.post('/crear', createInscripcion);            // Crear nueva inscripción
router.put('/actualizar/:id', update);              // Actualizar inscripción
router.delete('/eliminar/:id', deleteInscripcion);  // Eliminar inscripción

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
