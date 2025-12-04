// Modelo de referees - Define la estructura de la tabla referees (árbitros)
module.exports = (sequelize, types) => {
  return sequelize.define('referees', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: types.STRING,
      allowNull: false
    },
    experiencia: {
      type: types.STRING,
      allowNull: true
    },
    estado: {
      type: types.STRING,

      allowNull: false,
      comment: 'Estado del árbitro: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // Permite pluralizar el nombre de la tabla a 'referees'
    timestamps: false        // Desactiva createdAt y updatedAt automáticos
  });
};



