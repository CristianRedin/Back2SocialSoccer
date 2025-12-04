// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { ActivityLogsModel } = require('../dataBase/dataBase.mongo');
const { encrypDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const activityLogsCtl = {};

// --- Utilidad para Descifrado Seguro ---
function safeDecrypt(data) {
    try {
        return data ? descifrarDato(data) : '';
    } catch (error) {
        console.error('Error al descifrar datos:', error.message);
        return '';
    }
}

// Función para formatear una fecha a 'YYYY-MM-DD HH:mm:ss'
function formatLocalDateTime(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses son 0-index
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// --- CRUD de Activity Logs ---

// 1. CREAR NUEVO LOG DE ACTIVIDAD
activityLogsCtl.createActivityLogs = async (req, res) => {
    try {
        const nuevoLog = new ActivityLogsModel({
            ...req.body,
            estado: true,
            fecha_creacion: formatLocalDateTime(new Date())
        });

        const resultado = await nuevoLog.save();
        
        res.status(201).json({
            ok: true,
            message: 'Log de actividad creado exitosamente',
            activityLog: resultado
        });
    } catch (error) {
        console.error('Error en createActivityLogs:', error);
        res.status(400).json({
            ok: false,
            error: 'Error al crear el log de actividad'
        });
    }
};

// 2. OBTENER TODOS LOS LOGS DE ACTIVIDAD (Con agregación MongoDB)
activityLogsCtl.getAllActivityLogs = async (req, res) => {
    try {
        const logs = await ActivityLogsModel.aggregate([
            {
                $match: { estado: true }
            },
            {
                $addFields: {
                    // Indicador visual basado en el tipo de acción
                    indicadorAccion: {
                        $switch: {
                            branches: [
                                { case: { $regex: { input: "$accion", regex: /login|sesión|ingreso/i } }, then: "🔐 Login/Sesión" },
                                { case: { $regex: { input: "$accion", regex: /perfil|actualiz|edit/i } }, then: "👤 Perfil" },
                                { case: { $regex: { input: "$accion", regex: /crear|creo|nuevo/i } }, then: "➕ Creación" },
                                { case: { $regex: { input: "$accion", regex: /elimin|borr|delete/i } }, then: "🗑️ Eliminación" },
                                { case: { $regex: { input: "$accion", regex: /view|ver|visit/i } }, then: "👁️ Visualización" },
                                { case: { $regex: { input: "$accion", regex: /download|descarg/i } }, then: "📥 Descarga" },
                                { case: { $regex: { input: "$accion", regex: /upload|subir|cargar/i } }, then: "📤 Subida" },
                                { case: { $regex: { input: "$accion", regex: /search|buscar|filtrar/i } }, then: "🔍 Búsqueda" }
                            ],
                            default: "📊 Actividad General"
                        }
                    },
                    // Tiempo transcurrido desde la actividad
                    tiempoTranscurrido: {
                        $let: {
                            vars: {
                                diff: { $subtract: [new Date(), "$createdAt"] }
                            },
                            in: {
                                $cond: {
                                    if: { $lt: ["$$diff", 3600000] }, // Menos de 1 hora
                                    then: { $concat: [{ $toString: { $floor: { $divide: ["$$diff", 60000] } } }, " min"] },
                                    else: {
                                        $cond: {
                                            if: { $lt: ["$$diff", 86400000] }, // Menos de 1 día
                                            then: { $concat: [{ $toString: { $floor: { $divide: ["$$diff", 3600000] } } }, " hrs"] },
                                            else: { $concat: [{ $toString: { $floor: { $divide: ["$$diff", 86400000] } } }, " días"] }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    // Información del dispositivo y ubicación
                    infoDispositivo: {
                        $concat: [
                            "👤 Usuario: ", { $toString: "$userId" },
                            " | 🖥️ ", { $ifNull: ["$navegador", "Navegador no detectado"] },
                            " | 🌐 ", { $ifNull: ["$ip", "IP no registrada"] }
                        ]
                    },
                    // Resumen de la actividad
                    resumenActividad: {
                        $concat: [
                            { $ifNull: [{ $substr: ["$accion", 0, 60] }, "Acción no especificada"] },
                            { $cond: {
                                if: { $gt: [{ $strLenCP: { $ifNull: ["$accion", ""] } }, 60] },
                                then: "...",
                                else: ""
                            }}
                        ]
                    }
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json({
            ok: true,
            activityLogs: logs,
            total: logs.length
        });
    } catch (error) {
        console.error('Error en getAllActivityLogs:', error);
        res.status(500).json({
            ok: false,
            error: 'Error interno del servidor'
        });
    }
};

// 3. OBTENER LOG POR ID
activityLogsCtl.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await ActivityLogsModel.findOne({ _id: id, estado: true });

        if (!log) {
            return res.status(404).json({
                ok: false,
                error: 'Log de actividad no encontrado'
            });
        }

        res.status(200).json({
            ok: true,
            activityLog: log
        });
    } catch (error) {
        console.error('Error en getById:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al buscar el log'
        });
    }
};

// 4. MOSTRAR LOGS CON INFORMACIÓN DETALLADA
activityLogsCtl.mostrarActivityLogs = async (req, res) => {
    try {
        const logs = await ActivityLogsModel.aggregate([
            {
                $match: { estado: true }
            },
            {
                $addFields: {
                    indicadorAccion: {
                        $switch: {
                            branches: [
                                { case: { $regex: { input: "$accion", regex: /login|sesión|ingreso/i } }, then: "🔐 Actividad de Autenticación" },
                                { case: { $regex: { input: "$accion", regex: /perfil|actualiz|edit/i } }, then: "👤 Modificación de Perfil" },
                                { case: { $regex: { input: "$accion", regex: /crear|creo|nuevo/i } }, then: "➕ Creación de Contenido" },
                                { case: { $regex: { input: "$accion", regex: /elimin|borr|delete/i } }, then: "🗑️ Eliminación de Datos" },
                                { case: { $regex: { input: "$accion", regex: /view|ver|visit/i } }, then: "👁️ Visualización de Contenido" },
                                { case: { $regex: { input: "$accion", regex: /download|descarg/i } }, then: "📥 Descarga de Archivos" },
                                { case: { $regex: { input: "$accion", regex: /upload|subir|cargar/i } }, then: "📤 Subida de Archivos" },
                                { case: { $regex: { input: "$accion", regex: /search|buscar|filtrar/i } }, then: "🔍 Búsqueda de Información" }
                            ],
                            default: "📊 Actividad del Sistema"
                        }
                    },
                    fechaFormateada: {
                        $dateToString: {
                            format: "%d/%m/%Y %H:%M:%S",
                            date: "$createdAt",
                            timezone: "America/Ecuador"
                        }
                    },
                    tiempoTranscurrido: {
                        $let: {
                            vars: {
                                diff: { $subtract: [new Date(), "$createdAt"] }
                            },
                            in: {
                                $cond: {
                                    if: { $lt: ["$$diff", 60000] }, // Menos de 1 minuto
                                    then: "⚡ Hace menos de 1 min",
                                    else: {
                                        $cond: {
                                            if: { $lt: ["$$diff", 3600000] }, // Menos de 1 hora
                                            then: { $concat: ["🕐 Hace ", { $toString: { $floor: { $divide: ["$$diff", 60000] } } }, " min"] },
                                            else: {
                                                $cond: {
                                                    if: { $lt: ["$$diff", 86400000] }, // Menos de 1 día
                                                    then: { $concat: ["🕓 Hace ", { $toString: { $floor: { $divide: ["$$diff", 3600000] } } }, " hrs"] },
                                                    else: { $concat: ["📅 Hace ", { $toString: { $floor: { $divide: ["$$diff", 86400000] } } }, " días"] }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    detalleCompleto: {
                        $concat: [
                            "👤 Usuario ID: ", { $toString: "$userId" },
                            " | 📝 Acción: ", { $ifNull: ["$accion", "No especificada"] },
                            " | 🖥️ Navegador: ", { $ifNull: ["$navegador", "No detectado"] },
                            " | 🌐 IP: ", { $ifNull: ["$ip", "No registrada"] }
                        ]
                    },
                    // Nivel de importancia de la actividad
                    nivelImportancia: {
                        $switch: {
                            branches: [
                                { case: { $regex: { input: "$accion", regex: /login|sesión|autenticación/i } }, then: "🔴 Alta Seguridad" },
                                { case: { $regex: { input: "$accion", regex: /perfil|password|email/i } }, then: "🟡 Seguridad Media" },
                                { case: { $regex: { input: "$accion", regex: /crear|elimin|delete/i } }, then: "🟠 Modificación Importante" },
                                { case: { $regex: { input: "$accion", regex: /view|ver|search/i } }, then: "🟢 Consulta Regular" }
                            ],
                            default: "🔵 Actividad Estándar"
                        }
                    }
                }
            },
            {
                $sort: { createdAt: -1 }
            }
        ]);

        res.status(200).json({
            ok: true,
            message: 'Logs de actividad obtenidos exitosamente',
            data: logs,
            total: logs.length
        });
    } catch (error) {
        console.error('Error en mostrarActivityLogs:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al obtener los logs de actividad'
        });
    }
};

// 5. ACTUALIZAR LOG DE ACTIVIDAD
activityLogsCtl.update = async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const logActualizado = await ActivityLogsModel.findByIdAndUpdate(
            id,
            { 
                ...req.body, 
                fecha_modificacion: formattedNow 
            },
            { new: true, runValidators: true }
        );

        if (!logActualizado) {
            return res.status(404).json({
                ok: false,
                error: 'Log de actividad no encontrado'
            });
        }

        res.status(200).json({
            ok: true,
            message: 'Log actualizado exitosamente',
            activityLog: logActualizado
        });
    } catch (error) {
        console.error('Error en update:', error);
        res.status(400).json({
            ok: false,
            error: 'Error al actualizar el log'
        });
    }
};

// 6. ELIMINAR LOG (Soft delete)
activityLogsCtl.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const logEliminado = await ActivityLogsModel.findByIdAndUpdate(
            id,
            { 
                estado: false, 
                fechaEliminacion: formattedNow,
                fecha_modificacion: formattedNow
            },
            { new: true }
        );

        if (!logEliminado) {
            return res.status(404).json({
                ok: false,
                error: 'Log de actividad no encontrado'
            });
        }

        res.status(200).json({
            ok: true,
            message: 'Log eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error en delete:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al eliminar el log'
        });
    }
};

// 7. ENVIAR LOG CON ENCRIPTACIÓN DE FECHAS
activityLogsCtl.mandarActivityLogs = async (req, res) => {
    try {
        const { id } = req.params;
        const log = await ActivityLogsModel.findById(id);

        if (!log || !log.estado) {
            return res.status(404).json({
                ok: false,
                error: 'Log de actividad no encontrado'
            });
        }

        // Encriptar fechas sensibles usando la función de helpers
        const logEncriptado = {
            ...log.toObject(),
            createdAt: encrypDates(log.createdAt),
            updatedAt: encrypDates(log.updatedAt)
        };

        res.status(200).json({
            ok: true,
            activityLog: logEncriptado
        });
    } catch (error) {
        console.error('Error en mandarActivityLogs:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al obtener el log de actividad'
        });
    }
};

// --- FUNCIONES ADICIONALES DE ANÁLISIS ---

// 8. OBTENER LOGS POR USUARIO
activityLogsCtl.getLogsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const logs = await ActivityLogsModel.find({ 
            userId: userId, 
            estado: true 
        }).sort({ createdAt: -1 });

        res.status(200).json({
            ok: true,
            message: 'Logs del usuario obtenidos exitosamente',
            activityLogs: logs,
            total: logs.length
        });
    } catch (error) {
        console.error('Error en getLogsByUser:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al obtener los logs del usuario'
        });
    }
};

// 9. OBTENER ESTADÍSTICAS DE ACTIVIDAD
activityLogsCtl.getActivityStats = async (req, res) => {
    try {
        const stats = await ActivityLogsModel.aggregate([
            {
                $match: { estado: true }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                        day: { $dayOfMonth: "$createdAt" }
                    },
                    totalActivities: { $sum: 1 },
                    uniqueUsers: { $addToSet: "$userId" }
                }
            },
            {
                $addFields: {
                    uniqueUserCount: { $size: "$uniqueUsers" }
                }
            },
            {
                $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 }
            }
        ]);

        res.status(200).json({
            ok: true,
            message: 'Estadísticas de actividad obtenidas exitosamente',
            stats: stats
        });
    } catch (error) {
        console.error('Error en getActivityStats:', error);
        res.status(500).json({
            ok: false,
            error: 'Error al obtener estadísticas'
        });
    }
};

module.exports = activityLogsCtl;
