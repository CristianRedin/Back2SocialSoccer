// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const inscripcionesTorneoCtl = {};

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

// --- CRUD de Inscripciones a Torneo ---

// 1. CREAR NUEVA INSCRIPCIÓN A TORNEO
inscripcionesTorneoCtl.createInscripcion = async (req, res) => {
    const { torneoId, teamId, fecha_inscripcion, observaciones } = req.body;
    try {
        // Validación: Verificar si la inscripción ya existe
        const [existingInscripcion] = await sql.promise().query(
            "SELECT * FROM inscripcionesTorneos WHERE torneoId = ? AND teamId = ? AND estado = 'activo'", 
            [torneoId, teamId]
        );

        if (existingInscripcion.length > 0) {
            return res.status(400).json({ error: 'El equipo ya está inscrito en este torneo.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaInscripcionSQL = {
            torneoId: torneoId,
            teamId: teamId,
            fecha_inscripcion: fecha_inscripcion || formattedNow,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const inscripcionGuardadaSQL = await orm.inscripcionesTorneo.create(nuevaInscripcionSQL);
        
        res.status(201).json({ 
            message: 'Inscripción a torneo creada exitosamente',
            inscripcion: inscripcionGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la inscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS INSCRIPCIONES (Usando SQL Directo)
inscripcionesTorneoCtl.getAllInscripciones = async (req, res) => {
    try {
        const [inscripcionesSQL] = await sql.promise().query("SELECT * FROM inscripcionesTorneos WHERE estado = 'activo' ORDER BY fecha_inscripcion DESC");
        
        res.status(200).json(inscripcionesSQL);
    } catch (error) {
        console.error('Error al obtener todas las inscripciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER INSCRIPCIÓN POR ID (Usando SQL Directo)
inscripcionesTorneoCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [inscripcionesSQL] = await sql.promise().query("SELECT * FROM inscripcionesTorneos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (inscripcionesSQL.length === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada.' });
        }
        
        const inscripcionSQL = inscripcionesSQL[0];
        
        res.status(200).json(inscripcionSQL);
    } catch (error) {
        console.error('Error al obtener la inscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR INSCRIPCIONES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
inscripcionesTorneoCtl.mostrarInscripciones = async (req, res) => {
    try {
        const query = `
            SELECT it.*, 
                   tor.nombre as torneo_nombre,
                   tor.descripcion as torneo_descripcion,
                   tor.fecha_inicio as torneo_fecha_inicio,
                   tor.fecha_fin as torneo_fecha_fin,
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CASE 
                     WHEN tor.fecha_inicio > CURDATE() THEN 'Próximo'
                     WHEN tor.fecha_fin < CURDATE() THEN 'Finalizado'
                     ELSE 'En Curso'
                   END as estado_torneo,
                   DATEDIFF(it.fecha_inscripcion, CURDATE()) as dias_inscripcion,
                   COUNT(p.id) as jugadores_equipo
            FROM inscripcionesTorneos it
            LEFT JOIN torneos tor ON it.torneoId = tor.id
            LEFT JOIN teams t ON it.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            LEFT JOIN players p ON t.id = p.teamId AND p.estado = 'activo'
            WHERE it.estado = 'activo'
            GROUP BY it.id
            ORDER BY it.fecha_inscripcion DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Inscripciones con información detallada obtenidas exitosamente',
            inscripciones: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las inscripciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR INSCRIPCIÓN (Usando SQL Directo)
inscripcionesTorneoCtl.update = async (req, res) => {
    const { id } = req.params;
    const { torneoId, teamId, fecha_inscripcion, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (torneoId) {
            campos.push('torneoId = ?');
            valores.push(torneoId);
        }
        if (teamId) {
            campos.push('teamId = ?');
            valores.push(teamId);
        }
        if (fecha_inscripcion) {
            campos.push('fecha_inscripcion = ?');
            valores.push(fecha_inscripcion);
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
            const consultaSQL = `UPDATE inscripcionesTorneos SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Inscripción no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Inscripción actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la inscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR INSCRIPCIÓN (Usando SQL Directo)
inscripcionesTorneoCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE inscripcionesTorneos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada.' });
        }
        
        res.status(200).json({ message: 'Inscripción eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la inscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR INSCRIPCIÓN CON ENCRIPTACIÓN
inscripcionesTorneoCtl.mandarInscripcion = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [inscripcionesSQL] = await sql.promise().query("SELECT * FROM inscripcionesTorneos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (inscripcionesSQL.length === 0) {
            return res.status(404).json({ error: 'Inscripción no encontrada.' });
        }
        
        const inscripcionSQL = inscripcionesSQL[0];
        
        // Encriptar fechas sensibles
        const inscripcionEncriptada = {
            ...inscripcionSQL,
            fecha_creacion: inscripcionSQL.fecha_creacion ? encryptDates(inscripcionSQL.fecha_creacion) : null,
            fecha_modificacion: inscripcionSQL.fecha_modificacion ? encryptDates(inscripcionSQL.fecha_modificacion) : null,
            fecha_inscripcion: inscripcionSQL.fecha_inscripcion ? encryptDates(inscripcionSQL.fecha_inscripcion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(inscripcionEncriptada);
    } catch (error) {
        console.error('Error al mandar la inscripción:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER INSCRIPCIONES POR TORNEO
inscripcionesTorneoCtl.getInscripcionesByTorneo = async (req, res) => {
    const { torneoId } = req.params;
    
    try {
        const query = `
            SELECT it.*, 
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   COUNT(p.id) as total_jugadores
            FROM inscripcionesTorneos it
            LEFT JOIN teams t ON it.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            LEFT JOIN players p ON t.id = p.teamId AND p.estado = 'activo'
            WHERE it.torneoId = ? AND it.estado = 'activo'
            GROUP BY it.id
            ORDER BY it.fecha_inscripcion ASC
        `;
        
        const [inscripciones] = await sql.promise().query(query, [torneoId]);
        
        res.status(200).json({
            message: 'Inscripciones del torneo obtenidas exitosamente',
            inscripciones: inscripciones,
            total: inscripciones.length
        });
    } catch (error) {
        console.error('Error al obtener las inscripciones del torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER INSCRIPCIONES POR EQUIPO
inscripcionesTorneoCtl.getInscripcionesByEquipo = async (req, res) => {
    const { teamId } = req.params;
    
    try {
        const query = `
            SELECT it.*, 
                   tor.nombre as torneo_nombre,
                   tor.fecha_inicio as torneo_fecha_inicio,
                   tor.fecha_fin as torneo_fecha_fin,
                   CASE 
                     WHEN tor.fecha_inicio > CURDATE() THEN 'Próximo'
                     WHEN tor.fecha_fin < CURDATE() THEN 'Finalizado'
                     ELSE 'En Curso'
                   END as estado_torneo
            FROM inscripcionesTorneos it
            LEFT JOIN torneos tor ON it.torneoId = tor.id
            WHERE it.teamId = ? AND it.estado = 'activo'
            ORDER BY tor.fecha_inicio DESC
        `;
        
        const [inscripciones] = await sql.promise().query(query, [teamId]);
        
        res.status(200).json({
            message: 'Inscripciones del equipo obtenidas exitosamente',
            inscripciones: inscripciones,
            total: inscripciones.length
        });
    } catch (error) {
        console.error('Error al obtener las inscripciones del equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER ESTADÍSTICAS DE INSCRIPCIONES
inscripcionesTorneoCtl.getEstadisticasInscripciones = async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(*) as total_inscripciones,
                COUNT(DISTINCT it.torneoId) as torneos_con_inscripciones,
                COUNT(DISTINCT it.teamId) as equipos_inscritos,
                COUNT(CASE WHEN tor.fecha_inicio > CURDATE() THEN 1 END) as inscripciones_proximos_torneos,
                COUNT(CASE WHEN tor.fecha_fin < CURDATE() THEN 1 END) as inscripciones_torneos_finalizados,
                AVG(DATEDIFF(tor.fecha_inicio, it.fecha_inscripcion)) as promedio_dias_anticipacion
            FROM inscripcionesTorneos it
            LEFT JOIN torneos tor ON it.torneoId = tor.id
            WHERE it.estado = 'activo'
        `;
        
        const [estadisticas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas de inscripciones obtenidas exitosamente',
            estadisticas: estadisticas[0]
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas de inscripciones:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = inscripcionesTorneoCtl;
