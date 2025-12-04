module.exports = (sequelize, types) => {
  return sequelize.define('inscripcionesTorneo', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    estado: {
      type: types.STRING,
      allowNull: false,
 // Campo estado modificado para consistencia con otros modelos
      comment: 'Estado de la inscripción: true = activa, false = inactiva'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'inscripcionesTorneos'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



