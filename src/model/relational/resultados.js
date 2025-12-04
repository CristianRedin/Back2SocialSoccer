// Modelo de resultados - Define la estructura de la tabla resultados
module.exports = (sequelize, types) => {
  return sequelize.define('resultados', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    marcadorLocal: {
      type: types.INTEGER,
      allowNull: true
    },
    marcadorVisitante: {
      type: types.INTEGER,
      allowNull: true
    },
    estado: {
      type: types.STRING,

      allowNull: false,
      comment: 'Estado del resultado: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // Permite pluralizar el nombre de la tabla a 'resultados'
    timestamps: false        // Desactiva createdAt y updatedAt automáticos
  });
};



