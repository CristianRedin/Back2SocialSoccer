// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const detalleResultadosCtl = {};

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

// --- CRUD de Detalle Resultados ---

// 1. CREAR NUEVO DETALLE DE RESULTADO
detalleResultadosCtl.createDetalleResultado = async (req, res) => {
    const { resultadoId, playerId, goles, asistencias, minutos_jugados, tarjetas_amarillas, tarjetas_rojas, observaciones } = req.body;
    try {
        // Validación: Verificar si la relación ya existe
        const [existingRelation] = await sql.promise().query(
            "SELECT * FROM detalleResultados WHERE resultadoId = ? AND playerId = ? AND estado = 'activo'", 
            [resultadoId, playerId]
        );

        if (existingRelation.length > 0) {
            return res.status(400).json({ error: 'Ya existe un detalle de resultado para este jugador y resultado.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoDetalleSQL = {
            resultadoId: resultadoId,
            playerId: playerId,
            goles: goles || 0,
            asistencias: asistencias || 0,
            minutos_jugados: minutos_jugados || 0,
            tarjetas_amarillas: tarjetas_amarillas || 0,
            tarjetas_rojas: tarjetas_rojas || 0,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const detalleGuardadoSQL = await orm.detalleResultados.create(nuevoDetalleSQL);
        
        res.status(201).json({ 
            message: 'Detalle de resultado creado exitosamente',
            detalleResultado: detalleGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el detalle de resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS DETALLES DE RESULTADOS (Usando SQL Directo)
detalleResultadosCtl.getAllDetalleResultados = async (req, res) => {
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleResultados WHERE estado = 'activo' ORDER BY goles DESC, asistencias DESC");
        
        res.status(200).json(detallesSQL);
    } catch (error) {
        console.error('Error al obtener todos los detalles de resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLE DE RESULTADO POR ID (Usando SQL Directo)
detalleResultadosCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleResultados WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de resultado no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        res.status(200).json(detalleSQL);
    } catch (error) {
        console.error('Error al obtener el detalle de resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DETALLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
detalleResultadosCtl.mostrarDetalleResultados = async (req, res) => {
    try {
        const query = `
            SELECT dr.*, 
                   r.fecha_partido as resultado_fecha,
                   r.goles_local as resultado_goles_local,
                   r.goles_visitante as resultado_goles_visitante,
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   m.fecha as partido_fecha,
                   tl.nombre as equipo_local,
                   tv.nombre as equipo_visitante,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo,
                   (dr.goles + dr.asistencias) as contribuciones_totales,
                   CASE 
                     WHEN dr.minutos_jugados >= 90 THEN 'Titular Completo'
                     WHEN dr.minutos_jugados >= 45 THEN 'Participación Significativa'
                     WHEN dr.minutos_jugados > 0 THEN 'Suplente'
                     ELSE 'No Jugó'
                   END as tipo_participacion,
                   CASE 
                     WHEN dr.tarjetas_rojas > 0 THEN 'Expulsado'
                     WHEN dr.tarjetas_amarillas > 1 THEN 'Amonestado Múltiple'
                     WHEN dr.tarjetas_amarillas = 1 THEN 'Amonestado'
                     ELSE 'Sin Sanciones'
                   END as estado_disciplinario
            FROM detalleResultados dr
            LEFT JOIN resultados r ON dr.resultadoId = r.id
            LEFT JOIN players p ON dr.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            LEFT JOIN matches m ON r.matchId = m.id
            LEFT JOIN teams tl ON m.equipoLocalId = tl.id
            LEFT JOIN teams tv ON m.equipoVisitanteId = tv.id
            WHERE dr.estado = 'activo'
            ORDER BY dr.goles DESC, dr.asistencias DESC, p.apellido
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Detalles de resultados con información detallada obtenidos exitosamente',
            detalleResultados: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los detalles de resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DETALLE DE RESULTADO (Usando SQL Directo)
detalleResultadosCtl.update = async (req, res) => {
    const { id } = req.params;
    const { resultadoId, playerId, goles, asistencias, minutos_jugados, tarjetas_amarillas, tarjetas_rojas, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (resultadoId) {
            campos.push('resultadoId = ?');
            valores.push(resultadoId);
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
        if (minutos_jugados !== undefined) {
            campos.push('minutos_jugados = ?');
            valores.push(minutos_jugados);
        }
        if (tarjetas_amarillas !== undefined) {
            campos.push('tarjetas_amarillas = ?');
            valores.push(tarjetas_amarillas);
        }
        if (tarjetas_rojas !== undefined) {
            campos.push('tarjetas_rojas = ?');
            valores.push(tarjetas_rojas);
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
            const consultaSQL = `UPDATE detalleResultados SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Detalle de resultado no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Detalle de resultado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el detalle de resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DETALLE DE RESULTADO (Usando SQL Directo)
detalleResultadosCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE detalleResultados SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Detalle de resultado no encontrado.' });
        }
        
        res.status(200).json({ message: 'Detalle de resultado eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el detalle de resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DETALLE CON ENCRIPTACIÓN
detalleResultadosCtl.mandarDetalleResultado = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleResultados WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de resultado no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        // Encriptar fechas sensibles
        const detalleEncriptado = {
            ...detalleSQL,
            fecha_creacion: detalleSQL.fecha_creacion ? encryptDates(detalleSQL.fecha_creacion) : null,
            fecha_modificacion: detalleSQL.fecha_modificacion ? encryptDates(detalleSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(detalleEncriptado);
    } catch (error) {
        console.error('Error al mandar el detalle de resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER DETALLES POR JUGADOR
detalleResultadosCtl.getDetallesByJugador = async (req, res) => {
    const { playerId } = req.params;
    
    try {
        const query = `
            SELECT dr.*, 
                   r.fecha_partido as resultado_fecha,
                   m.fecha as partido_fecha,
                   tl.nombre as equipo_local,
                   tv.nombre as equipo_visitante,
                   (dr.goles + dr.asistencias) as contribuciones_totales
            FROM detalleResultados dr
            LEFT JOIN resultados r ON dr.resultadoId = r.id
            LEFT JOIN matches m ON r.matchId = m.id
            LEFT JOIN teams tl ON m.equipoLocalId = tl.id
            LEFT JOIN teams tv ON m.equipoVisitanteId = tv.id
            WHERE dr.playerId = ? AND dr.estado = 'activo'
            ORDER BY r.fecha_partido DESC
        `;
        
        const [detalles] = await sql.promise().query(query, [playerId]);
        
        res.status(200).json({
            message: 'Detalles del jugador obtenidos exitosamente',
            detalles: detalles,
            total: detalles.length
        });
    } catch (error) {
        console.error('Error al obtener los detalles del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER MÁXIMOS GOLEADORES POR PARTIDO
detalleResultadosCtl.getMaximosGoleadoresPartido = async (req, res) => {
    try {
        const query = `
            SELECT dr.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   t.nombre as equipo_nombre,
                   r.fecha_partido as resultado_fecha,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleResultados dr
            LEFT JOIN players p ON dr.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            LEFT JOIN resultados r ON dr.resultadoId = r.id
            WHERE dr.estado = 'activo' AND dr.goles > 0
            ORDER BY dr.goles DESC, dr.asistencias DESC
            LIMIT 20
        `;
        
        const [maximosGoleadores] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Máximos goleadores por partido obtenidos exitosamente',
            goleadores: maximosGoleadores,
            total: maximosGoleadores.length
        });
    } catch (error) {
        console.error('Error al obtener los máximos goleadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER ESTADÍSTICAS DE RENDIMIENTO
detalleResultadosCtl.getEstadisticasRendimiento = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_participaciones,
                SUM(dr.goles) as total_goles,
                SUM(dr.asistencias) as total_asistencias,
                AVG(dr.goles) as promedio_goles,
                AVG(dr.asistencias) as promedio_asistencias,
                AVG(dr.minutos_jugados) as promedio_minutos,
                SUM(dr.tarjetas_amarillas) as total_amarillas,
                SUM(dr.tarjetas_rojas) as total_rojas,
                MAX(dr.goles) as max_goles_partido,
                MAX(dr.asistencias) as max_asistencias_partido
            FROM detalleResultados dr
            WHERE dr.estado = 'activo'
        `;
        
        const [estadisticas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas de rendimiento obtenidas exitosamente',
            estadisticas: estadisticas[0]
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas de rendimiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = detalleResultadosCtl;
