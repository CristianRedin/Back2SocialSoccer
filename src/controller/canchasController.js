// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const canchasCtl = {};

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

// --- CRUD de Canchas ---

// 1. CREAR NUEVA CANCHA
canchasCtl.createCancha = async (req, res) => {
    const { nombre, ubicacion, descripcion, capacidad, tipo_superficie } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaCanchaSQL = {
            nombre: nombre,
            ubicacion: ubicacion,
            descripcion: descripcion,
            capacidad: capacidad,
            tipo_superficie: tipo_superficie,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const canchaGuardadaSQL = await orm.canchas.create(nuevaCanchaSQL);
        
        res.status(201).json({ 
            message: 'Cancha creada exitosamente',
            cancha: canchaGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la cancha:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS CANCHAS (Usando SQL Directo)
canchasCtl.getAllCanchas = async (req, res) => {
    try {
        const [canchasSQL] = await sql.promise().query("SELECT * FROM canchas WHERE estado = 'activo' ORDER BY nombre ASC");
        
        res.status(200).json(canchasSQL);
    } catch (error) {
        console.error('Error al obtener todas las canchas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER CANCHA POR ID (Usando SQL Directo)
canchasCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [canchasSQL] = await sql.promise().query("SELECT * FROM canchas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (canchasSQL.length === 0) {
            return res.status(404).json({ error: 'Cancha no encontrada.' });
        }
        
        const canchaSQL = canchasSQL[0];
        
        res.status(200).json(canchaSQL);
    } catch (error) {
        console.error('Error al obtener la cancha:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR CANCHAS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
canchasCtl.mostrarCanchas = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   COUNT(m.id) as total_partidos,
                   COUNT(CASE WHEN m.fecha >= CURDATE() THEN 1 END) as partidos_programados,
                   COUNT(CASE WHEN m.fecha = CURDATE() THEN 1 END) as partidos_hoy,
                   CASE 
                     WHEN COUNT(CASE WHEN m.fecha >= CURDATE() THEN 1 END) > 0 THEN 'Ocupada'
                     ELSE 'Disponible'
                   END as estado_disponibilidad,
                   MAX(m.fecha) as ultimo_partido
            FROM canchas c
            LEFT JOIN matches m ON c.id = m.canchaId AND m.estado = 'activo'
            WHERE c.estado = 'activo'
            GROUP BY c.id, c.nombre, c.ubicacion, c.descripcion, c.capacidad, c.tipo_superficie, c.estado, c.fecha_creacion, c.fecha_modificacion
            ORDER BY c.nombre ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Canchas con información detallada obtenidas exitosamente',
            canchas: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las canchas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR CANCHA (Usando SQL Directo)
canchasCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, ubicacion, descripcion, capacidad, tipo_superficie } = req.body;
    
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
        if (ubicacion) {
            campos.push('ubicacion = ?');
            valores.push(ubicacion);
        }
        if (descripcion !== undefined) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (capacidad) {
            campos.push('capacidad = ?');
            valores.push(capacidad);
        }
        if (tipo_superficie) {
            campos.push('tipo_superficie = ?');
            valores.push(tipo_superficie);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE canchas SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Cancha no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Cancha actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la cancha:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR CANCHA (Usando SQL Directo)
canchasCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE canchas SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Cancha no encontrada.' });
        }
        
        res.status(200).json({ message: 'Cancha eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la cancha:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR CANCHA CON ENCRIPTACIÓN
canchasCtl.mandarCancha = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [canchasSQL] = await sql.promise().query("SELECT * FROM canchas WHERE id = ? AND estado = 'activo'", [id]);
        
        if (canchasSQL.length === 0) {
            return res.status(404).json({ error: 'Cancha no encontrada.' });
        }
        
        const canchaSQL = canchasSQL[0];
        
        // Encriptar fechas sensibles
        const canchaEncriptada = {
            ...canchaSQL,
            fecha_creacion: canchaSQL.fecha_creacion ? encryptDates(canchaSQL.fecha_creacion) : null,
            fecha_modificacion: canchaSQL.fecha_modificacion ? encryptDates(canchaSQL.fecha_modificacion) : null
        };
        
        res.status(200).json(canchaEncriptada);
    } catch (error) {
        console.error('Error al mandar la cancha:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER CANCHAS DISPONIBLES
canchasCtl.getCanchasDisponibles = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   COUNT(CASE WHEN m.fecha = CURDATE() THEN 1 END) as partidos_hoy,
                   CASE 
                     WHEN COUNT(CASE WHEN m.fecha = CURDATE() THEN 1 END) = 0 THEN 'Disponible Hoy'
                     ELSE 'Ocupada Hoy'
                   END as disponibilidad_hoy
            FROM canchas c
            LEFT JOIN matches m ON c.id = m.canchaId AND m.estado = 'activo'
            WHERE c.estado = 'activo'
            GROUP BY c.id
            HAVING partidos_hoy = 0
            ORDER BY c.nombre ASC
        `;
        
        const [canchasDisponibles] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Canchas disponibles obtenidas exitosamente',
            canchas: canchasDisponibles,
            total: canchasDisponibles.length
        });
    } catch (error) {
        console.error('Error al obtener las canchas disponibles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ESTADÍSTICAS DE USO DE CANCHAS
canchasCtl.getEstadisticasCanchas = async (req, res) => {
    try {
        const query = `
            SELECT c.id, c.nombre, c.ubicacion, c.tipo_superficie,
                   COUNT(m.id) as total_partidos,
                   COUNT(CASE WHEN m.fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as partidos_ultimo_mes,
                   COUNT(CASE WHEN m.fecha >= CURDATE() THEN 1 END) as partidos_programados,
                   ROUND(AVG(CASE WHEN m.fecha < CURDATE() THEN 1 ELSE 0 END) * 100, 2) as porcentaje_uso
            FROM canchas c
            LEFT JOIN matches m ON c.id = m.canchaId AND m.estado = 'activo'
            WHERE c.estado = 'activo'
            GROUP BY c.id, c.nombre, c.ubicacion, c.tipo_superficie
            ORDER BY total_partidos DESC
        `;
        
        const [estadisticas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas de canchas obtenidas exitosamente',
            estadisticas: estadisticas,
            total: estadisticas.length
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas de canchas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER CANCHAS POR TIPO DE SUPERFICIE
canchasCtl.getCanchasByTipo = async (req, res) => {
    const { tipo } = req.params;
    
    try {
        const [canchas] = await sql.promise().query(
            "SELECT * FROM canchas WHERE tipo_superficie = ? AND estado = 'activo' ORDER BY nombre ASC", 
            [tipo]
        );
        
        res.status(200).json({
            message: `Canchas de tipo ${tipo} obtenidas exitosamente`,
            canchas: canchas,
            total: canchas.length
        });
    } catch (error) {
        console.error('Error al obtener las canchas por tipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = canchasCtl;
