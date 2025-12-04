// Modelo de posiciones - Define la estructura de la tabla posiciones (tabla de puntuaciones)
module.exports = (sequelize, types) => {
  return sequelize.define('posiciones', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    puntos: {
      type: types.INTEGER,
      allowNull: true
    },
    partidosJugados: {
      type: types.INTEGER,
      allowNull: true
    },
    partidosGanados: {
      type: types.INTEGER,
      allowNull: true
    },
    partidosEmpatados: {
      type: types.INTEGER,
      allowNull: true
    },
    partidosPerdidos: {
      type: types.INTEGER,
      allowNull: true
    },
    estado: {
      type: types.STRING,

      allowNull: false,
      comment: 'Estado de la posición: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // Permite pluralizar el nombre de la tabla a 'posiciones'
    timestamps: false        // Desactiva createdAt y updatedAt automáticos
  });
};



