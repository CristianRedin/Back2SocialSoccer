module.exports = (sequelize, types) => {
  return sequelize.define('tarjetas', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tipo: {
      type: types.STRING,
      allowNull: true
    },
    minuto: {
      type: types.INTEGER,
      allowNull: true
    },
    estado: {
      type: types.STRING,

    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // Permite que Sequelize pluralice como 'tarjetas'
    timestamps: false        // No se crean campos createdAt y updatedAt
  });
};



