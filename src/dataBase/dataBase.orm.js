const { Sequelize } = require("sequelize");
const {
    MYSQLHOST,
    MYSQLUSER,
    MYSQLPASSWORD,
    MYSQLDATABASE,
    MYSQLPORT,
    MYSQL_URI
} = require("../keys");

let sequelize;

// Usar URI de conexión si está disponible
if (MYSQL_URI) {
    sequelize = new Sequelize(MYSQL_URI, {
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4', // Soporte para caracteres especiales
        },
        pool: {
            max: 20, // Número máximo de conexiones
            min: 5,  // Número mínimo de conexiones
            acquire: 30000, // Tiempo máximo en ms para obtener una conexión
            idle: 10000 // Tiempo máximo en ms que una conexión puede estar inactiva
        },
        logging: false // Desactiva el logging para mejorar el rendimiento
    });
} else {
    // Configuración para parámetros individuales
    sequelize = new Sequelize(MYSQLDATABASE, MYSQLUSER, MYSQLPASSWORD, {
        host: MYSQLHOST,
        port: MYSQLPORT,
        dialect: 'mysql',
        dialectOptions: {
            charset: 'utf8mb4', // Soporte para caracteres especiales
        },
        pool: {
            max: 20, // Número máximo de conexiones
            min: 5,  // Número mínimo de conexiones
            acquire: 30000, // Tiempo máximo en ms para obtener una conexión
            idle: 10000 // Tiempo máximo en ms que una conexión puede estar inactiva
        },
        logging: false // Desactiva el logging para mejorar el rendimiento
    });
}

// Autenticar y sincronizar
sequelize.authenticate()
    .then(() => {
        console.log("Conexión establecida con la base de datos");
    })
    .catch((err) => {
        console.error("No se pudo conectar a la base de datos:", err.message);
    });

// Sincronización de la base de datos - Configuración segura para evitar "Too many keys"
const syncOptions = { alter: false }; // No alterar estructura existente, solo verificar

sequelize.sync(syncOptions)
    .then(() => {
        console.log('Base de Datos sincronizadas (modo seguro)');
    })
    .catch((error) => {
        console.error('Error al sincronizar la Base de Datos:', error);
    });

//extraccion de Modelos
const usersModel = require('../model/relational/users');
const rolesModel = require('../model/relational/roles');
const detalleRolModel = require('../model/relational/detalleRol');
const teamsModel = require('../model/relational/teams');
const playersModel = require('../model/relational/players');
const refereesModel = require('../model/relational/referees');
const matchesModel = require('../model/relational/matches');
const newsModel = require('../model/relational/news');
const divisionModel = require('../model/relational/division');
const posicionesModel = require('../model/relational/posiciones');
const estadisticasModel = require('../model/relational/estadisticas');
const detalleEstadisticasModel = require('../model/relational/detalleEstadisticas');
const resultadosModel = require('../model/relational/resultados');
const detalleResultadosModel = require('../model/relational/detalleResultados');
const tarjetasModel = require('../model/relational/tarjetas');
const canchasModel = require('../model/relational/canchas');
const detalleJugadoresModel = require('../model/relational/detalleJugadores');
const detalleDivisionModel = require('../model/relational/detalleDivision');
const torneosModel = require('../model/relational/torneos');
const inscripcionesTorneoModel = require('../model/relational/inscripcionesTorneo');
const agendaEntrenamientosModel = require('../model/relational/agendaEntrenamientos');
const comentariosModel = require('../model/relational/comentarios');

