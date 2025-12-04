module.exports = (sequelize, types) => {
  return sequelize.define('matches', {
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
      type: types.TEXT,
      allowNull: true
    },
    estado: {
      type: types.STRING,
      allowNull: false,
 // Campo estado agregado para consistencia con otros modelos
      comment: 'Estado del partido: true = activo, false = inactivo'
    },
    fecha_creacion: {
      type: types.STRING // Simplificado a tipo STRING
    },
    fecha_modificacion: {
      type: types.STRING // Simplificado a tipo STRING
    }
  }, {
    freezeTableName: false,  // permite pluralizar el nombre de la tabla a 'matches'
    timestamps: false        // desactiva createdAt y updatedAt automáticos
  });
};



