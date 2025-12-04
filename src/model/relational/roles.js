// Modelo de roles - Define la estructura de la tabla roles
module.exports = (sequelize, types) => {
  return sequelize.define('roles', {
    idRoles: {  
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nameRole: {  
      type: types.STRING,
      allowNull: false
    },
    descriptionRole: {  
      type: types.STRING,
      allowNull: true
    },
    stateRole: {  
      type: types.STRING,
      allowNull: false,
      defaultValue: 'activo'
    },
    createRole: {  
      type: types.STRING
    },
    updateRole: {  
      type: types.STRING
    }
  }, {
    tableName: 'roles',
    freezeTableName: true,
    timestamps: false
  });
};



