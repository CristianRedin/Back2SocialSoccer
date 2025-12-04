// router/torneos.js
const express = require('express');
const router = express.Router();
const torneosController = require('../controller/torneosController');

// Rutas principales CRUD
router.post('/create', torneosController.createTorneo);
router.get('/all', torneosController.getAllTorneos);
router.get('/mostrar', torneosController.mostrarTorneos);
router.get('/estadisticas', torneosController.getGeneralStats);
router.get('/search', torneosController.searchTorneos);
router.get('/encrypted/:id', torneosController.mandarTorneo);
router.get('/:id', torneosController.getById);
router.put('/update/:id', torneosController.update);
router.delete('/delete/:id', torneosController.delete);

// Rutas específicas para brackets y estructura de torneos
router.get('/brackets/:torneoId', torneosController.getTournamentBrackets);
router.get('/complete/:torneoId', torneosController.getTournamentWithBrackets);
router.post('/setup/:torneoId', torneosController.setupTournament);
router.post('/round/:torneoId', torneosController.addRound);
router.put('/match/:torneoId/:rondaIndex/:partidoIndex', torneosController.updateMatchResult);
router.put('/group/:torneoId/:grupoIndex', torneosController.updateGroupTable);
router.put('/prizes/:torneoId', torneosController.setPrizes);
router.post('/generate-brackets/:torneoId', torneosController.generateEliminationBrackets);

module.exports = router;
