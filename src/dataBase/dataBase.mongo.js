const mongoose = require('mongoose');
const { MONGO_URI } = require('../keys');

// 1. Configuración de eventos de conexión
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose conectado a MongoDB en:', mongoose.connection.host);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Error de conexión en Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️  Mongoose desconectado de MongoDB');
});

// 2. Función de conexión mejorada
const connectDB = async () => {
  try {
    let connectionURI = MONGO_URI;

    // Lógica para manejar la contraseña en producción (VPS)
    // Cuando subas a producción, define MONGO_PASSWORD en tus variables de entorno.
    if (process.env.MONGO_PASSWORD) {
      console.log('Detectada contraseña de MongoDB para producción. Construyendo URI segura...');
      // Codificar contraseña por si contiene caracteres especiales
      const encodedPassword = encodeURIComponent(process.env.MONGO_PASSWORD);
      connectionURI = MONGO_URI.replace('<PASSWORD>', encodedPassword);
    } else if (MONGO_URI.includes('<PASSWORD>')) {
      // Para desarrollo local con contraseña hardcodeada (cambia por tu contraseña real)
      const encodedPassword = encodeURIComponent('0987021692@Rj');
      connectionURI = MONGO_URI.replace('<PASSWORD>', encodedPassword);
    }

    await mongoose.connect(connectionURI, {
      connectTimeoutMS: 10000, // 10 segundos de timeout
      socketTimeoutMS: 45000, // 45 segundos
    });
    
    console.log('🚀 MongoDB conectado correctamente');
  } catch (err) {
    console.error('💥 FALLA CRÍTICA en conexión MongoDB:', err.message);
    process.exit(1); // Termina la aplicación con error
  }
};

// 3. Manejo de cierre de aplicación
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔌 Conexión a MongoDB cerrada por terminación de la app');
    process.exit(0);
  } catch (err) {
    console.error('Error al cerrar conexión MongoDB:', err);
    process.exit(1);
  }
});

// 4. Iniciar conexión inmediatamente (como solicitaste)
connectDB();

// 5. Exportar modelos (ajusta las rutas según tu estructura)
const FavoritosModel = require('../model/nonRelational/favoritos');
const NotificationsLogModel = require('../model/nonRelational/NotificationsLog');
const UserPreferencesModel = require('../model/nonRelational/UserPreferences');
const LogsErroresModel = require('../model/nonRelational/LogsErrores');
const EncuestasFeedbackModel = require('../model/nonRelational/EncuestasFeedback');
// Nuevos modelos con lógica
const PlayerStatsModel = require('../model/nonRelational/PlayerStats');
const MatchEventsModel = require('../model/nonRelational/MatchEvents');
const TeamSocialModel = require('../model/nonRelational/TeamSocial');
const TournamentBracketsModel = require('../model/nonRelational/TournamentBrackets');

module.exports = {
  FavoritosModel,
  NotificationsLogModel,
  UserPreferencesModel,
  LogsErroresModel,
  EncuestasFeedbackModel,
  PlayerStatsModel,
  MatchEventsModel,
  TeamSocialModel,
  TournamentBracketsModel,
};
