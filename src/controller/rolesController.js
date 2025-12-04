// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const LogsErrores = require('../model/nonRelational/LogsErrores'); // Modelo no relacional para logs
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const rolesCtl = {};

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

// --- CRUD de Roles ---

// 1. CREAR NUEVO ROL
rolesCtl.createRole = async (req, res) => {
    const { nombre, descripcion } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoRolSQL = {
            nombre: nombre,
            descripcion: descripcion,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const rolGuardadoSQL = await orm.roles.create(nuevoRolSQL);

        // Crear log inicial del rol en MongoDB
        const logInicial = new LogsErrores({
            rolId: rolGuardadoSQL.id,
            mensaje: `Rol "${nombre}" creado exitosamente`,
            tipoError: 'system',
            metodo: 'POST',
            userId: req.user?.id || null,
            userRole: req.user?.role || 'system',
            severidad: 'low',
            accionIntentan: 'Crear nuevo rol',
            permisosFaltantes: [],
            contextoAdicional: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                parametros: req.body
            },
            resuelto: true,
            estado: true
        });

        await logInicial.save();

        res.status(201).json({
            message: 'Rol y log inicial creados exitosamente',
            rol: rolGuardadoSQL,
            logId: logInicial._id
        });
    } catch (error) {
        console.error('Error al crear el rol:', error);
        
        // Registrar error en MongoDB
        try {
            const errorLog = new LogsErrores({
                rolId: 0,
                mensaje: `Error al crear rol: ${error.message}`,
                tipoError: 'system',
                stack: error.stack,
                metodo: 'POST',
                userId: req.user?.id || null,
                userRole: req.user?.role || 'system',
                severidad: 'high',
                accionIntentan: 'Crear nuevo rol',
                contextoAdicional: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    parametros: req.body
                },
                estado: true
            });
            await errorLog.save();
        } catch (logError) {
            console.error('Error al registrar log de error:', logError);
        }
        
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS ROLES (Corregido)
rolesCtl.getAllRoles = async (req, res) => {
    try {
        // ✅ CORREGIDO: Usar stateRole en lugar de estado
        const [rolesSQL] = await sql.promise().query(`
            SELECT idRoles, nameRole, descriptionRole, stateRole, createRole, updateRole 
            FROM roles 
            WHERE stateRole = 'activo'
            ORDER BY nameRole ASC
        `);
        
        res.status(200).json(rolesSQL);
    } catch (error) {
        console.error('Error al obtener todos los roles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// ✅ NUEVA: Función específica para roles disponibles en registro (sin admin para usuarios normales)
rolesCtl.getAvailableRoles = async (req, res) => {
    try {
        const [rolesSQL] = await sql.promise().query(`
            SELECT idRoles, nameRole as nombre, descriptionRole as descripcion 
            FROM roles 
            WHERE stateRole = 'activo' 
            ORDER BY nameRole ASC
        `);
        
        res.status(200).json(rolesSQL);
    } catch (error) {
        console.error('Error al obtener roles disponibles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER ROL POR ID (Usando SQL Directo)
rolesCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rolesSQL] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]);
        
        if (rolesSQL.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }
        
        const rolSQL = rolesSQL[0];
        
        res.status(200).json(rolSQL);
    } catch (error) {
        console.error('Error al obtener el rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR ROLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
rolesCtl.mostrarRoles = async (req, res) => {
    try {
        const query = `
            SELECT r.*,
                   COUNT(u.id) as usuarios_asignados,
                   CASE 
                     WHEN r.estado = 'activo' THEN '✅'
                     WHEN r.estado = 'inactivo' THEN '⏸️'
                     ELSE '❌'
                   END as icono_estado,
                   CASE 
                     WHEN COUNT(u.id) = 0 THEN 'Sin asignar'
                     WHEN COUNT(u.id) = 1 THEN 'Un usuario'
                     ELSE CONCAT(COUNT(u.id), ' usuarios')
                   END as descripcion_asignacion
            FROM roles r
            LEFT JOIN users u ON r.id = u.roleId AND u.estado = 'activo'
            WHERE r.estado = 'activo'
            GROUP BY r.id, r.nombre, r.descripcion, r.estado, r.fecha_creacion, r.fecha_modificacion
            ORDER BY r.nombre ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Roles con información detallada obtenidos exitosamente',
            roles: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los roles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR ROL (Usando SQL Directo)
rolesCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (nombre) {
            campos.push('nombre = ?');
            valores.push(nombre);
        }
        if (descripcion) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            // Obtener datos anteriores para el log
            const [rolAnterior] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]);
            
            if (rolAnterior.length === 0) {
                // Registrar intento de actualizar rol inexistente
                const errorLog = new LogsErrores({
                    rolId: parseInt(id),
                    mensaje: `Intento de actualizar rol inexistente con ID: ${id}`,
                    tipoError: 'validation',
                    metodo: 'PUT',
                    userId: req.user?.id || null,
                    userRole: req.user?.role || 'unknown',
                    severidad: 'medium',
                    accionIntentan: 'Actualizar rol',
                    contextoAdicional: {
                        ip: req.ip,
                        userAgent: req.get('User-Agent'),
                        parametros: req.body
                    },
                    estado: true
                });
                await errorLog.save();
                
                return res.status(404).json({ error: 'Rol no encontrado.' });
            }

            valores.push(id);
            const consultaSQL = `UPDATE roles SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Rol no encontrado.' });
            }

            // Registrar actualización exitosa en MongoDB
            const logActualizacion = new LogsErrores({
                rolId: parseInt(id),
                mensaje: `Rol "${nombre || rolAnterior[0].nombre}" actualizado exitosamente`,
                tipoError: 'system',
                metodo: 'PUT',
                userId: req.user?.id || null,
                userRole: req.user?.role || 'system',
                severidad: 'low',
                accionIntentan: 'Actualizar rol',
                contextoAdicional: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    datosAnteriores: rolAnterior[0],
                    datosNuevos: req.body
                },
                resuelto: true,
                estado: true
            });
            await logActualizacion.save();
        }
        
        res.status(200).json({ message: 'Rol actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el rol:', error);
        
        // Registrar error en actualización
        try {
            const errorLog = new LogsErrores({
                rolId: parseInt(id),
                mensaje: `Error al actualizar rol: ${error.message}`,
                tipoError: 'system',
                stack: error.stack,
                metodo: 'PUT',
                userId: req.user?.id || null,
                userRole: req.user?.role || 'system',
                severidad: 'high',
                accionIntentan: 'Actualizar rol',
                contextoAdicional: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    parametros: req.body
                },
                estado: true
            });
            await errorLog.save();
        } catch (logError) {
            console.error('Error al registrar log de error:', logError);
        }
        
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR ROL (Usando SQL Directo)
rolesCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Obtener información del rol antes de eliminarlo
        const [rolInfo] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]);
        
        if (rolInfo.length === 0) {
            // Registrar intento de eliminar rol inexistente
            const errorLog = new LogsErrores({
                rolId: parseInt(id),
                mensaje: `Intento de eliminar rol inexistente con ID: ${id}`,
                tipoError: 'validation',
                metodo: 'DELETE',
                userId: req.user?.id || null,
                userRole: req.user?.role || 'unknown',
                severidad: 'medium',
                accionIntentan: 'Eliminar rol',
                contextoAdicional: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                },
                estado: true
            });
            await errorLog.save();
            
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }

        // Desactivar logs relacionados (eliminación lógica en MongoDB)
        await LogsErrores.updateMany(
            { rolId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE roles SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'",
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }

        // Registrar eliminación exitosa
        const logEliminacion = new LogsErrores({
            rolId: parseInt(id),
            mensaje: `Rol "${rolInfo[0].nombre}" eliminado exitosamente`,
            tipoError: 'system',
            metodo: 'DELETE',
            userId: req.user?.id || null,
            userRole: req.user?.role || 'system',
            severidad: 'medium',
            accionIntentan: 'Eliminar rol',
            contextoAdicional: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                rolEliminado: rolInfo[0]
            },
            resuelto: true,
            estado: true
        });
        await logEliminacion.save();
        
        res.status(200).json({ message: 'Rol y logs relacionados eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el rol:', error);
        
        // Registrar error en eliminación
        try {
            const errorLog = new LogsErrores({
                rolId: parseInt(id),
                mensaje: `Error al eliminar rol: ${error.message}`,
                tipoError: 'system',
                stack: error.stack,
                metodo: 'DELETE',
                userId: req.user?.id || null,
                userRole: req.user?.role || 'system',
                severidad: 'critical',
                accionIntentan: 'Eliminar rol',
                contextoAdicional: {
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                },
                estado: true
            });
            await errorLog.save();
        } catch (logError) {
            console.error('Error al registrar log de error:', logError);
        }
        
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR ROL CON ENCRIPTACIÓN
rolesCtl.mandarRole = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [rolesSQL] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [id]);
        
        if (rolesSQL.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }
        
        const rolSQL = rolesSQL[0];
        
        // Encriptar fechas sensibles
        const rolEncriptado = {
            ...rolSQL,
            fecha_creacion: rolSQL.fecha_creacion ? encryptDates(rolSQL.fecha_creacion) : null,
            fecha_modificacion: rolSQL.fecha_modificacion ? encryptDates(rolSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(rolEncriptado);
    } catch (error) {
        console.error('Error al mandar el rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA LOGS ERRORES (MongoDB) ---

// 8. OBTENER LOGS DE ERRORES DE UN ROL ESPECÍFICO
rolesCtl.getRoleLogs = async (req, res) => {
    const { rolId } = req.params;
    
    try {
        const logs = await LogsErrores.find({ 
            rolId: parseInt(rolId), 
            estado: true 
        }).sort({ fecha: -1 });
        
        res.status(200).json({
            message: 'Logs del rol obtenidos exitosamente',
            rolId: parseInt(rolId),
            logs: logs,
            total: logs.length
        });
    } catch (error) {
        console.error('Error al obtener logs del rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ROL COMPLETO CON TODOS SUS LOGS
rolesCtl.getRoleWithLogs = async (req, res) => {
    const { rolId } = req.params;
    
    try {
        // Obtener rol de MySQL
        const [rolesSQL] = await sql.promise().query("SELECT * FROM roles WHERE id = ? AND estado = 'activo'", [rolId]);
        
        if (rolesSQL.length === 0) {
            return res.status(404).json({ error: 'Rol no encontrado.' });
        }
        
        const rol = rolesSQL[0];
        
        // Obtener logs de MongoDB
        const logs = await LogsErrores.find({ 
            rolId: parseInt(rolId), 
            estado: true 
        }).sort({ fecha: -1 });
        
        res.status(200).json({
            message: 'Rol con logs obtenido exitosamente',
            rol: rol,
            logs: logs,
            totalLogs: logs.length,
            logsNoResueltos: logs.filter(log => !log.resuelto).length
        });
    } catch (error) {
        console.error('Error al obtener datos completos del rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. REGISTRAR ERROR MANUALMENTE PARA UN ROL
rolesCtl.logError = async (req, res) => {
    const { rolId } = req.params;
    const { mensaje, tipoError, severidad, accionIntentan, permisosFaltantes } = req.body;
    
    try {
        const newLog = new LogsErrores({
            rolId: parseInt(rolId),
            mensaje,
            tipoError: tipoError || 'system',
            metodo: req.method,
            userId: req.user?.id || null,
            userRole: req.user?.role || 'system',
            severidad: severidad || 'medium',
            accionIntentan: accionIntentan || 'Acción no especificada',
            permisosFaltantes: permisosFaltantes || [],
            contextoAdicional: {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                parametros: req.body
            },
            estado: true
        });
        
        await newLog.save();
        
        res.status(201).json({ 
            message: 'Error registrado exitosamente', 
            log: newLog 
        });
    } catch (error) {
        console.error('Error al registrar log:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. RESOLVER ERROR ESPECÍFICO
rolesCtl.resolveError = async (req, res) => {
    const { rolId, logId } = req.params;
    const { notasResolucion } = req.body;
    
    try {
        const updatedLog = await LogsErrores.findByIdAndUpdate(
            logId,
            { 
                resuelto: true,
                fechaResolucion: new Date(),
                notasResolucion: notasResolucion || 'Resuelto sin notas adicionales'
            },
            { new: true }
        );
        
        if (!updatedLog) {
            return res.status(404).json({ error: 'Log no encontrado.' });
        }
        
        res.status(200).json({ 
            message: 'Error resuelto exitosamente', 
            log: updatedLog 
        });
    } catch (error) {
        console.error('Error al resolver log:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. OBTENER ESTADÍSTICAS DE ERRORES POR ROL
rolesCtl.getErrorStats = async (req, res) => {
    const { rolId } = req.params;
    
    try {
        const stats = await LogsErrores.aggregate([
            { $match: { rolId: parseInt(rolId), estado: true } },
            {
                $group: {
                    _id: '$tipoError',
                    count: { $sum: 1 },
                    severidadPromedio: { $first: '$severidad' },
                    ultimoError: { $max: '$fecha' }
                }
            }
        ]);
        
        const totalErrores = await LogsErrores.countDocuments({ 
            rolId: parseInt(rolId), 
            estado: true 
        });
        
        const erroresNoResueltos = await LogsErrores.countDocuments({ 
            rolId: parseInt(rolId), 
            estado: true, 
            resuelto: false 
        });
        
        res.status(200).json({
            message: 'Estadísticas de errores obtenidas exitosamente',
            rolId: parseInt(rolId),
            totalErrores,
            erroresNoResueltos,
            erroresResueltos: totalErrores - erroresNoResueltos,
            estadisticasPorTipo: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. LIMPIAR LOGS ANTIGUOS (ELIMINACIÓN FÍSICA)
rolesCtl.cleanOldLogs = async (req, res) => {
    const { rolId } = req.params;
    const { diasAtras = 30 } = req.body;
    
    try {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - diasAtras);
        
        const result = await LogsErrores.deleteMany({
            rolId: parseInt(rolId),
            fecha: { $lt: fechaLimite },
            resuelto: true
        });
        
        res.status(200).json({ 
            message: 'Logs antiguos eliminados exitosamente', 
            eliminados: result.deletedCount 
        });
    } catch (error) {
        console.error('Error al limpiar logs:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. BUSCAR ROLES
rolesCtl.searchRoles = async (req, res) => {
    const { q, estado } = req.query;
    
    try {
        let query = `
            SELECT r.*,
                   COUNT(u.id) as usuarios_asignados
            FROM roles r
            LEFT JOIN users u ON r.id = u.roleId AND u.estado = 'activo'
            WHERE r.estado != 'eliminado'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (r.nombre LIKE ? OR r.descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (estado) {
            query += ` AND r.estado = ?`;
            params.push(estado);
        }
        
        query += ` GROUP BY r.id ORDER BY r.nombre ASC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de roles realizada exitosamente',
            resultados: resultados,
            filtros: { q, estado },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar roles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. OBTENER ESTADÍSTICAS GENERALES DE ROLES
rolesCtl.getGeneralStats = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(CASE WHEN r.estado = 'activo' THEN 1 END) as roles_activos,
                COUNT(CASE WHEN r.estado = 'inactivo' THEN 1 END) as roles_inactivos,
                COUNT(CASE WHEN r.estado = 'eliminado' THEN 1 END) as roles_eliminados,
                COUNT(u.id) as total_usuarios_con_rol,
                COUNT(DISTINCT u.roleId) as roles_en_uso,
                COUNT(r.id) as total_roles
            FROM roles r
            LEFT JOIN users u ON r.id = u.roleId AND u.estado = 'activo'
            WHERE r.estado != 'eliminado'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de roles obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = rolesCtl;
