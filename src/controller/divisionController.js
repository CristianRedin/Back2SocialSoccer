// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const divisionCtl = {};

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

// --- CRUD de Divisiones ---

// 1. CREAR NUEVA DIVISIÓN
divisionCtl.createDivision = async (req, res) => {
    const { nombre, descripcion, categoria, limite_equipos } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaDivisionSQL = {
            nombre: nombre,
            descripcion: descripcion,
            categoria: categoria,
            limite_equipos: limite_equipos,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const divisionGuardadaSQL = await orm.division.create(nuevaDivisionSQL);
        
        res.status(201).json({ 
            message: 'División creada exitosamente',
            division: divisionGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS DIVISIONES (Usando SQL Directo)
divisionCtl.getAllDivisiones = async (req, res) => {
    try {
        const [divisionesSQL] = await sql.promise().query("SELECT * FROM divisions WHERE estado = 'activo' ORDER BY categoria ASC, nombre ASC");
        
        res.status(200).json(divisionesSQL);
    } catch (error) {
        console.error('Error al obtener todas las divisiones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DIVISIÓN POR ID (Usando SQL Directo)
divisionCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [divisionesSQL] = await sql.promise().query("SELECT * FROM divisions WHERE id = ? AND estado = 'activo'", [id]);
        
        if (divisionesSQL.length === 0) {
            return res.status(404).json({ error: 'División no encontrada.' });
        }
        
        const divisionSQL = divisionesSQL[0];
        
        res.status(200).json(divisionSQL);
    } catch (error) {
        console.error('Error al obtener la división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DIVISIONES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
divisionCtl.mostrarDivisiones = async (req, res) => {
    try {
        const query = `
            SELECT d.*, 
                   COUNT(t.id) as total_equipos,
                   COUNT(p.id) as total_jugadores,
                   COUNT(m.id) as total_partidos,
                   CASE 
                     WHEN d.limite_equipos IS NULL THEN 'Sin límite'
                     WHEN COUNT(t.id) >= d.limite_equipos THEN 'Completa'
                     ELSE CONCAT(d.limite_equipos - COUNT(t.id), ' cupos disponibles')
                   END as estado_capacidad,
                   CASE 
                     WHEN d.categoria = 'Primera' THEN '🏆'
                     WHEN d.categoria = 'Segunda' THEN '🥈'
                     WHEN d.categoria = 'Tercera' THEN '🥉'
                     ELSE '⚽'
                   END as icono_categoria
            FROM divisions d
            LEFT JOIN teams t ON d.id = t.divisionId AND t.estado = 'activo'
            LEFT JOIN players p ON t.id = p.teamId AND p.estado = 'activo'
            LEFT JOIN matches m ON (t.id = m.equipoLocalId OR t.id = m.equipoVisitanteId) AND m.estado = 'activo'
            WHERE d.estado = 'activo'
            GROUP BY d.id, d.nombre, d.descripcion, d.categoria, d.limite_equipos, d.estado, d.fecha_creacion, d.fecha_modificacion
            ORDER BY d.categoria ASC, d.nombre ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Divisiones con información detallada obtenidas exitosamente',
            divisiones: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las divisiones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DIVISIÓN (Usando SQL Directo)
divisionCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, descripcion, categoria, limite_equipos } = req.body;
    
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
        if (descripcion !== undefined) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (categoria) {
            campos.push('categoria = ?');
            valores.push(categoria);
        }
        if (limite_equipos !== undefined) {
            campos.push('limite_equipos = ?');
            valores.push(limite_equipos);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE divisions SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'División no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'División actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DIVISIÓN (Usando SQL Directo)
divisionCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE divisions SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'División no encontrada.' });
        }
        
        res.status(200).json({ message: 'División eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DIVISIÓN CON ENCRIPTACIÓN
divisionCtl.mandarDivision = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [divisionesSQL] = await sql.promise().query("SELECT * FROM divisions WHERE id = ? AND estado = 'activo'", [id]);
        
        if (divisionesSQL.length === 0) {
            return res.status(404).json({ error: 'División no encontrada.' });
        }
        
        const divisionSQL = divisionesSQL[0];
        
        // Encriptar fechas sensibles
        const divisionEncriptada = {
            ...divisionSQL,
            fecha_creacion: divisionSQL.fecha_creacion ? encryptDates(divisionSQL.fecha_creacion) : null,
            fecha_modificacion: divisionSQL.fecha_modificacion ? encryptDates(divisionSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(divisionEncriptada);
    } catch (error) {
        console.error('Error al mandar la división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER DIVISIONES POR CATEGORÍA
divisionCtl.getDivisionesByCategoria = async (req, res) => {
    const { categoria } = req.params;
    
    try {
        const [divisiones] = await sql.promise().query(
            "SELECT * FROM divisions WHERE categoria = ? AND estado = 'activo' ORDER BY nombre ASC", 
            [categoria]
        );
        
        res.status(200).json({
            message: `Divisiones de categoría ${categoria} obtenidas exitosamente`,
            divisiones: divisiones,
            total: divisiones.length
        });
    } catch (error) {
        console.error('Error al obtener las divisiones por categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER DIVISIONES CON CUPOS DISPONIBLES
divisionCtl.getDivisionesConCupos = async (req, res) => {
    try {
        const query = `
            SELECT d.*, 
                   COUNT(t.id) as equipos_actuales,
                   (d.limite_equipos - COUNT(t.id)) as cupos_disponibles
            FROM divisions d
            LEFT JOIN teams t ON d.id = t.divisionId AND t.estado = 'activo'
            WHERE d.estado = 'activo' 
            AND d.limite_equipos IS NOT NULL
            GROUP BY d.id
            HAVING cupos_disponibles > 0
            ORDER BY d.categoria ASC, d.nombre ASC
        `;
        
        const [divisionesConCupos] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Divisiones con cupos disponibles obtenidas exitosamente',
            divisiones: divisionesConCupos,
            total: divisionesConCupos.length
        });
    } catch (error) {
        console.error('Error al obtener las divisiones con cupos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER ESTADÍSTICAS DE DIVISIONES
divisionCtl.getEstadisticasDivisiones = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_divisiones,
                COUNT(CASE WHEN d.categoria = 'Primera' THEN 1 END) as divisiones_primera,
                COUNT(CASE WHEN d.categoria = 'Segunda' THEN 1 END) as divisiones_segunda,
                COUNT(CASE WHEN d.categoria = 'Tercera' THEN 1 END) as divisiones_tercera,
                SUM(COUNT(t.id)) as total_equipos,
                AVG(COUNT(t.id)) as promedio_equipos_por_division,
                COUNT(CASE WHEN d.limite_equipos IS NOT NULL AND COUNT(t.id) >= d.limite_equipos THEN 1 END) as divisiones_completas
            FROM divisions d
            LEFT JOIN teams t ON d.id = t.divisionId AND t.estado = 'activo'
            WHERE d.estado = 'activo'
            GROUP BY d.id
        `;
        
        const [estadisticas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas de divisiones obtenidas exitosamente',
            estadisticas: estadisticas[0]
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas de divisiones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = divisionCtl;
