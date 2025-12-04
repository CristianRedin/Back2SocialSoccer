// Router para referees - Manejo de rutas de árbitros del sistema
const express = require('express');
const router = express.Router();
const { getAllReferees, mostrarReferees, createReferee, mandarReferee, getById, update, delete: deleteReferee } = require('../controller/refereesController');

// Rutas principales de árbitros
router.get('/lista', getAllReferees);           // GET /referees/lista - Obtener todos los árbitros (ORM)
router.get('/mostrar', mostrarReferees);        // GET /referees/mostrar - Mostrar árbitros (SQL directo)
router.get('/buscar/:id', getById);             // GET /referees/buscar/:id - Buscar árbitro por ID
router.get('/mandar/:id', mandarReferee);       // GET /referees/mandar/:id - Mandar árbitro específico
router.post('/crear', createReferee);           // POST /referees/crear - Crear nuevo árbitro
router.put('/actualizar/:id', update);          // PUT /referees/actualizar/:id - Actualizar árbitro
router.delete('/eliminar/:id', deleteReferee); // DELETE /referees/eliminar/:id - Eliminar árbitro

// Rutas de compatibilidad (mantener funcionalidad existente)
router.get('/', getAllReferees);
router.get('/:id', getById);
router.post('/', createReferee);
router.put('/:id', update);
router.delete('/:id', deleteReferee);

module.exports = router;
