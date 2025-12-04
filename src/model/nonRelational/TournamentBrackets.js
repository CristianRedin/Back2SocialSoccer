const mongoose = require('mongoose');

const tournamentBracketsSchema = new mongoose.Schema({
    torneoId: Number,
    formato: String,
    rondas: [{
        nombre: String,
        partidos: [{
            equipoLocal: Number,
            equipoVisitante: Number,
            resultado: {
                golesLocal: Number,
                golesVisitante: Number
            },
            fecha: String,
            ganador: Number,
            estado: String
        }]
    }],
    grupos: [{
        nombre: String,
        equipos: [Number],
        tabla: [{
            equipoId: Number,
            puntos: Number,
            partidosJugados: Number,
            victorias: Number,
            empates: Number,
            derrotas: Number
        }]
    }],
    premios: {
        campeon: String,
        subcampeon: String,
        tercerPuesto: String
    },
    estado: String
});

const TournamentBrackets = mongoose.model('TournamentBrackets', tournamentBracketsSchema);

module.exports = TournamentBrackets;
