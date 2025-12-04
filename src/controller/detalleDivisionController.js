// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const detalleDivisionCtl = {};

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

// --- CRUD de Detalle División ---

// 1. CREAR NUEVO DETALLE DE DIVISIÓN
detalleDivisionCtl.createDetalleDivision = async (req, res) => {
    const { divisionId, playerId, fecha_inicio, fecha_fin, observaciones } = req.body;
    try {
        // Validación: Verificar si la relación ya existe
        const [existingRelation] = await sql.promise().query(
            "SELECT * FROM detalleDivisions WHERE divisionId = ? AND playerId = ? AND estado = 'activo'", 
            [divisionId, playerId]
        );

        if (existingRelation.length > 0) {
            return res.status(400).json({ error: 'El jugador ya está asignado a esta división.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoDetalleSQL = {
            divisionId: divisionId,
            playerId: playerId,
            fecha_inicio: fecha_inicio,
            fecha_fin: fecha_fin,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const detalleGuardadoSQL = await orm.detalleDivision.create(nuevoDetalleSQL);
        
        res.status(201).json({ 
            message: 'Detalle de división creado exitosamente',
            detalleDivision: detalleGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el detalle de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS DETALLES DE DIVISIÓN (Usando SQL Directo)
detalleDivisionCtl.getAllDetalleDivision = async (req, res) => {
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleDivisions WHERE estado = 'activo' ORDER BY divisionId, playerId");
        
        res.status(200).json(detallesSQL);
    } catch (error) {
        console.error('Error al obtener todos los detalles de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLE DE DIVISIÓN POR ID (Usando SQL Directo)
detalleDivisionCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleDivisions WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de división no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        res.status(200).json(detalleSQL);
    } catch (error) {
        console.error('Error al obtener el detalle de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DETALLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
detalleDivisionCtl.mostrarDetalleDivision = async (req, res) => {
    try {
        const query = `
            SELECT dd.*, 
                   d.nombre as division_nombre,
                   d.descripcion as division_descripcion,
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo,
                   CASE 
                     WHEN dd.fecha_fin IS NULL OR dd.fecha_fin > CURDATE() THEN 'Activo'
                     ELSE 'Inactivo'
                   END as estado_participacion,
                   DATEDIFF(COALESCE(dd.fecha_fin, CURDATE()), dd.fecha_inicio) as dias_participacion
            FROM detalleDivisions dd
            LEFT JOIN divisions d ON dd.divisionId = d.id
            LEFT JOIN players p ON dd.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE dd.estado = 'activo'
            ORDER BY d.nombre, p.apellido, p.nombre
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Detalles de división con información detallada obtenidos exitosamente',
            detalleDivision: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los detalles de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DETALLE DE DIVISIÓN (Usando SQL Directo)
detalleDivisionCtl.update = async (req, res) => {
    const { id } = req.params;
    const { divisionId, playerId, fecha_inicio, fecha_fin, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (divisionId) {
            campos.push('divisionId = ?');
            valores.push(divisionId);
        }
        if (playerId) {
            campos.push('playerId = ?');
            valores.push(playerId);
        }
        if (fecha_inicio) {
            campos.push('fecha_inicio = ?');
            valores.push(fecha_inicio);
        }
        if (fecha_fin !== undefined) {
            campos.push('fecha_fin = ?');
            valores.push(fecha_fin);
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
            const consultaSQL = `UPDATE detalleDivisions SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Detalle de división no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Detalle de división actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el detalle de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DETALLE DE DIVISIÓN (Usando SQL Directo)
detalleDivisionCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE detalleDivisions SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Detalle de división no encontrado.' });
        }
        
        res.status(200).json({ message: 'Detalle de división eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el detalle de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DETALLE CON ENCRIPTACIÓN
detalleDivisionCtl.mandarDetalleDivision = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleDivisions WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de división no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        // Encriptar fechas sensibles
        const detalleEncriptado = {
            ...detalleSQL,
            fecha_creacion: detalleSQL.fecha_creacion ? encryptDates(detalleSQL.fecha_creacion) : null,
            fecha_modificacion: detalleSQL.fecha_modificacion ? encryptDates(detalleSQL.fecha_modificacion) : null,
            fecha_inicio: detalleSQL.fecha_inicio ? encryptDates(detalleSQL.fecha_inicio) : null,
            fecha_fin: detalleSQL.fecha_fin ? encryptDates(detalleSQL.fecha_fin) : null
        };
        
        res.status(200).json(detalleEncriptado);
    } catch (error) {
        console.error('Error al mandar el detalle de división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER JUGADORES POR DIVISIÓN
detalleDivisionCtl.getJugadoresByDivision = async (req, res) => {
    const { divisionId } = req.params;
    
    try {
        const query = `
            SELECT dd.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleDivisions dd
            LEFT JOIN players p ON dd.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE dd.divisionId = ? AND dd.estado = 'activo'
            ORDER BY p.apellido, p.nombre
        `;
        
        const [jugadores] = await sql.promise().query(query, [divisionId]);
        
        res.status(200).json({
            message: 'Jugadores de la división obtenidos exitosamente',
            jugadores: jugadores,
            total: jugadores.length
        });
    } catch (error) {
        console.error('Error al obtener los jugadores por división:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER DIVISIONES DE UN JUGADOR
detalleDivisionCtl.getDivisionesByJugador = async (req, res) => {
    const { playerId } = req.params;
    
    try {
        const query = `
            SELECT dd.*, 
                   d.nombre as division_nombre,
                   d.descripcion as division_descripcion,
                   CASE 
                     WHEN dd.fecha_fin IS NULL OR dd.fecha_fin > CURDATE() THEN 'Activo'
                     ELSE 'Inactivo'
                   END as estado_participacion
            FROM detalleDivisions dd
            LEFT JOIN divisions d ON dd.divisionId = d.id
            WHERE dd.playerId = ? AND dd.estado = 'activo'
            ORDER BY dd.fecha_inicio DESC
        `;
        
        const [divisiones] = await sql.promise().query(query, [playerId]);
        
        res.status(200).json({
            message: 'Divisiones del jugador obtenidas exitosamente',
            divisiones: divisiones,
            total: divisiones.length
        });
    } catch (error) {
        console.error('Error al obtener las divisiones del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER PARTICIPACIONES ACTIVAS
detalleDivisionCtl.getParticipacionesActivas = async (req, res) => {
    try {
        const query = `
            SELECT dd.*, 
                   d.nombre as division_nombre,
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleDivisions dd
            LEFT JOIN divisions d ON dd.divisionId = d.id
            LEFT JOIN players p ON dd.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE dd.estado = 'activo' 
            AND (dd.fecha_fin IS NULL OR dd.fecha_fin > CURDATE())
            ORDER BY d.nombre, p.apellido, p.nombre
        `;
        
        const [participacionesActivas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Participaciones activas obtenidas exitosamente',
            participaciones: participacionesActivas,
            total: participacionesActivas.length
        });
    } catch (error) {
        console.error('Error al obtener las participaciones activas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = detalleDivisionCtl;
