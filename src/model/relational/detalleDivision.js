module.exports = (sequelize, types) => {
  return sequelize.define('detalleDivision', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    estado: {
      type: types.STRING,

      comment: 'Campo para eliminación lógica - mantiene consistencia con otros modelos'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'detalleDivisions'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



