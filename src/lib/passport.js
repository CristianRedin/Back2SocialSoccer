const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const orm = require('../dataBase/dataBase.orm');
const mongo = require('../dataBase/dataBase.mongo'); // Importar conexión a MongoDB
const bcrypt = require('bcrypt');
const { cifrarDatos, descifrarDatos } = require('./encrypDates');
const UserPreferences = require('../model/nonRelational/UserPreferences');
const NotificationsLog = require('../model/nonRelational/NotificationsLog');


// ==================== ESTRATEGIA DE LOGIN ====================
passport.use(
    'local.signin',
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'contraseña',
            passReqToCallback: true,
        },
        async (req, email, contraseña, done) => {
            try {
                console.log('🔍 Intentando login para:', email)
                
                // ✅ CORREGIR: Incluir información del rol en la consulta
                const user = await orm.users.findOne({ 
                    where: { emailUser: email },
                    include: [{
                        model: orm.roles,
                        as: 'role', // Usar el alias de la relación
                        attributes: ['idRoles', 'nameRole']
                    }]
                });

                if (!user) {
                    console.log('❌ Usuario no encontrado:', email)
                    return done(null, false, req.flash('message', 'Usuario no encontrado'));
                }

                // Verificar contraseña
                if (user.passwordUser !== contraseña) {
                    console.log('❌ Contraseña incorrecta para:', email)
                    return done(null, false, req.flash('message', 'Contraseña incorrecta'));
                }

                // ✅ NUEVO: Crear objeto completo con información del rol
                const userComplete = {
                    id: user.idUsers,
                    nombre: user.nameUser,
                    email: user.emailUser,
                    avatar: user.avatar || null,
                    estado: user.stateUser,
                    role: user.role?.nameRole || 'Usuario', // ✅ Nombre del rol
                    roleId: user.idRole, // ✅ ID del rol
                    telefono: user.phoneUser,
                    username: user.usernameUser
                };

                console.log('✅ Usuario autenticado:', {
                    id: userComplete.id,
                    nombre: userComplete.nombre,
                    role: userComplete.role,
                    roleId: userComplete.roleId
                })

                return done(null, userComplete);

            } catch (error) {
                console.error('❌ Error en login:', error);
                return done(error);
            }
        }
    )
);

// ==================== ESTRATEGIA DE REGISTRO ====================
passport.use(
    'local.signup',
    new LocalStrategy(
        {
            usernameField: 'email',
            passwordField: 'contraseña',
            passReqToCallback: true,
        },
        async (req, email, contraseña, done) => {
            try {
                // Verificar si el usuario ya existe - ✅ CORREGIDO: usar emailUser
                const existingUser = await orm.users.findOne({ where: { emailUser: email } });
                if (existingUser) {
                    return done(null, false, req.flash('message', 'El email ya está registrado.'));
                }

                const { nombre, avatar, tema = 'claro', idioma = 'es', notificacionesEnabled = true, idRole } = req.body;

                // ✅ NUEVO: Validar que el rol existe
                let roleToAssign = idRole ? parseInt(idRole) : 2; // Por defecto rol 2 (Usuario)
                
                // ✅ CORREGIR: Permitir que los usuarios se registren con cualquier rol
                if (roleToAssign) {
                    const roleExists = await orm.roles.findOne({ 
                        where: { 
                            idRoles: roleToAssign, 
                            stateRole: 'activo'
                        } 
                    });
                    
                    if (!roleExists) {
                        return done(null, false, req.flash('message', 'El rol seleccionado no es válido.'));
                    }
                    
                    // ✅ ELIMINAR ESTA PARTE que fuerza el rol a Usuario:
                    /*
                    if (roleExists.nameRole === 'Administrador' && !req.body.allowAdmin) {
                        console.log('⚠️ Intento de registro como administrador sin permisos');
                        roleToAssign = 2; // Forzar rol de usuario normal
                    }
                    */
                    
                    // ✅ OPCIONAL: Solo mostrar advertencia pero permitir el registro
                    if (roleExists.nameRole === 'Administrador') {
                        console.log('⚠️ Nuevo administrador registrado:', email);
                    }
                }

                // Crear nuevo usuario
                const newUser = await orm.users.create({
                    nameUser: nombre,               
                    emailUser: email,               
                    passwordUser: contraseña,       
                    phoneUser: req.body.telefono || null,
                    usernameUser: req.body.username || null,
                    stateUser: 'activo',           
                    createUser: new Date().toISOString(),
                    updateUser: new Date().toISOString(),
                    idRole: roleToAssign  // ✅ Usar el rol seleccionado
                });

                // ✅ NUEVO: Obtener información del rol asignado
                const assignedRole = await orm.roles.findByPk(roleToAssign);

                // 2. Crear preferencias del usuario en MongoDB - ✅ CORREGIDO: usar idUsers
                const userPreferences = new UserPreferences({
                    userId: newUser.idUsers.toString(),
                    tema,
                    notificaciones: notificacionesEnabled,
                    idioma,
                    estado: true
                });
                await userPreferences.save();

                // 3. Crear notificación de bienvenida - ✅ CORREGIDO: usar idUsers y nameUser
                const welcomeNotification = new NotificationsLog({
                    userId: newUser.idUsers.toString(),
                    mensaje: `¡Bienvenido ${newUser.nameUser}! Tu cuenta ha sido creada exitosamente como ${assignedRole?.nameRole || 'Usuario'}.`,
                    tipo: 'success',
                    leido: false,
                    estado: true
                });
                await welcomeNotification.save();

                // Objeto completo para la sesión - ✅ CORREGIDO: incluir información de rol
                const userComplete = {
                    id: newUser.idUsers,
                    nombre: newUser.nameUser,
                    email: newUser.emailUser,
                    avatar: newUser.avatar || null,
                    estado: newUser.stateUser,
                    role: assignedRole?.nameRole || 'Usuario',  // ✅ Nombre del rol
                    roleId: roleToAssign,           // ✅ ID del rol
                    preferencias: userPreferences
                };

                return done(null, userComplete, req.flash('success', `¡Cuenta creada exitosamente! Bienvenido ${newUser.nameUser} como ${assignedRole?.nombre || 'Usuario'}.`));

            } catch (error) {
                console.error('Error en registro:', error);
                return done(error);
            }
        }
    )
);

//doble ingreso relacion no relacional
// Serialización para manejo de sesiones - ✅ CORREGIDO: ya usa id (que será idUsers)
passport.serializeUser((user, done) => {
    done(null, user.id); // Este será idUsers
});

passport.deserializeUser(async (id, done) => {
    try {
        // Obtener usuario de MySQL - ✅ CORREGIDO: usar idUsers como PK
        const usuario = await orm.users.findByPk(id); // Busca por idUsers
        if (!usuario) {
            return done(null, false);
        }

        // Obtener preferencias de MongoDB
        const userPreferences = await UserPreferences.findOne({ userId: id.toString() });

        // Objeto completo del usuario - ✅ CORREGIDO: usar campos correctos
        const userComplete = {
            id: usuario.idUsers,            // ✅ Cambiar de id a idUsers
            nombre: usuario.nameUser,       // ✅ Cambiar de nombre a nameUser
            email: usuario.emailUser,       // ✅ Cambiar de email a emailUser
            avatar: usuario.avatar || null,
            estado: usuario.stateUser,      // ✅ Cambiar de estado a stateUser
            preferencias: userPreferences || null
        };

        done(null, userComplete);
    } catch (error) {
        console.error('Error en deserialización:', error);
        done(error, null);
    }
});

module.exports = passport;