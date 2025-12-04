module.exports = (sequelize, types) => {
  return sequelize.define('torneos', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: types.STRING,
      allowNull: false
    },
    fechaInicio: {
      type: types.DATE,
      allowNull: false
    },
    fechaFin: {
      type: types.DATE,
      allowNull: true
    },
    descripcion: {
      type: types.TEXT,
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
    freezeTableName: false,  // Permite que Sequelize pluralice como 'torneos'
    timestamps: false        // No se crean campos createdAt y updatedAt
  });
};



