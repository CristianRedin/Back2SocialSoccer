module.exports = (sequelize, types) => {
  return sequelize.define('division', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: types.STRING,
      allowNull: false
    },
    categoria: {
      type: types.STRING, 
      allowNull: true
    },
    estado: {
      type: types.STRING,
      allowNull: false,
 // Campo estado agregado para consistencia con otros modelos
      comment: 'Estado de la división: true = activa, false = inactiva'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'divisions'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



