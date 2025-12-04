// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const resultadosCtl = {};

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

// --- CRUD de Resultados ---

// 1. CREAR NUEVO RESULTADO
resultadosCtl.createResultado = async (req, res) => {
    const { equipoLocal, equipoVisitante, golesLocal, golesVisitante, fecha, jornada, temporada, arbitro } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoResultadoSQL = {
            equipoLocal: equipoLocal,
            equipoVisitante: equipoVisitante,
            golesLocal: golesLocal || 0,
            golesVisitante: golesVisitante || 0,
            fecha: fecha ? new Date(fecha) : new Date(),
            jornada: jornada || 1,
            temporada: temporada || "2024-2025",
            arbitro: arbitro,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const resultadoGuardadoSQL = await orm.resultados.create(nuevoResultadoSQL);
        
        res.status(201).json({ 
            message: 'Resultado creado exitosamente',
            resultado: resultadoGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS RESULTADOS (Usando SQL Directo)
resultadosCtl.getAllResultados = async (req, res) => {
    try {
        const [resultadosSQL] = await sql.promise().query("SELECT * FROM resultados WHERE estado = 'activo' ORDER BY fecha DESC, jornada DESC");
        
        res.status(200).json(resultadosSQL);
    } catch (error) {
        console.error('Error al obtener todos los resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER RESULTADO POR ID (Usando SQL Directo)
resultadosCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [resultadosSQL] = await sql.promise().query("SELECT * FROM resultados WHERE id = ? AND estado = 'activo'", [id]);
        
        if (resultadosSQL.length === 0) {
            return res.status(404).json({ error: 'Resultado no encontrado.' });
        }
        
        const resultadoSQL = resultadosSQL[0];
        
        res.status(200).json(resultadoSQL);
    } catch (error) {
        console.error('Error al obtener el resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR RESULTADOS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
resultadosCtl.mostrarResultados = async (req, res) => {
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tl.escudo as equipoLocal_escudo,
                   tv.nombre as equipoVisitante_nombre,
                   tv.escudo as equipoVisitante_escudo,
                   ref.nombre as arbitro_nombre,
                   ref.apellido as arbitro_apellido,
                   (r.golesLocal + r.golesVisitante) as total_goles,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN tl.nombre
                     WHEN r.golesVisitante > r.golesLocal THEN tv.nombre
                     ELSE 'Empate'
                   END as ganador,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN 'Victoria Local'
                     WHEN r.golesVisitante > r.golesLocal THEN 'Victoria Visitante'
                     ELSE 'Empate'
                   END as resultado_tipo,
                   ABS(r.golesLocal - r.golesVisitante) as diferencia_goles
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            LEFT JOIN referees ref ON r.arbitro = CONCAT(ref.nombre, ' ', ref.apellido)
            WHERE r.estado = 'activo'
            ORDER BY r.fecha DESC, r.jornada DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Resultados con información detallada obtenidos exitosamente',
            resultados: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR RESULTADO (Usando SQL Directo)
resultadosCtl.update = async (req, res) => {
    const { id } = req.params;
    const { equipoLocal, equipoVisitante, golesLocal, golesVisitante, fecha, jornada, temporada, arbitro } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (equipoLocal) {
            campos.push('equipoLocal = ?');
            valores.push(equipoLocal);
        }
        if (equipoVisitante) {
            campos.push('equipoVisitante = ?');
            valores.push(equipoVisitante);
        }
        if (golesLocal !== undefined) {
            campos.push('golesLocal = ?');
            valores.push(golesLocal);
        }
        if (golesVisitante !== undefined) {
            campos.push('golesVisitante = ?');
            valores.push(golesVisitante);
        }
        if (fecha) {
            campos.push('fecha = ?');
            valores.push(new Date(fecha));
        }
        if (jornada !== undefined) {
            campos.push('jornada = ?');
            valores.push(jornada);
        }
        if (temporada) {
            campos.push('temporada = ?');
            valores.push(temporada);
        }
        if (arbitro) {
            campos.push('arbitro = ?');
            valores.push(arbitro);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE resultados SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Resultado no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Resultado actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR RESULTADO (Usando SQL Directo)
resultadosCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE resultados SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Resultado no encontrado.' });
        }
        
        res.status(200).json({ message: 'Resultado eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR RESULTADO CON ENCRIPTACIÓN
resultadosCtl.mandarResultado = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [resultadosSQL] = await sql.promise().query("SELECT * FROM resultados WHERE id = ? AND estado = 'activo'", [id]);
        
        if (resultadosSQL.length === 0) {
            return res.status(404).json({ error: 'Resultado no encontrado.' });
        }
        
        const resultadoSQL = resultadosSQL[0];
        
        // Encriptar fechas sensibles
        const resultadoEncriptado = {
            ...resultadoSQL,
            fecha_creacion: resultadoSQL.fecha_creacion ? encryptDates(resultadoSQL.fecha_creacion) : null,
            fecha_modificacion: resultadoSQL.fecha_modificacion ? encryptDates(resultadoSQL.fecha_modificacion) : null,
            fecha: resultadoSQL.fecha ? encryptDates(resultadoSQL.fecha) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(resultadoEncriptado);
    } catch (error) {
        console.error('Error al mandar el resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA RESULTADOS ---

// 8. OBTENER RESULTADOS POR JORNADA
resultadosCtl.getByJornada = async (req, res) => {
    const { jornada } = req.params;
    
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tl.escudo as equipoLocal_escudo,
                   tv.nombre as equipoVisitante_nombre,
                   tv.escudo as equipoVisitante_escudo,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN tl.nombre
                     WHEN r.golesVisitante > r.golesLocal THEN tv.nombre
                     ELSE 'Empate'
                   END as ganador
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE r.jornada = ? AND r.estado = 'activo'
            ORDER BY r.fecha DESC
        `;
        
        const [resultados] = await sql.promise().query(query, [jornada]);
        
        res.status(200).json({
            message: `Resultados de la jornada ${jornada} obtenidos exitosamente`,
            jornada: jornada,
            resultados: resultados,
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al obtener resultados por jornada:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER RESULTADOS POR EQUIPO
resultadosCtl.getByEquipo = async (req, res) => {
    const { equipo } = req.params;
    
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tv.nombre as equipoVisitante_nombre,
                   CASE 
                     WHEN r.equipoLocal = ? THEN 'Local'
                     WHEN r.equipoVisitante = ? THEN 'Visitante'
                   END as condicion,
                   CASE 
                     WHEN (r.equipoLocal = ? AND r.golesLocal > r.golesVisitante) OR 
                          (r.equipoVisitante = ? AND r.golesVisitante > r.golesLocal) THEN 'Victoria'
                     WHEN r.golesLocal = r.golesVisitante THEN 'Empate'
                     ELSE 'Derrota'
                   END as resultado
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE (r.equipoLocal = ? OR r.equipoVisitante = ?) AND r.estado = 'activo'
            ORDER BY r.fecha DESC
        `;
        
        const [resultados] = await sql.promise().query(query, [equipo, equipo, equipo, equipo, equipo, equipo]);
        
        // Calcular estadísticas del equipo
        const stats = resultados.reduce((acc, res) => {
            if (res.resultado === 'Victoria') acc.victorias++;
            else if (res.resultado === 'Empate') acc.empates++;
            else if (res.resultado === 'Derrota') acc.derrotas++;
            return acc;
        }, { victorias: 0, empates: 0, derrotas: 0 });
        
        res.status(200).json({
            message: `Resultados del equipo ${equipo} obtenidos exitosamente`,
            equipo: equipo,
            resultados: resultados,
            estadisticas: stats,
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al obtener resultados por equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER RESULTADOS POR TEMPORADA
resultadosCtl.getByTemporada = async (req, res) => {
    const { temporada } = req.params;
    
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tv.nombre as equipoVisitante_nombre,
                   (r.golesLocal + r.golesVisitante) as total_goles
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE r.temporada = ? AND r.estado = 'activo'
            ORDER BY r.jornada ASC, r.fecha ASC
        `;
        
        const [resultados] = await sql.promise().query(query, [temporada]);
        
        res.status(200).json({
            message: `Resultados de la temporada ${temporada} obtenidos exitosamente`,
            temporada: temporada,
            resultados: resultados,
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al obtener resultados por temporada:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. OBTENER ESTADÍSTICAS GENERALES
resultadosCtl.getEstadisticasGenerales = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(*) as total_partidos,
                SUM(golesLocal + golesVisitante) as total_goles,
                ROUND(AVG(golesLocal + golesVisitante), 2) as promedio_goles_partido,
                MAX(golesLocal + golesVisitante) as max_goles_partido,
                MIN(golesLocal + golesVisitante) as min_goles_partido,
                COUNT(CASE WHEN golesLocal > golesVisitante THEN 1 END) as victorias_local,
                COUNT(CASE WHEN golesVisitante > golesLocal THEN 1 END) as victorias_visitante,
                COUNT(CASE WHEN golesLocal = golesVisitante THEN 1 END) as empates,
                COUNT(DISTINCT jornada) as total_jornadas,
                COUNT(DISTINCT temporada) as total_temporadas
            FROM resultados 
            WHERE estado = 'activo'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. BUSCAR RESULTADOS
resultadosCtl.searchResultados = async (req, res) => {
    const { q, fecha_inicio, fecha_fin, jornada, temporada } = req.query;
    
    try {
        let query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tv.nombre as equipoVisitante_nombre,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN tl.nombre
                     WHEN r.golesVisitante > r.golesLocal THEN tv.nombre
                     ELSE 'Empate'
                   END as ganador
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE r.estado = 'activo'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (r.equipoLocal LIKE ? OR r.equipoVisitante LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (fecha_inicio) {
            query += ` AND r.fecha >= ?`;
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ` AND r.fecha <= ?`;
            params.push(fecha_fin);
        }
        
        if (jornada) {
            query += ` AND r.jornada = ?`;
            params.push(parseInt(jornada));
        }
        
        if (temporada) {
            query += ` AND r.temporada = ?`;
            params.push(temporada);
        }
        
        query += ` ORDER BY r.fecha DESC, r.jornada DESC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de resultados realizada exitosamente',
            resultados: resultados,
            filtros: { q, fecha_inicio, fecha_fin, jornada, temporada },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. OBTENER ÚLTIMOS RESULTADOS
resultadosCtl.getUltimosResultados = async (req, res) => {
    const { limite = 10 } = req.query;
    
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tl.escudo as equipoLocal_escudo,
                   tv.nombre as equipoVisitante_nombre,
                   tv.escudo as equipoVisitante_escudo,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN tl.nombre
                     WHEN r.golesVisitante > r.golesLocal THEN tv.nombre
                     ELSE 'Empate'
                   END as ganador,
                   (r.golesLocal + r.golesVisitante) as total_goles
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE r.estado = 'activo'
            ORDER BY r.fecha DESC, r.id DESC
            LIMIT ?
        `;
        
        const [resultados] = await sql.promise().query(query, [parseInt(limite)]);
        
        res.status(200).json({
            message: `Últimos ${limite} resultados obtenidos exitosamente`,
            resultados: resultados,
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al obtener últimos resultados:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. OBTENER HISTORIAL ENTRE DOS EQUIPOS
resultadosCtl.getHistorialEquipos = async (req, res) => {
    const { equipo1, equipo2 } = req.params;
    
    try {
        const query = `
            SELECT r.*, 
                   tl.nombre as equipoLocal_nombre,
                   tv.nombre as equipoVisitante_nombre,
                   CASE 
                     WHEN r.golesLocal > r.golesVisitante THEN r.equipoLocal
                     WHEN r.golesVisitante > r.golesLocal THEN r.equipoVisitante
                     ELSE 'Empate'
                   END as ganador
            FROM resultados r
            LEFT JOIN teams tl ON r.equipoLocal = tl.nombre
            LEFT JOIN teams tv ON r.equipoVisitante = tv.nombre
            WHERE ((r.equipoLocal = ? AND r.equipoVisitante = ?) OR 
                   (r.equipoLocal = ? AND r.equipoVisitante = ?)) 
            AND r.estado = 'activo'
            ORDER BY r.fecha DESC
        `;
        
        const [historial] = await sql.promise().query(query, [equipo1, equipo2, equipo2, equipo1]);
        
        // Calcular estadísticas del historial
        const stats = historial.reduce((acc, res) => {
            if (res.ganador === equipo1) acc.victorias_equipo1++;
            else if (res.ganador === equipo2) acc.victorias_equipo2++;
            else acc.empates++;
            acc.goles_equipo1 += (res.equipoLocal === equipo1) ? res.golesLocal : res.golesVisitante;
            acc.goles_equipo2 += (res.equipoLocal === equipo2) ? res.golesLocal : res.golesVisitante;
            return acc;
        }, { 
            victorias_equipo1: 0, 
            victorias_equipo2: 0, 
            empates: 0, 
            goles_equipo1: 0, 
            goles_equipo2: 0 
        });
        
        res.status(200).json({
            message: `Historial entre ${equipo1} y ${equipo2} obtenido exitosamente`,
            equipos: { equipo1, equipo2 },
            historial: historial,
            estadisticas: stats,
            total: historial.length
        });
    } catch (error) {
        console.error('Error al obtener historial entre equipos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = resultadosCtl;
