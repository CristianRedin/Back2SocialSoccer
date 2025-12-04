const mongoose = require('mongoose');

const userPreferencesSchema = new mongoose.Schema({
    userId: String,
    tema: String,
    notificaciones: String,
    idioma: String
});

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

module.exports = UserPreferences;