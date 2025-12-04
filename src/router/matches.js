// router/matches.js - Rutas para gestión de partidos siguiendo patrón estándar
const express = require('express');
const router = express.Router();
const { 
  getAllMatches, 
  mostrarMatches, 
  createMatch, 
  mandarMatch, 
  getById, 
  update, 
  delete: deleteMatch,
  // Funciones de MatchEvents integradas
  getMatchEvents,
  getMatchWithEvents,
  addEvent,
  addComment,
  updateMatchInfo,
  getMatchSummary
} = require('../controller/matchesController');

// Rutas principales siguiendo el patrón estándar
router.get('/lista', getAllMatches);           // Lista de partidos (ORM)
router.get('/mostrar', mostrarMatches);        // Mostrar partidos CON eventos
router.get('/buscar/:id', getById);           // Buscar partido específico
router.get('/mandar/:id', mandarMatch);       // Mandar/enviar partido
router.post('/crear', createMatch);           // Crear nuevo partido + eventos
router.put('/actualizar/:id', update);       // Actualizar partido
router.delete('/eliminar/:id', deleteMatch); // Eliminar partido

// Rutas para MatchEvents (eventos integrados)
router.get('/eventos/:matchId', getMatchEvents);           // GET /matches/eventos/:matchId - Eventos de un partido
router.get('/completo/:matchId', getMatchWithEvents);      // GET /matches/completo/:matchId - Partido + todos sus eventos
router.get('/resumen/:matchId', getMatchSummary);          // GET /matches/resumen/:matchId - Resumen del partido
router.post('/evento/:matchId', addEvent);                 // POST /matches/evento/:matchId - Agregar evento
router.post('/comentario/:matchId', addComment);           // POST /matches/comentario/:matchId - Agregar comentario
router.put('/info/:matchId', updateMatchInfo);             // PUT /matches/info/:matchId - Actualizar clima/asistencia

// Rutas de compatibilidad (mantener funcionalidad existente)

module.exports = router;
