module.exports = (sequelize, types) => {
  return sequelize.define('teams', {
    id: {
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: types.STRING,
      allowNull: false
    },
    logo: {
      type: types.STRING,
      allowNull: true
    },
    entrenador: {
      type: types.STRING,
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
    freezeTableName: false,  // Permite que Sequelize pluralice como 'teams'
    timestamps: false        // No se crean campos createdAt y updatedAt
  });
};



