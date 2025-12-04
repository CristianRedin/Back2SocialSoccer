module.exports = (sequelize, types) => {
  return sequelize.define('cancha', {  // singular para que Sequelize pluralice automáticamente
    id: { 
      type: types.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    nombre: { 
      type: types.STRING, 
      allowNull: false 
    },
    ubicacion: { 
      type: types.STRING, 
      allowNull: true  // explícito que puede ser null
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
    freezeTableName: false,  // permite pluralizar la tabla a 'canchas'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



