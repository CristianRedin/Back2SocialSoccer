// router/division.js - Rutas para gestión de divisiones siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllDivisiones, mostrarDivisiones, createDivision, mandarDivision, getById, update, delete: deleteDivision } = require('../controller/divisionController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllDivisiones);           // Lista de divisiones (ORM)
router.get('/mostrar', mostrarDivisiones);        // Mostrar divisiones (SQL directo)
router.get('/buscar/:id', getById);               // Buscar división específica
router.get('/mandar/:id', mandarDivision);        // Mandar/enviar división
router.post('/crear', createDivision);            // Crear nueva división
router.put('/actualizar/:id', update);           // Actualizar división
router.delete('/eliminar/:id', deleteDivision);  // Eliminar división

// Rutas de compatibilidad (mantener funcionalidad existente)


module.exports = router;
