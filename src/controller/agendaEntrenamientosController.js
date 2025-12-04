// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const agendaEntrenamientosCtl = {};

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

// --- CRUD de Agenda Entrenamientos ---

// 1. CREAR NUEVA AGENDA DE ENTRENAMIENTOS
agendaEntrenamientosCtl.createAgendaEntrenamientos = async (req, res) => {
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaAgendaSQL = {
            ...req.body,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const agendaGuardadaSQL = await orm.agendaEntrenamientos.create(nuevaAgendaSQL);
        
        res.status(201).json({
            message: 'Agenda de entrenamiento creada exitosamente',
            agenda: agendaGuardadaSQL
        });
    } catch (error) {
        console.error('Error al crear la agenda de entrenamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS AGENDAS DE ENTRENAMIENTOS (Usando SQL Directo)
agendaEntrenamientosCtl.getAllAgendaEntrenamientos = async (req, res) => {
    try {
        const [agendasSQL] = await sql.promise().query("SELECT * FROM agendaEntrenamientos WHERE estado = 'activo' ORDER BY fecha ASC, hora ASC");
        
        res.status(200).json(agendasSQL);
    } catch (error) {
        console.error('Error al obtener todas las agendas de entrenamientos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER AGENDA POR ID (Usando SQL Directo)
agendaEntrenamientosCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [agendasSQL] = await sql.promise().query("SELECT * FROM agendaEntrenamientos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (agendasSQL.length === 0) {
            return res.status(404).json({ error: 'Agenda de entrenamiento no encontrada.' });
        }
        
        const agendaSQL = agendasSQL[0];
        
        res.status(200).json(agendaSQL);
    } catch (error) {
        console.error('Error al obtener la agenda de entrenamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR AGENDAS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
agendaEntrenamientosCtl.mostrarAgendaEntrenamientos = async (req, res) => {
    try {
        const query = `
            SELECT ae.*, 
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CONCAT(ae.fecha, ' ', ae.hora) as fecha_hora_completa,
                   CASE 
                     WHEN ae.fecha < CURDATE() THEN 'Pasado'
                     WHEN ae.fecha = CURDATE() THEN 'Hoy'
                     ELSE 'Futuro'
                   END as estado_temporal,
                   DATEDIFF(ae.fecha, CURDATE()) as dias_restantes
            FROM agendaEntrenamientos ae
            LEFT JOIN teams t ON ae.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE ae.estado = 'activo'
            ORDER BY ae.fecha ASC, ae.hora ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Agendas de entrenamientos obtenidas exitosamente',
            agendas: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las agendas de entrenamientos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR AGENDA DE ENTRENAMIENTO (Usando SQL Directo)
agendaEntrenamientosCtl.update = async (req, res) => {
    const { id } = req.params;
    const { fecha, hora, descripcion, lugar, teamId, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (fecha) {
            campos.push('fecha = ?');
            valores.push(fecha);
        }
        if (hora) {
            campos.push('hora = ?');
            valores.push(hora);
        }
        if (descripcion) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (lugar) {
            campos.push('lugar = ?');
            valores.push(lugar);
        }
        if (teamId) {
            campos.push('teamId = ?');
            valores.push(teamId);
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
            const consultaSQL = `UPDATE agendaEntrenamientos SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Agenda de entrenamiento no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Agenda de entrenamiento actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la agenda de entrenamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR AGENDA DE ENTRENAMIENTO (Usando SQL Directo)
agendaEntrenamientosCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE agendaEntrenamientos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Agenda de entrenamiento no encontrada.' });
        }
        
        res.status(200).json({ message: 'Agenda de entrenamiento eliminada correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la agenda de entrenamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR AGENDA CON ENCRIPTACIÓN
agendaEntrenamientosCtl.mandarAgendaEntrenamientos = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [agendasSQL] = await sql.promise().query("SELECT * FROM agendaEntrenamientos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (agendasSQL.length === 0) {
            return res.status(404).json({ error: 'Agenda de entrenamiento no encontrada.' });
        }
        
        const agendaSQL = agendasSQL[0];
        
        // Encriptar fechas sensibles
        const agendaEncriptada = {
            ...agendaSQL,
            fecha_creacion: agendaSQL.fecha_creacion ? encryptDates(agendaSQL.fecha_creacion) : null,
            fecha_modificacion: agendaSQL.fecha_modificacion ? encryptDates(agendaSQL.fecha_modificacion) : null
        };
        
        res.status(200).json(agendaEncriptada);
    } catch (error) {
        console.error('Error al mandar la agenda de entrenamiento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER AGENDAS POR EQUIPO
agendaEntrenamientosCtl.getByTeam = async (req, res) => {
    const { teamId } = req.params;
    
    try {
        const query = `
            SELECT ae.*, 
                   t.nombre as equipo_nombre,
                   CONCAT(ae.fecha, ' ', ae.hora) as fecha_hora_completa,
                   CASE 
                     WHEN ae.fecha < CURDATE() THEN 'Pasado'
                     WHEN ae.fecha = CURDATE() THEN 'Hoy'
                     ELSE 'Futuro'
                   END as estado_temporal
            FROM agendaEntrenamientos ae
            LEFT JOIN teams t ON ae.teamId = t.id
            WHERE ae.teamId = ? AND ae.estado = 'activo'
            ORDER BY ae.fecha ASC, ae.hora ASC
        `;
        
        const [agendas] = await sql.promise().query(query, [teamId]);
        
        res.status(200).json({
            message: 'Agendas del equipo obtenidas exitosamente',
            agendas: agendas,
            total: agendas.length
        });
    } catch (error) {
        console.error('Error al obtener las agendas del equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER PRÓXIMOS ENTRENAMIENTOS
agendaEntrenamientosCtl.getUpcomingTrainings = async (req, res) => {
    try {
        const query = `
            SELECT ae.*, 
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CONCAT(ae.fecha, ' ', ae.hora) as fecha_hora_completa,
                   DATEDIFF(ae.fecha, CURDATE()) as dias_restantes
            FROM agendaEntrenamientos ae
            LEFT JOIN teams t ON ae.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE ae.estado = 'activo' 
            AND ae.fecha >= CURDATE()
            ORDER BY ae.fecha ASC, ae.hora ASC
            LIMIT 10
        `;
        
        const [proximosEntrenamientos] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Próximos entrenamientos obtenidos exitosamente',
            entrenamientos: proximosEntrenamientos,
            total: proximosEntrenamientos.length
        });
    } catch (error) {
        console.error('Error al obtener los próximos entrenamientos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER ENTRENAMIENTOS DE HOY
agendaEntrenamientosCtl.getTodayTrainings = async (req, res) => {
    try {
        const query = `
            SELECT ae.*, 
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CONCAT(ae.fecha, ' ', ae.hora) as fecha_hora_completa
            FROM agendaEntrenamientos ae
            LEFT JOIN teams t ON ae.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE ae.estado = 'activo' 
            AND ae.fecha = CURDATE()
            ORDER BY ae.hora ASC
        `;
        
        const [entrenamientosHoy] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Entrenamientos de hoy obtenidos exitosamente',
            entrenamientos: entrenamientosHoy,
            total: entrenamientosHoy.length
        });
    } catch (error) {
        console.error('Error al obtener los entrenamientos de hoy:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = agendaEntrenamientosCtl;
