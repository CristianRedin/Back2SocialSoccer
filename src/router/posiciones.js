// Router para posiciones - Manejo de rutas de tabla de posiciones y puntuaciones
const express = require('express');
const router = express.Router();
const { getAllPosiciones, mostrarPosiciones, createPosicion, mandarPosicion, getById, update, delete: deletePosicion } = require('../controller/posicionesController');

// Rutas principales de posiciones
router.get('/lista', getAllPosiciones);           // GET /posiciones/lista - Obtener todas las posiciones (ORM)
router.get('/mostrar', mostrarPosiciones);        // GET /posiciones/mostrar - Mostrar posiciones (SQL directo)
router.get('/buscar/:id', getById);               // GET /posiciones/buscar/:id - Buscar posición por ID
router.get('/mandar/:id', mandarPosicion);        // GET /posiciones/mandar/:id - Mandar posición específica
router.post('/crear', createPosicion);            // POST /posiciones/crear - Crear nueva posición
router.put('/actualizar/:id', update);            // PUT /posiciones/actualizar/:id - Actualizar posición
router.delete('/eliminar/:id', deletePosicion);  // DELETE /posiciones/eliminar/:id - Eliminar posición

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
