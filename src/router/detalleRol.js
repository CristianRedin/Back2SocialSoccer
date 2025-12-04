// router/detalleRol.js - Rutas para gestión de detalle roles siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { getAllDetalleRoles, mostrarDetalleRoles, createDetalleRol, mandarDetalleRol, getById, update, delete: deleteDetalleRol } = require('../controller/detalleRolController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllDetalleRoles);           // Lista de detalle roles (ORM)
router.get('/mostrar', mostrarDetalleRoles);        // Mostrar detalle roles (SQL directo)
router.get('/buscar/:id', getById);                 // Buscar detalle rol específico
router.get('/mandar/:id', mandarDetalleRol);        // Mandar/enviar detalle rol
router.post('/crear', createDetalleRol);            // Crear nuevo detalle rol
router.put('/actualizar/:id', update);             // Actualizar detalle rol
router.delete('/eliminar/:id', deleteDetalleRol);  // Eliminar detalle rol

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
