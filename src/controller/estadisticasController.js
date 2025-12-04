// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const estadisticasCtl = {};

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

// --- CRUD de Estadísticas ---

// 1. CREAR NUEVA ESTADÍSTICA
estadisticasCtl.createEstadistica = async (req, res) => {
    const { temporada, descripcion, tipo_estadistica } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaEstadisticaSQL = {
            temporada: temporada,
            descripcion: descripcion,
            tipo_estadistica: tipo_estadistica,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const estadisticaGuardadaSQL = await orm.estadisticas.create(nuevaEstadisticaSQL);
        
        res.status(201).json({ 
            message: 'Estadística creada exitosamente',
            estadistica: estadisticaGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS ESTADÍSTICAS (Usando SQL Directo)
estadisticasCtl.getAllEstadisticas = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query("SELECT * FROM estadisticas WHERE estado = 'activo' ORDER BY temporada DESC, tipo_estadistica ASC");
        
        res.status(200).json(estadisticasSQL);
    } catch (error) {
        console.error('Error al obtener todas las estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER ESTADÍSTICA POR ID (Usando SQL Directo)
estadisticasCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [estadisticasSQL] = await sql.promise().query("SELECT * FROM estadisticas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (estadisticasSQL.length === 0) {
            return res.status(404).json({ error: 'Estadística no encontrada.' });
        }
        
        const estadisticaSQL = estadisticasSQL[0];
        
        res.status(200).json(estadisticaSQL);
    } catch (error) {
        console.error('Error al obtener la estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR ESTADÍSTICAS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
estadisticasCtl.mostrarEstadisticas = async (req, res) => {
    try {
        const query = `
            SELECT e.*, 
                   COUNT(de.id) as total_detalles,
                   SUM(de.goles) as total_goles,
                   SUM(de.asistencias) as total_asistencias,
                   AVG(de.goles) as promedio_goles,
                   AVG(de.asistencias) as promedio_asistencias,
                   CASE 
                     WHEN e.temporada = YEAR(CURDATE()) THEN 'Temporada Actual'
                     WHEN e.temporada = YEAR(CURDATE()) - 1 THEN 'Temporada Anterior'
                     ELSE CONCAT('Temporada ', e.temporada)
                   END as descripcion_temporada,
                   CASE 
                     WHEN e.tipo_estadistica = 'Goles' THEN '⚽'
                     WHEN e.tipo_estadistica = 'Asistencias' THEN '🤝'
                     WHEN e.tipo_estadistica = 'Tarjetas' THEN '🟨'
                     ELSE '📊'
                   END as icono_tipo
            FROM estadisticas e
            LEFT JOIN detalleEstadisticas de ON e.id = de.estadisticaId AND de.estado = 'activo'
            WHERE e.estado = 'activo'
            GROUP BY e.id
            ORDER BY e.temporada DESC, e.tipo_estadistica ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas con información detallada obtenidas exitosamente',
            estadisticas: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR ESTADÍSTICA (Usando SQL Directo)
estadisticasCtl.update = async (req, res) => {
    const { id } = req.params;
    const { temporada, descripcion, tipo_estadistica } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (temporada) {
            campos.push('temporada = ?');
            valores.push(temporada);
        }
        if (descripcion !== undefined) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (tipo_estadistica) {
            campos.push('tipo_estadistica = ?');
            valores.push(tipo_estadistica);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE estadisticas SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Estadística no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Estadística actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR ESTADÍSTICA (Usando SQL Directo)
estadisticasCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE estadisticas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Estadística no encontrada.' });
        }
        
        res.status(200).json({ message: 'Estadística eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR ESTADÍSTICA CON ENCRIPTACIÓN
estadisticasCtl.mandarEstadistica = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [estadisticasSQL] = await sql.promise().query("SELECT * FROM estadisticas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (estadisticasSQL.length === 0) {
            return res.status(404).json({ error: 'Estadística no encontrada.' });
        }
        
        const estadisticaSQL = estadisticasSQL[0];
        
        // Encriptar fechas sensibles
        const estadisticaEncriptada = {
            ...estadisticaSQL,
            fecha_creacion: estadisticaSQL.fecha_creacion ? encryptDates(estadisticaSQL.fecha_creacion) : null,
            fecha_modificacion: estadisticaSQL.fecha_modificacion ? encryptDates(estadisticaSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(estadisticaEncriptada);
    } catch (error) {
        console.error('Error al mandar la estadística:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER ESTADÍSTICAS POR TEMPORADA
estadisticasCtl.getEstadisticasByTemporada = async (req, res) => {
    const { temporada } = req.params;
    
    try {
        const [estadisticas] = await sql.promise().query(
            "SELECT * FROM estadisticas WHERE temporada = ? AND estado = 'activo' ORDER BY tipo_estadistica ASC", 
            [temporada]
        );
        
        res.status(200).json({
            message: `Estadísticas de la temporada ${temporada} obtenidas exitosamente`,
            estadisticas: estadisticas,
            total: estadisticas.length
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas por temporada:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ESTADÍSTICAS POR TIPO
estadisticasCtl.getEstadisticasByTipo = async (req, res) => {
    const { tipo_estadistica } = req.params;
    
    try {
        const query = `
            SELECT e.*, 
                   COUNT(de.id) as total_registros,
                   SUM(CASE WHEN e.tipo_estadistica = 'Goles' THEN de.goles ELSE 0 END) as total_goles,
                   SUM(CASE WHEN e.tipo_estadistica = 'Asistencias' THEN de.asistencias ELSE 0 END) as total_asistencias
            FROM estadisticas e
            LEFT JOIN detalleEstadisticas de ON e.id = de.estadisticaId AND de.estado = 'activo'
            WHERE e.tipo_estadistica = ? AND e.estado = 'activo'
            GROUP BY e.id
            ORDER BY e.temporada DESC
        `;
        
        const [estadisticas] = await sql.promise().query(query, [tipo_estadistica]);
        
        res.status(200).json({
            message: `Estadísticas de tipo ${tipo_estadistica} obtenidas exitosamente`,
            estadisticas: estadisticas,
            total: estadisticas.length
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas por tipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER RESUMEN GENERAL DE ESTADÍSTICAS
estadisticasCtl.getResumenEstadisticas = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_estadisticas,
                COUNT(DISTINCT e.temporada) as temporadas_registradas,
                COUNT(CASE WHEN e.tipo_estadistica = 'Goles' THEN 1 END) as estadisticas_goles,
                COUNT(CASE WHEN e.tipo_estadistica = 'Asistencias' THEN 1 END) as estadisticas_asistencias,
                COUNT(CASE WHEN e.tipo_estadistica = 'Tarjetas' THEN 1 END) as estadisticas_tarjetas,
                MAX(e.temporada) as temporada_mas_reciente,
                MIN(e.temporada) as temporada_mas_antigua
            FROM estadisticas e
            WHERE e.estado = 'activo'
        `;
        
        const [resumen] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Resumen general de estadísticas obtenido exitosamente',
            resumen: resumen[0]
        });
    } catch (error) {
        console.error('Error al obtener el resumen de estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = estadisticasCtl;
