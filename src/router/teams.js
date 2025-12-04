// router/teams.js
const express = require('express');
const router = express.Router();
const teamsController = require('../controller/teamsController');

// Rutas principales CRUD
router.post('/create', teamsController.createTeam);
router.get('/all', teamsController.getAllTeams);
router.get('/mostrar', teamsController.mostrarTeams);
router.get('/estadisticas', teamsController.getGeneralStats);
router.get('/search', teamsController.searchTeams);
router.get('/encrypted/:id', teamsController.mandarTeam);
router.get('/:id', teamsController.getById);
router.put('/update/:id', teamsController.update);
router.delete('/delete/:id', teamsController.delete);

// Rutas específicas para contenido social
router.get('/social/:teamId', teamsController.getTeamSocial);
router.get('/complete/:teamId', teamsController.getTeamWithSocial);
router.post('/post/:teamId', teamsController.addPost);
router.put('/social-media/:teamId', teamsController.updateSocialMedia);
router.put('/followers/:teamId', teamsController.updateFollowers);
router.put('/like/:teamId/:postId', teamsController.likePost);
router.put('/info/:teamId', teamsController.updateTeamInfo);

module.exports = router;
