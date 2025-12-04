const mongoose = require('mongoose');

const favoritoSchema = new mongoose.Schema({
    newsId: Number,
    userId: Number,
    tipoEntidad: String,
    entidadId: Number,
    etiquetas: [String],
    notas: String,
    fechaMarcado: String,
    prioridad: String,
    recordatorio: {
        activo: String,
        fecha: String,
        mensaje: String
    },
    contadorVistas: Number,
    ultimaVista: String,
    valoracion: Number,
    compartido: String,
    estado: String
});

const Favorito = mongoose.model('Favorito', favoritoSchema);

module.exports = Favorito;
