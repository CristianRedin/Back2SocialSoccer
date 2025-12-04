const mongoose = require('mongoose');

const notificationsLogSchema = new mongoose.Schema({
    userId: String,
    mensaje: String,
    tipo: String,
    leido: String,
    estado: String
});

const NotificationsLog = mongoose.model('NotificationsLog', notificationsLogSchema);

module.exports = NotificationsLog;
