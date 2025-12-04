module.exports = (sequelize, types) => {
  return sequelize.define('comentarios', {  // modelo en singular para que Sequelize pluralice
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    contenido: {
      type: types.TEXT,
      allowNull: false
    },
    tipo: {
      type: types.STRING,
      allowNull: false
    },
    creadoEn: {
      type: types.DATE,
      defaultValue: types.NOW
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
    freezeTableName: false,  // permite pluralizar la tabla a 'comentarios'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



