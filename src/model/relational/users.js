module.exports = (sequelize, types) => {
  const Users = sequelize.define('users', {
    idUsers: {  
      type: types.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nameUser: {  
      type: types.STRING,
      allowNull: false
    },
    emailUser: {  
      type: types.STRING,
      allowNull: false,
      unique: true
    },
    phoneUser: {  
      type: types.STRING,
      allowNull: true
    },
    usernameUser: {  
      type: types.STRING,
      allowNull: true
    },
    passwordUser: {  
      type: types.STRING,
      allowNull: false
    },
    stateUser: {  
      type: types.STRING,
      allowNull: false,
      defaultValue: 'activo'
    },
    createUser: {  
      type: types.STRING
    },
    updateUser: {  
      type: types.STRING
    },
    idRole: {
      type: types.INTEGER,
      allowNull: true,
      references: {
        model: 'roles',
        key: 'idRoles'  // ✅ CORREGIDO: cambiar de 'id' a 'idRoles'
      }
    }
  }, {
    tableName: 'users',  
    freezeTableName: true,  
    timestamps: false
  });

  // ✅ IMPORTANTE: Definir la asociación
  Users.associate = (models) => {
    Users.belongsTo(models.roles, {
      foreignKey: 'idRole',
      as: 'role'
    });
  };

  return Users;
};



