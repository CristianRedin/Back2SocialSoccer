// Router para autenticación - Login y Registro con Passport.js
const express = require('express');
const router = express.Router();
const passport = require('passport');
const { isLoggedIn, isNotLoggedIn } = require('../lib/auth');

// ==================== MIDDLEWARE DE VALIDACIÓN ====================

// Middleware para validar datos de registro
const validateRegister = (req, res, next) => {
    const { nombre, email, contraseña } = req.body;
    
    if (!nombre || !email || !contraseña) {
        return res.status(400).json({
            success: false,
            message: 'Nombre, email y contraseña son obligatorios'
        });
    }
    
    if (contraseña.length < 6) {
        return res.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 6 caracteres'
        });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Email inválido'
        });
    }
    
    next();
};

// ==================== RUTAS DE REGISTRO ====================

// POST /auth/register - Registro de usuario
router.post('/register', validateRegister, isNotLoggedIn, passport.authenticate('local.signup', {
    failureRedirect: '/auth/register',
    failureFlash: true
}), async (req, res) => {
    try {
        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: req.user.id,
                nombre: req.user.nombre,
                email: req.user.email,
                avatar: req.user.avatar,
                preferencias: req.user.preferencias
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error en el registro',
            error: error.message
        });
    }
});

// ==================== RUTAS DE LOGIN ====================

// POST /auth/login - Inicio de sesión
router.post('/login', isNotLoggedIn, (req, res, next) => {
    passport.authenticate('local.signin', (err, user, info) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: err.message
            });
        }
        
        if (!user) {
            return res.status(401).json({
                success: false,
                message: req.flash('message')[0] || 'Credenciales inválidas'
            });
        }

        req.logIn(user, (err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al iniciar sesión',
                    error: err.message
                });
            }

            res.status(200).json({
                success: true,
                message: `¡Bienvenido ${user.nombre}!`,
                user: {
                    id: user.id,
                    nombre: user.nombre,
                    email: user.email,
                    avatar: user.avatar,
                    preferencias: user.preferencias
                }
            });
        });
    })(req, res, next);
});

// ==================== RUTAS DE LOGOUT ====================

// POST /auth/logout - Cerrar sesión
router.post('/logout', isLoggedIn, (req, res) => {
    const userName = req.user.nombre;
    
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Error al cerrar sesión',
                error: err.message
            });
        }
        
        // ✅ Destruir sesión completamente
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error al destruir sesión'
                });
            }
            
            res.clearCookie('futbolsocial.sid');
            res.json({
                success: true,
                message: `¡Hasta luego ${userName}! Sesión cerrada exitosamente.`
            });
        });
    });
});

// ==================== RUTAS DE ESTADO ====================

// GET /auth/me - Obtener información del usuario actual
router.get('/me', isLoggedIn, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            nombre: req.user.nombre,
            email: req.user.email,
            avatar: req.user.avatar,
            preferencias: req.user.preferencias
        }
    });
});

// GET /auth/status - Verificar estado de autenticación
router.get('/status', (req, res) => {
    res.json({
        isAuthenticated: req.isAuthenticated(),
        user: req.isAuthenticated() ? {
            id: req.user.id,
            nombre: req.user.nombre,
            email: req.user.email
        } : null
    });
});

// ✅ NUEVA RUTA: Preferencias de usuario
router.get('/preferences', isLoggedIn, (req, res) => {
    res.json({
        success: true,
        preferencias: req.user.preferencias || {
            tema: 'claro',
            idioma: 'es',
            notificaciones: true
        }
    });
});

// ✅ NUEVA: Ruta para obtener roles disponibles para registro
router.get('/available-roles', async (req, res) => {
    try {
        const roles = await require('../dataBase/dataBase.orm').roles.findAll({
            where: { 
                estado: 'activo',
                nombre: { [require('sequelize').Op.ne]: 'Administrador' } // Excluir admin
            },
            attributes: ['idRoles', 'nombre', 'descripcion'],
            order: [['nombre', 'ASC']]
        });
        
        res.json({
            success: true,
            roles: roles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error al obtener roles',
            error: error.message
        });
    }
});

module.exports = router;
