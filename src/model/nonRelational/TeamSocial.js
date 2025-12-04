const mongoose = require('mongoose');

const teamSocialSchema = new mongoose.Schema({
    teamId: Number,
    redesSociales: {
        facebook: String,
        instagram: String,
        twitter: String,
        youtube: String,
        tiktok: String
    },
    publicaciones: [{
        tipo: String,
        contenido: String,
        fecha: String,
        likes: Number,
        comentarios: Number,
        hashtags: [String]
    }],
    seguidores: {
        facebook: Number,
        instagram: Number,
        twitter: Number
    },
    himno: String,
    historia: String,
    colores: {
        primario: String,
        secundario: String
    },
    estado: String
});

const TeamSocial = mongoose.model('TeamSocial', teamSocialSchema);

module.exports = TeamSocial;
