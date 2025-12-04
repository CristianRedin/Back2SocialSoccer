// Modelo de news - Define la estructura de la tabla news (noticias)
module.exports = (sequelize, types) => {
  return sequelize.define('news', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    titulo: {
      type: types.STRING,
      allowNull: false
    },
    contenido: {
      type: types.TEXT,
      allowNull: true
    },
    autor: {
      type: types.STRING,
      allowNull: true
    },
    fecha: {
      type: types.DATE,
      defaultValue: types.NOW
    },
    estado: {
      type: types.STRING,

      allowNull: false,
      comment: 'Estado de la noticia: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'news'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



