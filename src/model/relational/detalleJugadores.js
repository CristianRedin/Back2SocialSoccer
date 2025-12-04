module.exports = (sequelize, types) => {
  return sequelize.define('detalleJugadores', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    biografia: {
      type: types.TEXT,
      allowNull: true
    },
    nacionalidad: {
      type: types.STRING,
      allowNull: true
    },
    estado: {
      type: types.STRING,
      allowNull: false,
 // Campo estado agregado para consistencia con otros modelos
      comment: 'Estado del detalle jugador: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'detalleJugadores'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



