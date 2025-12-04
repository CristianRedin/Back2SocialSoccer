const mongoose = require('mongoose');

const playerStatsSchema = new mongoose.Schema({
    playerId: Number,
    temporada: String,
    goles: Number,
    asistencias: Number,
    tarjetasAmarillas: Number,
    tarjetasRojas: Number,
    minutosJugados: Number,
    partidosJugados: Number,
    rating: Number,
    lesiones: [{
        tipo: String,
        fecha: String,
        tiempoRecuperacion: String
    }],
    observaciones: String,
    estado: String
});

const PlayerStats = mongoose.model('PlayerStats', playerStatsSchema);

module.exports = PlayerStats;
