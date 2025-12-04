const orm = require('../src/dataBase/dataBase.orm');

const initRoles = async () => {
  try {
    const count = await orm.rol.count();
    if (count === 0) {
      await orm.rol.bulkCreate([
        {
          nameRole: 'admin',
          descriptionRole: 'Administrador del sistema',
          stateRole: 'activo',
          createRole: new Date().toISOString(),
          updateRole: new Date().toISOString()
        },
        {
          nameRole: 'usuario',
          descriptionRole: 'Usuario estándar',
          stateRole: 'activo',
          createRole: new Date().toISOString(),
          updateRole: new Date().toISOString()
        }
      ]);
      console.log('✅ Roles creados automáticamente');
    } else {
      console.log('✅ Los roles ya existen, no se insertaron duplicados');
    }
  } catch (err) {
    console.error('❌ Error al inicializar roles:', err);
  }
};

module.exports = initRoles;
