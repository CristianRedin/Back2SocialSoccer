const express = require('express');
const router = express.Router();
const { getAllAgendaEntrenamientos, mostrarAgendaEntrenamientos, createAgendaEntrenamientos, mandarAgendaEntrenamientos, getById, update, delete: deleteAgendaEntrenamientos } = require('../controller/agendaEntrenamientosController');

// Rutas descriptivas para Agenda de Entrenamientos
router.get('/lista', getAllAgendaEntrenamientos);           // Lista básica con ORM
router.get('/mostrar', mostrarAgendaEntrenamientos);        // Vista completa con SQL + equipo y estado temporal
router.get('/buscar/:id', getById);                         // Buscar por ID
router.get('/mandar/:id', mandarAgendaEntrenamientos);      // Mandar con encriptación
router.post('/crear', createAgendaEntrenamientos);          // Crear nueva
router.put('/actualizar/:id', update);                      // Actualizar existente
router.delete('/eliminar/:id', deleteAgendaEntrenamientos); // Eliminar (lógico)

// Rutas de compatibilidad (mantienen funcionalidad anterior)

module.exports = router;
