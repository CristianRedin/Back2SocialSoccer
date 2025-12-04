const mongoose = require('mongoose');

const matchEventsSchema = new mongoose.Schema({
    matchId: Number,
    eventos: [{
        minuto: Number,
        tipo: String,
        jugadorId: Number,
        descripcion: String,
        timestamp: String
    }],
    comentarios: [{
        minuto: Number,
        comentario: String,
        timestamp: String
    }],
    clima: {
        temperatura: String,
        condicion: String
    },
    asistencia: Number,
    arbitroComentarios: String,
    estado: String
});

const MatchEvents = mongoose.model('MatchEvents', matchEventsSchema);

module.exports = MatchEvents;
