const mongoose = require('mongoose');

const encuestasFeedbackSchema = new mongoose.Schema({
    userId: Number,
    puntuacion: Number,
    comentarios: String,
    fecha: String,
    estado: String
});

const EncuestasFeedback = mongoose.model('EncuestasFeedback', encuestasFeedbackSchema);

module.exports = EncuestasFeedback;
