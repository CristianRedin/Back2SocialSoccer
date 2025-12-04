// Router para players - Manejo de rutas de jugadores del sistema
const express = require('express');
const router = express.Router();
const { 
  getAllPlayers, 
  mostrarPlayers, 
  createPlayer, 
  mandarPlayer, 
  getById, 
  update, 
  delete: deletePlayer,
  // Funciones de PlayerStats integradas
  getPlayerStats,
  createPlayerStats,
  updatePlayerStats,
  getPlayerWithStats,
  addInjury
} = require('../controller/playersController');

// Rutas principales de jugadores
router.get('/lista', getAllPlayers);           // GET /players/lista - Obtener todos los jugadores (ORM)
router.get('/mostrar', mostrarPlayers);        // GET /players/mostrar - Mostrar jugadores CON estadísticas
router.get('/buscar/:id', getById);            // GET /players/buscar/:id - Buscar jugador por ID
router.get('/mandar/:id', mandarPlayer);       // GET /players/mandar/:id - Mandar jugador específico
router.post('/crear', createPlayer);           // POST /players/crear - Crear nuevo jugador + estadísticas
router.put('/actualizar/:id', update);         // PUT /players/actualizar/:id - Actualizar jugador
router.delete('/eliminar/:id', deletePlayer); // DELETE /players/eliminar/:id - Eliminar jugador

// Rutas para PlayerStats (estadísticas integradas)
router.get('/stats/:playerId', getPlayerStats);              // GET /players/stats/:playerId - Estadísticas de un jugador
router.get('/completo/:playerId', getPlayerWithStats);       // GET /players/completo/:playerId - Jugador + todas sus estadísticas
router.post('/stats/crear', createPlayerStats);              // POST /players/stats/crear - Crear estadísticas manuales
router.put('/stats/actualizar/:statsId', updatePlayerStats); // PUT /players/stats/actualizar/:statsId - Actualizar estadísticas
router.post('/lesion/:playerId/:temporada', addInjury);      // POST /players/lesion/:playerId/:temporada - Agregar lesión

// Rutas de compatibilidad (mantener funcionalidad existente)


module.exports = router;
