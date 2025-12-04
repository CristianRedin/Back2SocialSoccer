// Router para resultados - Manejo de rutas de resultados de partidos
const express = require('express');
const router = express.Router();
const { getAllResultados, mostrarResultados, createResultado, mandarResultado, getById, update, delete: deleteResultado } = require('../controller/resultadosController');

// Rutas principales de resultados
router.get('/lista', getAllResultados);           // GET /resultados/lista - Obtener todos los resultados (ORM)
router.get('/mostrar', mostrarResultados);        // GET /resultados/mostrar - Mostrar resultados (SQL directo)
router.get('/buscar/:id', getById);               // GET /resultados/buscar/:id - Buscar resultado por ID
router.get('/mandar/:id', mandarResultado);       // GET /resultados/mandar/:id - Mandar resultado específico
router.post('/crear', createResultado);           // POST /resultados/crear - Crear nuevo resultado
router.put('/actualizar/:id', update);            // PUT /resultados/actualizar/:id - Actualizar resultado
router.delete('/eliminar/:id', deleteResultado); // DELETE /resultados/eliminar/:id - Eliminar resultado

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
