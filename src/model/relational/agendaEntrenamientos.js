module.exports = (sequelize, types) => {
  return sequelize.define('agendaEntrenamiento', {  // singular para que Sequelize pluralice automáticamente
    id: { 
      type: types.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    fecha: { 
      type: types.DATEONLY,  // solo fecha sin hora
      allowNull: false 
    },
    hora: { 
      type: types.TIME, 
      allowNull: false 
    },
    descripcion: { 
      type: types.STRING, 
      allowNull: true  // mejor explicitar si puede ser null o no
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
    freezeTableName: false, // Sequelize pluralizará "agendaEntrenamientos" para la tabla
    timestamps: false       // desactiva createdAt y updatedAt automáticos
  });
};



