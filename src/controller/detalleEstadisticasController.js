// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encrypDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const detalleEstadisticasCtl = {};

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

// --- CRUD de Detalle Estadísticas ---

// 1. CREAR NUEVO DETALLE DE ESTADÍSTICA
detalleEstadisticasCtl.createDetalleEstadistica = async (req, res) => {
    const { estadisticaId, playerId, goles, asistencias, tarjetas_amarillas, tarjetas_rojas, minutos_jugados, observaciones } = req.body;
    try {
        // Validación: Verificar si la relación ya existe
        const [existingRelation] = await sql.promise().query(
            "SELECT * FROM detalleEstadisticas WHERE estadisticaId = ? AND playerId = ? AND estado = 'activo'", 
            [estadisticaId, playerId]
        );

        if (existingRelation.length > 0) {
            return res.status(400).json({ error: 'Ya existe un detalle de estadística para este jugador y estadística.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoDetalleSQL = {
            estadisticaId: estadisticaId,
            playerId: playerId,
            goles: goles || 0,
            asistencias: asistencias || 0,
            tarjetas_amarillas: tarjetas_amarillas || 0,
            tarjetas_rojas: tarjetas_rojas || 0,
            minutos_jugados: minutos_jugados || 0,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const detalleGuardadoSQL = await orm.detalleEstadisticas.create(nuevoDetalleSQL);
        
        res.status(201).json({ 
            message: 'Detalle de estadística creado exitosamente',
            detalleEstadistica: detalleGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el detalle de estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS DETALLES DE ESTADÍSTICAS (Usando SQL Directo)
detalleEstadisticasCtl.getAllDetalleEstadisticas = async (req, res) => {
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleEstadisticas WHERE estado = 'activo' ORDER BY goles DESC, asistencias DESC");
        
        res.status(200).json(detallesSQL);
    } catch (error) {
        console.error('Error al obtener todos los detalles de estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLE DE ESTADÍSTICA POR ID (Usando SQL Directo)
detalleEstadisticasCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleEstadisticas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de estadística no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        res.status(200).json(detalleSQL);
    } catch (error) {
        console.error('Error al obtener el detalle de estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DETALLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
detalleEstadisticasCtl.mostrarDetalleEstadisticas = async (req, res) => {
    try {
        const query = `
            SELECT de.*, 
                   e.temporada as estadistica_temporada,
                   e.descripcion as estadistica_descripcion,
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo,
                   (de.goles + de.asistencias) as contribuciones_totales,
                   CASE 
                     WHEN de.minutos_jugados > 0 THEN ROUND((de.goles / de.minutos_jugados) * 90, 2)
                     ELSE 0
                   END as goles_por_90min,
                   CASE 
                     WHEN de.tarjetas_rojas > 0 THEN 'Disciplina Crítica'
                     WHEN de.tarjetas_amarillas > 2 THEN 'Disciplina Regular'
                     ELSE 'Buena Disciplina'
                   END as estado_disciplinario
            FROM detalleEstadisticas de
            LEFT JOIN estadisticas e ON de.estadisticaId = e.id
            LEFT JOIN players p ON de.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE de.estado = 'activo'
            ORDER BY de.goles DESC, de.asistencias DESC, p.apellido
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Detalles de estadísticas con información detallada obtenidos exitosamente',
            detalleEstadisticas: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los detalles de estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DETALLE DE ESTADÍSTICA (Usando SQL Directo)
detalleEstadisticasCtl.update = async (req, res) => {
    const { id } = req.params;
    const { estadisticaId, playerId, goles, asistencias, tarjetas_amarillas, tarjetas_rojas, minutos_jugados, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (estadisticaId) {
            campos.push('estadisticaId = ?');
            valores.push(estadisticaId);
        }
        if (playerId) {
            campos.push('playerId = ?');
            valores.push(playerId);
        }
        if (goles !== undefined) {
            campos.push('goles = ?');
            valores.push(goles);
        }
        if (asistencias !== undefined) {
            campos.push('asistencias = ?');
            valores.push(asistencias);
        }
        if (tarjetas_amarillas !== undefined) {
            campos.push('tarjetas_amarillas = ?');
            valores.push(tarjetas_amarillas);
        }
        if (tarjetas_rojas !== undefined) {
            campos.push('tarjetas_rojas = ?');
            valores.push(tarjetas_rojas);
        }
        if (minutos_jugados !== undefined) {
            campos.push('minutos_jugados = ?');
            valores.push(minutos_jugados);
        }
        if (observaciones !== undefined) {
            campos.push('observaciones = ?');
            valores.push(observaciones);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE detalleEstadisticas SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Detalle de estadística no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Detalle de estadística actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el detalle de estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DETALLE DE ESTADÍSTICA (Usando SQL Directo)
detalleEstadisticasCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE detalleEstadisticas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Detalle de estadística no encontrado.' });
        }
        
        res.status(200).json({ message: 'Detalle de estadística eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el detalle de estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DETALLE CON ENCRIPTACIÓN
detalleEstadisticasCtl.mandarDetalleEstadistica = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleEstadisticas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de estadística no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        // Encriptar fechas sensibles
        const detalleEncriptado = {
            ...detalleSQL,
            fecha_creacion: detalleSQL.fecha_creacion ? encrypDates(detalleSQL.fecha_creacion) : null,
            fecha_modificacion: detalleSQL.fecha_modificacion ? encrypDates(detalleSQL.fecha_modificacion) : null,
            fechaConsulta: encrypDates(new Date())
        };
        
        res.status(200).json(detalleEncriptado);
    } catch (error) {
        console.error('Error al mandar el detalle de estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER ESTADÍSTICAS POR JUGADOR
detalleEstadisticasCtl.getEstadisticasByJugador = async (req, res) => {
    const { playerId } = req.params;
    
    try {
        const query = `
            SELECT de.*, 
                   e.temporada as estadistica_temporada,
                   e.descripcion as estadistica_descripcion,
                   (de.goles + de.asistencias) as contribuciones_totales
            FROM detalleEstadisticas de
            LEFT JOIN estadisticas e ON de.estadisticaId = e.id
            WHERE de.playerId = ? AND de.estado = 'activo'
            ORDER BY e.temporada DESC, de.goles DESC
        `;
        
        const [estadisticas] = await sql.promise().query(query, [playerId]);
        
        res.status(200).json({
            message: 'Estadísticas del jugador obtenidas exitosamente',
            estadisticas: estadisticas,
            total: estadisticas.length
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER MÁXIMOS GOLEADORES
detalleEstadisticasCtl.getMaximosGoleadores = async (req, res) => {
    try {
        const query = `
            SELECT de.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleEstadisticas de
            LEFT JOIN players p ON de.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE de.estado = 'activo' AND de.goles > 0
            ORDER BY de.goles DESC
            LIMIT 10
        `;
        
        const [maximosGoleadores] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Máximos goleadores obtenidos exitosamente',
            goleadores: maximosGoleadores,
            total: maximosGoleadores.length
        });
    } catch (error) {
        console.error('Error al obtener los máximos goleadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER RESUMEN DE ESTADÍSTICAS POR TEMPORADA
detalleEstadisticasCtl.getResumenPorTemporada = async (req, res) => {
    const { temporada } = req.params;
    
    try {
        const query = `
            SELECT 
                COUNT(*) as total_jugadores,
                SUM(de.goles) as total_goles,
                SUM(de.asistencias) as total_asistencias,
                SUM(de.tarjetas_amarillas) as total_amarillas,
                SUM(de.tarjetas_rojas) as total_rojas,
                AVG(de.goles) as promedio_goles,
                AVG(de.asistencias) as promedio_asistencias,
                MAX(de.goles) as max_goles_jugador,
                MAX(de.asistencias) as max_asistencias_jugador
            FROM detalleEstadisticas de
            LEFT JOIN estadisticas e ON de.estadisticaId = e.id
            WHERE e.temporada = ? AND de.estado = 'activo'
        `;
        
        const [resumen] = await sql.promise().query(query, [temporada]);
        
        res.status(200).json({
            message: `Resumen de estadísticas de la temporada ${temporada} obtenido exitosamente`,
            resumen: resumen[0],
            temporada: temporada
        });
    } catch (error) {
        console.error('Error al obtener el resumen por temporada:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = detalleEstadisticasCtl;
