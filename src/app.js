// Importar módulos necesarios
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const flash = require('connect-flash');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require("express-fileupload");
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const winston = require('winston');
const fs = require('fs');
const crypto = require('crypto');
const hpp = require('hpp');
const toobusy = require('toobusy-js');

// Importar módulos locales
const { MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT } = require('./keys');
require('./lib/passport');

// Crear aplicación Express
const app = express();

// ==================== CONFIGURACIÓN BÁSICA ====================
app.set('port', process.env.PORT || 2000);

// ==================== CONFIGURACIÓN DE LOGS MEJORADA ====================
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.printf(info => `${info.timestamp} [${info.level.toUpperCase()}]: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 10 * 1024 * 1024,
            maxFiles: 5,
            tailable: true
        }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

console.log = (...args) => logger.info(args.join(' '));
console.info = (...args) => logger.info(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.debug = (...args) => logger.debug(args.join(' '));

const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message) => logger.info(message.trim())
    }
}));

// ==================== CONFIGURACIÓN DE SEGURIDAD MEJORADA ====================
app.use((req, res, next) => {
    if (toobusy()) {
        res.status(503).send("Server Too Busy");
    } else {
        next();
    }
});

// Habilitar CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  credentials: true
}));

app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": [
          "'self'", "'unsafe-inline'", "'unsafe-eval'",
          "https://maps.googleapis.com", "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net", "https://unpkg.com"
        ],
        "style-src": [
          "'self'", "'unsafe-inline'",
          "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"
        ],
        "img-src": [
          "'self'", "data:", "blob:",
          "https://maps.gstatic.com", "https://*.googleapis.com"
        ],
        "connect-src": [
          "'self'", "https://maps.googleapis.com",
          "https://www.bitaldatax.com", "https://www.cardscanner.co/es/image-to-text"
        ],
        "frame-src": ["'self'", "blob:", "https://www.google.com"],
        "object-src": ["'none'"],
        "default-src": ["'self'"]
      }
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));

app.use(hpp());
app.use(compression());

// ==================== MIDDLEWARES BÁSICOS ====================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// ==================== CONFIGURACIÓN DE SESIONES ====================
const sessionStore = new MySQLStore({
    host: MYSQLHOST,
    port: MYSQLPORT,
    user: MYSQLUSER,
    password: MYSQLPASSWORD,
    database: MYSQLDATABASE,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'futbolsocial2024secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax'
    },
    name: 'futbolsocial.sid'
}));

// ==================== PASSPORT Y FLASH ====================
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// ==================== CONFIGURACIÓN CSRF ====================
const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
});

// ✅ APLICAR CSRF SOLO A RUTAS ESPECÍFICAS
app.use('/auth/register', csrfProtection);
app.use('/auth/login', csrfProtection);

// ==================== MIDDLEWARES PERSONALIZADOS ====================
app.use((req, res, next) => {
    // ✅ Funciones helper para respuestas API
    res.apiSuccess = (data, message = 'Success', status = 200) => {
        const response = {
            success: true,
            message,
            data
        };
        return res.status(status).json(response);
    };
    
    res.apiError = (message, status = 400, errors = null) => {
        const response = {
            success: false,
            message,
            errors
        };
        return res.status(status).json(response);
    };
    
    // ✅ Solo agregar CSRF token si el middleware está activo
    if (req.csrfToken) {
        res.locals.csrfToken = req.csrfToken();
    }
    
    next();
});

// ==================== RUTAS CSRF TOKEN ====================
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ==================== RUTAS API ====================
app.use('/auth', require('./router/auth'));
app.use('/users', require('./router/users'));
app.use('/roles', require('./router/roles'));
app.use('/detalle-rol', require('./router/detalleRol'));
app.use('/teams', require('./router/teams'));
app.use('/players', require('./router/players'));
app.use('/referees', require('./router/referees'));
app.use('/matches', require('./router/matches'));
app.use('/tarjetas', require('./router/tarjetas'));
app.use('/goles', require('./router/goles'));
app.use('/asistencias', require('./router/asistencias'));
app.use('/canchas', require('./router/canchas'));
app.use('/agenda-entrenamientos', require('./router/agendaEntrenamientos'));
app.use('/posiciones', require('./router/posiciones'));
app.use('/estadisticas', require('./router/estadisticas'));
app.use('/detalle-estadisticas', require('./router/detalleEstadisticas'));
app.use('/resultados', require('./router/resultados'));
app.use('/detalle-jugadores', require('./router/detalleJugadores'));
app.use('/activity-logs', require('./router/activityLogs'));
app.use('/comentarios', require('./router/comentarios'));
app.use('/likes', require('./router/likes'));
app.use('/notificaciones', require('./router/notificaciones'));
app.use('/user-preferences', require('./router/userPreferences'));
app.use('/notifications-log', require('./router/notificationsLog'));
app.use('/teams-social', require('./router/teamsSocial'));
app.use('/mensajes', require('./router/mensajes'));

// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
    console.error('Error Stack:', err.stack);
    
    // CSRF token validation error
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({
            success: false,
            message: 'CSRF token validation failed'
        });
    }

    // Error no manejado
    const errorResponse = {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    };
    
    res.status(500).json(errorResponse);
});

// Middleware para rutas no encontradas
app.use((req, res, next) => {
    logger.warn(`404 Not Found: ${req.originalUrl}`);
    
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

module.exports = app;