//instanciar los modelos a sincronizar
const users = usersModel(sequelize, Sequelize.DataTypes);
const roles = rolesModel(sequelize, Sequelize.DataTypes);
const detalleRol = detalleRolModel(sequelize, Sequelize.DataTypes);
const teams = teamsModel(sequelize, Sequelize.DataTypes);
const players = playersModel(sequelize, Sequelize.DataTypes);
const referees = refereesModel(sequelize, Sequelize.DataTypes);
const matches = matchesModel(sequelize, Sequelize.DataTypes);
const news = newsModel(sequelize, Sequelize.DataTypes);
const division = divisionModel(sequelize, Sequelize.DataTypes);
const posiciones = posicionesModel(sequelize, Sequelize.DataTypes);
const estadisticas = estadisticasModel(sequelize, Sequelize.DataTypes);
const detalleEstadisticas = detalleEstadisticasModel(sequelize, Sequelize.DataTypes);
const resultados = resultadosModel(sequelize, Sequelize.DataTypes);
const detalleResultados = detalleResultadosModel(sequelize, Sequelize.DataTypes);
const tarjetas = tarjetasModel(sequelize, Sequelize.DataTypes);
const canchas = canchasModel(sequelize, Sequelize.DataTypes);
const detalleJugadores = detalleJugadoresModel(sequelize, Sequelize.DataTypes);
const detalleDivision = detalleDivisionModel(sequelize, Sequelize.DataTypes);
const torneos = torneosModel(sequelize, Sequelize.DataTypes);
const inscripcionesTorneo = inscripcionesTorneoModel(sequelize, Sequelize.DataTypes);
const agendaEntrenamientos = agendaEntrenamientosModel(sequelize, Sequelize.DataTypes);
const comentarios = comentariosModel(sequelize, Sequelize.DataTypes);

//relaciones o foreignKeys - ✅ CORREGIDO: usar idRoles
users.hasMany(detalleRol, { foreignKey: 'usuarioId', sourceKey: 'idUsers' });
detalleRol.belongsTo(users, { foreignKey: 'usuarioId', targetKey: 'idUsers' });

// ✅ CORREGIDO: Cambiar 'id' por 'idRoles'
users.belongsTo(roles, { foreignKey: 'idRole', targetKey: 'idRoles' });
roles.hasMany(users, { foreignKey: 'idRole', sourceKey: 'idRoles' });

teams.hasMany(players);
players.belongsTo(teams);  // esta tabla necesita una tabla de rompimiento  o tiene las 3 relaciones 

teams.belongsTo(division);
division.hasMany(teams);

matches.belongsTo(teams);
matches.belongsTo(teams);
matches.belongsTo(referees);

matches.belongsTo(canchas);
canchas.hasMany(matches);

matches.hasMany(resultados);
resultados.belongsTo(matches);

resultados.hasMany(detalleResultados);
detalleResultados.belongsTo(resultados);

players.hasMany(detalleResultados);
detalleResultados.belongsTo(players);

estadisticas.hasMany(detalleEstadisticas);
detalleEstadisticas.belongsTo(estadisticas);

players.hasMany(detalleEstadisticas);
detalleEstadisticas.belongsTo(players);

matches.hasMany(tarjetas);
tarjetas.belongsTo(matches);

players.hasMany(tarjetas);
tarjetas.belongsTo(players);

teams.hasMany(posiciones);
posiciones.belongsTo(teams);
division.hasMany(posiciones);
posiciones.belongsTo(division);

players.hasMany(detalleJugadores);
detalleJugadores.belongsTo(players);

division.hasMany(detalleDivision);
detalleDivision.belongsTo(division);
players.hasMany(detalleDivision);
detalleDivision.belongsTo(players);

teams.hasMany(agendaEntrenamientos);
agendaEntrenamientos.belongsTo(teams);

// Relaciones de torneos e inscripciones
torneos.hasMany(inscripcionesTorneo);
inscripcionesTorneo.belongsTo(torneos);
teams.hasMany(inscripcionesTorneo);
inscripcionesTorneo.belongsTo(teams);

// Relaciones de noticias con usuarios
users.hasMany(news);
news.belongsTo(users);

// Relaciones de comentarios
users.hasMany(comentarios);
comentarios.belongsTo(users);
matches.hasMany(comentarios);
comentarios.belongsTo(matches);

// Exportar el objeto sequelize
module.exports = {
    users,
    roles,
    detalleRol,
    teams,
    players,
    referees,
    matches,
    news,
    division,
    posiciones,
    estadisticas,
    detalleEstadisticas,
    resultados,
    detalleResultados,
    tarjetas,
    canchas,
    detalleJugadores,
    detalleDivision,
    torneos,
    inscripcionesTorneo,
    agendaEntrenamientos,
    comentarios
};
