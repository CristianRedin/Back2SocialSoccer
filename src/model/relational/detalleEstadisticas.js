module.exports = (sequelize, types) => {
  return sequelize.define('detalleEstadisticas', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    goles: {
      type: types.INTEGER,
      allowNull: true
    },
    asistencias: {
      type: types.INTEGER,
      allowNull: true
    },
    estado: {
      type: types.STRING,
      allowNull: false,
 // Campo estado agregado para consistencia con otros modelos
      comment: 'Estado del detalle estadística: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: true,
    timestamps: false
  });
};



