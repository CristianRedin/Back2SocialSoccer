// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const tarjetasCtl = {};

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

// --- CRUD de Tarjetas ---

// 1. CREAR NUEVA TARJETA
tarjetasCtl.createTarjeta = async (req, res) => {
    const { tipo, minuto, jugador, equipo, partido_id, descripcion } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaTarjetaSQL = {
            tipo: tipo, // 'amarilla', 'roja', 'doble_amarilla'
            minuto: minuto || 0,
            jugador: jugador,
            equipo: equipo,
            partido_id: partido_id,
            descripcion: descripcion || '',
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const tarjetaGuardadaSQL = await orm.tarjetas.create(nuevaTarjetaSQL);
        
        res.status(201).json({ 
            message: 'Tarjeta creada exitosamente',
            tarjeta: tarjetaGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS TARJETAS (Usando SQL Directo)
tarjetasCtl.getAllTarjetas = async (req, res) => {
    try {
        const [tarjetasSQL] = await sql.promise().query("SELECT * FROM tarjetas WHERE estado = 'activo' ORDER BY minuto ASC");
        
        res.status(200).json(tarjetasSQL);
    } catch (error) {
        console.error('Error al obtener todas las tarjetas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER TARJETA POR ID (Usando SQL Directo)
tarjetasCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [tarjetasSQL] = await sql.promise().query("SELECT * FROM tarjetas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (tarjetasSQL.length === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada.' });
        }
        
        const tarjetaSQL = tarjetasSQL[0];
        
        res.status(200).json(tarjetaSQL);
    } catch (error) {
        console.error('Error al obtener la tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR TARJETAS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
tarjetasCtl.mostrarTarjetas = async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   j.numero as jugador_numero,
                   e.nombre as equipo_nombre,
                   e.escudo as equipo_escudo,
                   p.equipoLocal,
                   p.equipoVisitante,
                   CASE 
                     WHEN t.tipo = 'amarilla' THEN '🟡'
                     WHEN t.tipo = 'roja' THEN '🔴'
                     WHEN t.tipo = 'doble_amarilla' THEN '🟡🔴'
                     ELSE '⚽'
                   END as icono_tarjeta,
                   CASE 
                     WHEN t.minuto <= 15 THEN 'Primer tiempo - Inicial'
                     WHEN t.minuto <= 45 THEN 'Primer tiempo'
                     WHEN t.minuto <= 60 THEN 'Segundo tiempo - Inicial'
                     WHEN t.minuto <= 90 THEN 'Segundo tiempo'
                     ELSE 'Tiempo extra'
                   END as periodo_juego,
                   CONCAT(j.nombre, ' ', j.apellido) as jugador_completo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            LEFT JOIN resultados p ON t.partido_id = p.id
            WHERE t.estado = 'activo'
            ORDER BY t.minuto ASC, t.tipo DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Tarjetas con información detallada obtenidas exitosamente',
            tarjetas: data,
            total: data.length,
            estadisticas: {
                amarillas: data.filter(t => t.tipo === 'amarilla').length,
                rojas: data.filter(t => t.tipo === 'roja').length,
                doble_amarillas: data.filter(t => t.tipo === 'doble_amarilla').length
            }
        });
    } catch (error) {
        console.error('Error al mostrar las tarjetas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR TARJETA (Usando SQL Directo)
tarjetasCtl.update = async (req, res) => {
    const { id } = req.params;
    const { tipo, minuto, jugador, equipo, partido_id, descripcion } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (tipo) {
            campos.push('tipo = ?');
            valores.push(tipo);
        }
        if (minuto !== undefined) {
            campos.push('minuto = ?');
            valores.push(minuto);
        }
        if (jugador) {
            campos.push('jugador = ?');
            valores.push(jugador);
        }
        if (equipo) {
            campos.push('equipo = ?');
            valores.push(equipo);
        }
        if (partido_id !== undefined) {
            campos.push('partido_id = ?');
            valores.push(partido_id);
        }
        if (descripcion) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE tarjetas SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Tarjeta no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Tarjeta actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR TARJETA (Usando SQL Directo)
tarjetasCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE tarjetas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada.' });
        }
        
        res.status(200).json({ message: 'Tarjeta eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR TARJETA CON ENCRIPTACIÓN
tarjetasCtl.mandarTarjeta = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [tarjetasSQL] = await sql.promise().query("SELECT * FROM tarjetas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (tarjetasSQL.length === 0) {
            return res.status(404).json({ error: 'Tarjeta no encontrada.' });
        }
        
        const tarjetaSQL = tarjetasSQL[0];
        
        // Encriptar fechas sensibles
        const tarjetaEncriptada = {
            ...tarjetaSQL,
            fecha_creacion: tarjetaSQL.fecha_creacion ? encryptDates(tarjetaSQL.fecha_creacion) : null,
            fecha_modificacion: tarjetaSQL.fecha_modificacion ? encryptDates(tarjetaSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(tarjetaEncriptada);
    } catch (error) {
        console.error('Error al mandar la tarjeta:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA TARJETAS ---

// 8. OBTENER TARJETAS POR TIPO
tarjetasCtl.getTarjetasByTipo = async (req, res) => {
    const { tipo } = req.params;
    
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   e.nombre as equipo_nombre,
                   CONCAT(j.nombre, ' ', j.apellido) as jugador_completo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            WHERE t.tipo = ? AND t.estado = 'activo'
            ORDER BY t.minuto ASC
        `;
        
        const [tarjetas] = await sql.promise().query(query, [tipo]);
        
        res.status(200).json({
            message: `Tarjetas ${tipo} obtenidas exitosamente`,
            tipo: tipo,
            tarjetas: tarjetas,
            total: tarjetas.length
        });
    } catch (error) {
        console.error('Error al obtener tarjetas por tipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER TARJETAS POR JUGADOR
tarjetasCtl.getTarjetasByJugador = async (req, res) => {
    const { jugador } = req.params;
    
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   e.nombre as equipo_nombre,
                   p.equipoLocal,
                   p.equipoVisitante,
                   p.fecha as fecha_partido
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            LEFT JOIN resultados p ON t.partido_id = p.id
            WHERE t.jugador LIKE ? AND t.estado = 'activo'
            ORDER BY t.minuto DESC
        `;
        
        const [tarjetas] = await sql.promise().query(query, [`%${jugador}%`]);
        
        // Calcular estadísticas del jugador
        const stats = tarjetas.reduce((acc, tarjeta) => {
            if (tarjeta.tipo === 'amarilla') acc.amarillas++;
            else if (tarjeta.tipo === 'roja') acc.rojas++;
            else if (tarjeta.tipo === 'doble_amarilla') acc.doble_amarillas++;
            return acc;
        }, { amarillas: 0, rojas: 0, doble_amarillas: 0 });
        
        res.status(200).json({
            message: `Tarjetas del jugador ${jugador} obtenidas exitosamente`,
            jugador: jugador,
            tarjetas: tarjetas,
            estadisticas: stats,
            total: tarjetas.length
        });
    } catch (error) {
        console.error('Error al obtener tarjetas por jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER TARJETAS POR EQUIPO
tarjetasCtl.getTarjetasByEquipo = async (req, res) => {
    const { equipo } = req.params;
    
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   CONCAT(j.nombre, ' ', j.apellido) as jugador_completo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            WHERE t.equipo = ? AND t.estado = 'activo'
            ORDER BY t.minuto ASC
        `;
        
        const [tarjetas] = await sql.promise().query(query, [equipo]);
        
        // Calcular estadísticas del equipo
        const stats = tarjetas.reduce((acc, tarjeta) => {
            if (tarjeta.tipo === 'amarilla') acc.amarillas++;
            else if (tarjeta.tipo === 'roja') acc.rojas++;
            else if (tarjeta.tipo === 'doble_amarilla') acc.doble_amarillas++;
            return acc;
        }, { amarillas: 0, rojas: 0, doble_amarillas: 0 });
        
        res.status(200).json({
            message: `Tarjetas del equipo ${equipo} obtenidas exitosamente`,
            equipo: equipo,
            tarjetas: tarjetas,
            estadisticas: stats,
            total: tarjetas.length
        });
    } catch (error) {
        console.error('Error al obtener tarjetas por equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. OBTENER TARJETAS POR PARTIDO
tarjetasCtl.getTarjetasByPartido = async (req, res) => {
    const { partido_id } = req.params;
    
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   e.nombre as equipo_nombre,
                   p.equipoLocal,
                   p.equipoVisitante,
                   CONCAT(j.nombre, ' ', j.apellido) as jugador_completo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            LEFT JOIN resultados p ON t.partido_id = p.id
            WHERE t.partido_id = ? AND t.estado = 'activo'
            ORDER BY t.minuto ASC
        `;
        
        const [tarjetas] = await sql.promise().query(query, [partido_id]);
        
        res.status(200).json({
            message: `Tarjetas del partido ${partido_id} obtenidas exitosamente`,
            partido_id: partido_id,
            tarjetas: tarjetas,
            total: tarjetas.length
        });
    } catch (error) {
        console.error('Error al obtener tarjetas por partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. OBTENER ESTADÍSTICAS GENERALES DE TARJETAS
tarjetasCtl.getEstadisticasGenerales = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(*) as total_tarjetas,
                COUNT(CASE WHEN tipo = 'amarilla' THEN 1 END) as tarjetas_amarillas,
                COUNT(CASE WHEN tipo = 'roja' THEN 1 END) as tarjetas_rojas,
                COUNT(CASE WHEN tipo = 'doble_amarilla' THEN 1 END) as tarjetas_doble_amarilla,
                ROUND(AVG(minuto), 2) as promedio_minuto,
                MAX(minuto) as minuto_maximo,
                MIN(minuto) as minuto_minimo,
                COUNT(DISTINCT jugador) as jugadores_sancionados,
                COUNT(DISTINCT equipo) as equipos_sancionados,
                COUNT(DISTINCT partido_id) as partidos_con_tarjetas
            FROM tarjetas 
            WHERE estado = 'activo'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de tarjetas obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. BUSCAR TARJETAS
tarjetasCtl.searchTarjetas = async (req, res) => {
    const { q, tipo, minuto_min, minuto_max, equipo } = req.query;
    
    try {
        let query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   e.nombre as equipo_nombre,
                   CONCAT(j.nombre, ' ', j.apellido) as jugador_completo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            WHERE t.estado = 'activo'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (t.jugador LIKE ? OR t.equipo LIKE ? OR t.descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }
        
        if (tipo) {
            query += ` AND t.tipo = ?`;
            params.push(tipo);
        }
        
        if (minuto_min) {
            query += ` AND t.minuto >= ?`;
            params.push(parseInt(minuto_min));
        }
        
        if (minuto_max) {
            query += ` AND t.minuto <= ?`;
            params.push(parseInt(minuto_max));
        }
        
        if (equipo) {
            query += ` AND t.equipo = ?`;
            params.push(equipo);
        }
        
        query += ` ORDER BY t.minuto ASC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de tarjetas realizada exitosamente',
            resultados: resultados,
            filtros: { q, tipo, minuto_min, minuto_max, equipo },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar tarjetas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. OBTENER RANKING DE JUGADORES CON MÁS TARJETAS
tarjetasCtl.getRankingJugadoresTarjetas = async (req, res) => {
    const { limite = 10 } = req.query;
    
    try {
        const query = `
            SELECT 
                t.jugador,
                COUNT(*) as total_tarjetas,
                COUNT(CASE WHEN t.tipo = 'amarilla' THEN 1 END) as amarillas,
                COUNT(CASE WHEN t.tipo = 'roja' THEN 1 END) as rojas,
                COUNT(CASE WHEN t.tipo = 'doble_amarilla' THEN 1 END) as doble_amarillas,
                j.nombre as jugador_nombre,
                j.apellido as jugador_apellido,
                j.equipo as jugador_equipo
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            WHERE t.estado = 'activo'
            GROUP BY t.jugador
            ORDER BY total_tarjetas DESC, rojas DESC, amarillas DESC
            LIMIT ?
        `;
        
        const [ranking] = await sql.promise().query(query, [parseInt(limite)]);
        
        res.status(200).json({
            message: `Top ${limite} jugadores con más tarjetas obtenido exitosamente`,
            ranking: ranking,
            total: ranking.length
        });
    } catch (error) {
        console.error('Error al obtener ranking de jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. OBTENER TARJETAS POR RANGO DE MINUTOS
tarjetasCtl.getTarjetasByMinutos = async (req, res) => {
    const { minuto_min = 0, minuto_max = 90 } = req.query;
    
    try {
        const query = `
            SELECT t.*, 
                   j.nombre as jugador_nombre,
                   j.apellido as jugador_apellido,
                   e.nombre as equipo_nombre,
                   CASE 
                     WHEN t.minuto <= 15 THEN 'Primer tiempo - Inicial'
                     WHEN t.minuto <= 45 THEN 'Primer tiempo'
                     WHEN t.minuto <= 60 THEN 'Segundo tiempo - Inicial'
                     WHEN t.minuto <= 90 THEN 'Segundo tiempo'
                     ELSE 'Tiempo extra'
                   END as periodo_juego
            FROM tarjetas t
            LEFT JOIN jugadores j ON t.jugador = CONCAT(j.nombre, ' ', j.apellido)
            LEFT JOIN teams e ON t.equipo = e.nombre
            WHERE t.estado = 'activo' 
            AND t.minuto >= ? AND t.minuto <= ?
            ORDER BY t.minuto ASC
        `;
        
        const [tarjetas] = await sql.promise().query(query, [parseInt(minuto_min), parseInt(minuto_max)]);
        
        res.status(200).json({
            message: `Tarjetas entre minuto ${minuto_min} y ${minuto_max} obtenidas exitosamente`,
            tarjetas: tarjetas,
            rango: { minuto_min, minuto_max },
            total: tarjetas.length
        });
    } catch (error) {
        console.error('Error al obtener tarjetas por rango de minutos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = tarjetasCtl;
