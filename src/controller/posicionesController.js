// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const posicionesCtl = {};

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

// --- CRUD de Posiciones ---
 
// 1. CREAR NUEVA POSICIÓN
posicionesCtl.createPosicion = async (req, res) => {
    const { equipo, partidosJugados, partidosGanados, partidosEmpatados, partidosPerdidos, golesAFavor, golesEnContra, puntos } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaPosicionSQL = {
            equipo: equipo,
            partidosJugados: partidosJugados || 0,
            partidosGanados: partidosGanados || 0,
            partidosEmpatados: partidosEmpatados || 0,
            partidosPerdidos: partidosPerdidos || 0,
            golesAFavor: golesAFavor || 0,
            golesEnContra: golesEnContra || 0,
            puntos: puntos || 0,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const posicionGuardadaSQL = await orm.posiciones.create(nuevaPosicionSQL);
        
        res.status(201).json({ 
            message: 'Posición creada exitosamente',
            posicion: posicionGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la posición:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS POSICIONES (Usando SQL Directo)
posicionesCtl.getAllPosiciones = async (req, res) => {
    try {
        const [posicionesSQL] = await sql.promise().query("SELECT * FROM posiciones WHERE estado = 'activo' ORDER BY puntos DESC, (golesAFavor - golesEnContra) DESC");
        
        res.status(200).json(posicionesSQL);
    } catch (error) {
        console.error('Error al obtener todas las posiciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER POSICIÓN POR ID (Usando SQL Directo)
posicionesCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [posicionesSQL] = await sql.promise().query("SELECT * FROM posiciones WHERE id = ? AND estado = 'activo'", [id]);
        
        if (posicionesSQL.length === 0) {
            return res.status(404).json({ error: 'Posición no encontrada.' });
        }
        
        const posicionSQL = posicionesSQL[0];
        
        res.status(200).json(posicionSQL);
    } catch (error) {
        console.error('Error al obtener la posición:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR POSICIONES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
posicionesCtl.mostrarPosiciones = async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   t.nombre as equipo_nombre,
                   t.escudo as equipo_escudo,
                   d.nombre as division_nombre,
                   (p.golesAFavor - p.golesEnContra) as diferencia_goles,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.partidosGanados / p.partidosJugados) * 100, 2)
                     ELSE 0
                   END as porcentaje_victorias,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.golesAFavor / p.partidosJugados), 2)
                     ELSE 0
                   END as promedio_goles,
                   ROW_NUMBER() OVER (ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC) as posicion_tabla
            FROM posiciones p
            LEFT JOIN teams t ON p.equipo = t.nombre
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE p.estado = 'activo'
            ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC, p.golesAFavor DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Tabla de posiciones obtenida exitosamente',
            posiciones: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las posiciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR POSICIÓN (Usando SQL Directo)
posicionesCtl.update = async (req, res) => {
    const { id } = req.params;
    const { partidosJugados, partidosGanados, partidosEmpatados, partidosPerdidos, golesAFavor, golesEnContra, puntos } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (partidosJugados !== undefined) {
            campos.push('partidosJugados = ?');
            valores.push(partidosJugados);
        }
        if (partidosGanados !== undefined) {
            campos.push('partidosGanados = ?');
            valores.push(partidosGanados);
        }
        if (partidosEmpatados !== undefined) {
            campos.push('partidosEmpatados = ?');
            valores.push(partidosEmpatados);
        }
        if (partidosPerdidos !== undefined) {
            campos.push('partidosPerdidos = ?');
            valores.push(partidosPerdidos);
        }
        if (golesAFavor !== undefined) {
            campos.push('golesAFavor = ?');
            valores.push(golesAFavor);
        }
        if (golesEnContra !== undefined) {
            campos.push('golesEnContra = ?');
            valores.push(golesEnContra);
        }
        if (puntos !== undefined) {
            campos.push('puntos = ?');
            valores.push(puntos);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE posiciones SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Posición no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Posición actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la posición:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR POSICIÓN (Usando SQL Directo)
posicionesCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE posiciones SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Posición no encontrada.' });
        }
        
        res.status(200).json({ message: 'Posición eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la posición:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR POSICIÓN CON ENCRIPTACIÓN
posicionesCtl.mandarPosicion = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [posicionesSQL] = await sql.promise().query("SELECT * FROM posiciones WHERE id = ? AND estado = 'activo'", [id]);
        
        if (posicionesSQL.length === 0) {
            return res.status(404).json({ error: 'Posición no encontrada.' });
        }
        
        const posicionSQL = posicionesSQL[0];
        
        // Encriptar fechas sensibles
        const posicionEncriptada = {
            ...posicionSQL,
            fecha_creacion: posicionSQL.fecha_creacion ? encryptDates(posicionSQL.fecha_creacion) : null,
            fecha_modificacion: posicionSQL.fecha_modificacion ? encryptDates(posicionSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(posicionEncriptada);
    } catch (error) {
        console.error('Error al mandar la posición:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA ESTADÍSTICAS DE POSICIONES (Solo SQL) ---

// 8. OBTENER TABLA DE POSICIONES ORDENADA
posicionesCtl.getTablaPosiciones = async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   t.nombre as equipo_nombre,
                   t.escudo as equipo_escudo,
                   (p.golesAFavor - p.golesEnContra) as diferencia_goles,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.partidosGanados / p.partidosJugados) * 100, 2)
                     ELSE 0
                   END as porcentaje_victorias,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.golesAFavor / p.partidosJugados), 2)
                     ELSE 0
                   END as promedio_goles_favor,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.golesEnContra / p.partidosJugados), 2)
                     ELSE 0
                   END as promedio_goles_contra,
                   ROW_NUMBER() OVER (ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC) as posicion
            FROM posiciones p
            LEFT JOIN teams t ON p.equipo = t.nombre
            WHERE p.estado = 'activo'
            ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC, p.golesAFavor DESC
        `;
        
        const [posiciones] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Tabla de posiciones obtenida exitosamente',
            tabla: posiciones,
            total: posiciones.length
        });
    } catch (error) {
        console.error('Error al obtener tabla de posiciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ESTADÍSTICAS GENERALES DE LA LIGA
posicionesCtl.getEstadisticasLiga = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(*) as total_equipos,
                SUM(partidosJugados) / 2 as total_partidos_jugados,
                SUM(golesAFavor) as total_goles,
                ROUND(AVG(golesAFavor), 2) as promedio_goles_equipo,
                ROUND(AVG(puntos), 2) as promedio_puntos,
                MAX(puntos) as max_puntos,
                MIN(puntos) as min_puntos,
                MAX(golesAFavor) as max_goles_favor,
                MIN(golesEnContra) as min_goles_contra,
                MAX(golesAFavor - golesEnContra) as mejor_diferencia,
                MIN(golesAFavor - golesEnContra) as peor_diferencia
            FROM posiciones 
            WHERE estado = 'activo'
        `);
        
        const estadisticasGenerales = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de la liga obtenidas exitosamente',
            estadisticas: estadisticasGenerales
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER MEJORES Y PEORES EQUIPOS
posicionesCtl.getTopEquipos = async (req, res) => {
    const { categoria = 'puntos', limite = 5 } = req.query;
    
    try {
        let ordenamiento = 'p.puntos DESC';
        
        switch(categoria) {
            case 'goles':
                ordenamiento = 'p.golesAFavor DESC';
                break;
            case 'diferencia':
                ordenamiento = '(p.golesAFavor - p.golesEnContra) DESC';
                break;
            case 'victorias':
                ordenamiento = 'p.partidosGanados DESC';
                break;
            case 'defensivos':
                ordenamiento = 'p.golesEnContra ASC';
                break;
            default:
                ordenamiento = 'p.puntos DESC';
        }
        
        const query = `
            SELECT p.*, 
                   t.nombre as equipo_nombre,
                   t.escudo as equipo_escudo,
                   (p.golesAFavor - p.golesEnContra) as diferencia_goles,
                   CASE 
                     WHEN p.partidosJugados > 0 THEN ROUND((p.partidosGanados / p.partidosJugados) * 100, 2)
                     ELSE 0
                   END as porcentaje_victorias
            FROM posiciones p
            LEFT JOIN teams t ON p.equipo = t.nombre
            WHERE p.estado = 'activo'
            ORDER BY ${ordenamiento}
            LIMIT ?
        `;
        
        const [equipos] = await sql.promise().query(query, [parseInt(limite)]);
        
        res.status(200).json({
            message: `Top ${limite} equipos por ${categoria} obtenido exitosamente`,
            equipos: equipos,
            categoria: categoria,
            total: equipos.length
        });
    } catch (error) {
        console.error('Error al obtener top equipos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. OBTENER EQUIPOS POR ZONA DE CLASIFICACIÓN
posicionesCtl.getEquiposPorZona = async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   t.nombre as equipo_nombre,
                   t.escudo as equipo_escudo,
                   (p.golesAFavor - p.golesEnContra) as diferencia_goles,
                   ROW_NUMBER() OVER (ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC) as posicion,
                   CASE 
                     WHEN ROW_NUMBER() OVER (ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC) <= 4 THEN 'Clasificación directa'
                     WHEN ROW_NUMBER() OVER (ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC) <= 6 THEN 'Repechaje'
                     ELSE 'Eliminado'
                   END as zona_clasificacion
            FROM posiciones p
            LEFT JOIN teams t ON p.equipo = t.nombre
            WHERE p.estado = 'activo'
            ORDER BY p.puntos DESC, (p.golesAFavor - p.golesEnContra) DESC
        `;
        
        const [equipos] = await sql.promise().query(query);
        
        // Agrupar por zona
        const zonas = {
            'Clasificación directa': [],
            'Repechaje': [],
            'Eliminado': []
        };
        
        equipos.forEach(equipo => {
            zonas[equipo.zona_clasificacion].push(equipo);
        });
        
        res.status(200).json({
            message: 'Equipos por zona de clasificación obtenidos exitosamente',
            zonas: zonas,
            total: equipos.length
        });
    } catch (error) {
        console.error('Error al obtener equipos por zona:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. ACTUALIZAR MÚLTIPLES POSICIONES
posicionesCtl.updateMultiplePositions = async (req, res) => {
    const { posiciones } = req.body; // Array de posiciones a actualizar
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);
        
        const updates = [];
        
        for (const pos of posiciones) {
            const updateQuery = `
                UPDATE posiciones SET 
                    partidosJugados = ?,
                    partidosGanados = ?,
                    partidosEmpatados = ?,
                    partidosPerdidos = ?,
                    golesAFavor = ?,
                    golesEnContra = ?,
                    puntos = ?,
                    fecha_modificacion = ?
                WHERE id = ? AND estado = 'activo'
            `;
            
            updates.push(sql.promise().query(updateQuery, [
                pos.partidosJugados || 0,
                pos.partidosGanados || 0,
                pos.partidosEmpatados || 0,
                pos.partidosPerdidos || 0,
                pos.golesAFavor || 0,
                pos.golesEnContra || 0,
                pos.puntos || 0,
                formattedNow,
                pos.id
            ]));
        }
        
        await Promise.all(updates);
        
        res.status(200).json({ 
            message: `${posiciones.length} posiciones actualizadas correctamente.`,
            actualizadas: posiciones.length
        });
    } catch (error) {
        console.error('Error al actualizar múltiples posiciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = posicionesCtl;
