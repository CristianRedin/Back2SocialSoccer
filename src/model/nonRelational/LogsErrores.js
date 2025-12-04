const mongoose = require('mongoose');

const logsErroresSchema = new mongoose.Schema({
    rolId: Number,
    mensaje: String,
    tipoError: String,
    stack: String,
    url: String,
    metodo: String,
    userId: Number,
    userRole: String,
    severidad: String,
    accionIntentan: String,
    permisosFaltantes: [String],
    contextoAdicional: {
        ip: String,
        userAgent: String,
        parametros: String,
        headers: String
    },
    fecha: String,
    resuelto: String,
    fechaResolucion: String,
    notasResolucion: String,
    estado: String
});

const LogsErrores = mongoose.model('LogsErrores', logsErroresSchema);

module.exports = LogsErrores;
