// router/tarjetas.js
const express = require('express');
const router = express.Router();
const tarjetasController = require('../controller/tarjetasController');

// Rutas principales CRUD
router.post('/create', tarjetasController.createTarjeta);
router.get('/all', tarjetasController.getAllTarjetas);
router.get('/mostrar', tarjetasController.mostrarTarjetas);
router.get('/estadisticas', tarjetasController.getEstadisticasGenerales);
router.get('/search', tarjetasController.searchTarjetas);
router.get('/ranking', tarjetasController.getRankingJugadoresTarjetas);
router.get('/minutos', tarjetasController.getTarjetasByMinutos);
router.get('/tipo/:tipo', tarjetasController.getTarjetasByTipo);
router.get('/jugador/:jugador', tarjetasController.getTarjetasByJugador);
router.get('/equipo/:equipo', tarjetasController.getTarjetasByEquipo);
router.get('/partido/:partido_id', tarjetasController.getTarjetasByPartido);
router.get('/encrypted/:id', tarjetasController.mandarTarjeta);
router.get('/:id', tarjetasController.getById);
router.put('/update/:id', tarjetasController.update);
router.delete('/delete/:id', tarjetasController.delete);

module.exports = router;
