// Modelo de players - Define la estructura de la tabla players (jugadores)
module.exports = (sequelize, types) => {
  return sequelize.define('players', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: types.STRING,
      allowNull: false
    },
    posicion: {
      type: types.STRING,
      allowNull: true
    },
    dorsal: {
      type: types.INTEGER,
      allowNull: true
    },
    edad: {
      type: types.INTEGER,
      allowNull: true
    },
    estado: {
      type: types.STRING,

      allowNull: false,
      comment: 'Estado del jugador: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // Permite pluralizar el nombre de la tabla a 'players'
    timestamps: false        // Desactiva createdAt y updatedAt automáticos
  });
};



