
// Middleware para verificar autenticación
const isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) {
        console.log('Usuario autenticado:', req.user.email);
        return next();
    }
    
    console.log('Usuario no autenticado, acceso denegado');
    
    // Para API, retornar JSON en lugar de redireccionar
    if (req.originalUrl.startsWith('/api') || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({
            success: false,
            message: 'Acceso denegado. Debe iniciar sesión.',
            requiresAuth: true
        });
    }
    
    // Para peticiones web, guardar URL para redirección después del login
    req.session.returnTo = req.originalUrl;
    res.redirect('/auth/login');
};

// Middleware para verificar que NO esté autenticado (para login/register)
const isNotLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return next();
    }
    
    // Si ya está autenticado, redireccionar o enviar respuesta apropiada
    if (req.headers.accept?.includes('application/json')) {
        return res.status(409).json({
            success: false,
            message: 'Ya tienes una sesión activa',
            user: {
                id: req.user.id,
                nombre: req.user.nombre,
                email: req.user.email
            }
        });
    }
    
    res.redirect('/dashboard'); // O la ruta que prefieras para usuarios autenticados
};

// Middleware para verificar roles específicos (para futuras implementaciones)
const hasRole = (roles) => {
    return (req, res, next) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({
                success: false,
                message: 'Debe iniciar sesión'
            });
        }
        
        // Aquí puedes implementar lógica de roles cuando la tengas
        // Por ahora, permite acceso a todos los usuarios autenticados
        next();
    };
};

module.exports = {
    isLoggedIn,
    isNotLoggedIn,
    hasRole
};