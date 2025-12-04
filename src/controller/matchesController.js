// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const MatchEvents = require('../model/nonRelational/MatchEvents'); // Modelo no relacional para eventos de partidos
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const matchesCtl = {};

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

// --- CRUD de Matches ---

// 1. CREAR NUEVO MATCH
matchesCtl.createMatch = async (req, res) => {
    const { fecha, hora, equipoLocalId, equipoVisitanteId, descripcion, estado_partido, clima, asistencia, arbitroComentarios } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoMatchSQL = {
            fecha: fecha,
            hora: hora,
            equipoLocalId: equipoLocalId,
            equipoVisitanteId: equipoVisitanteId,
            descripcion: descripcion,
            estado_partido: estado_partido || 'programado',
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const matchGuardadoSQL = await orm.matches.create(nuevoMatchSQL);

        // Crear eventos iniciales en MongoDB
        const defaultMatchEvents = {
            matchId: matchGuardadoSQL.id,
            eventos: [], // Sin eventos iniciales
            comentarios: [{
                minuto: 0,
                comentario: `Partido creado: ${descripcion || 'Nuevo partido'}`,
                timestamp: new Date()
            }],
            clima: clima || {
                temperatura: "22°C",
                condicion: "soleado"
            },
            asistencia: asistencia || 0,
            arbitroComentarios: arbitroComentarios || "Partido creado correctamente",
            estado: true
        };
        
        const matchEvents = await MatchEvents.create(defaultMatchEvents);
        
        res.status(201).json({ 
            message: 'Partido creado exitosamente',
            partido: matchGuardadoSQL,
            eventos: matchEvents
        });
    } catch (error) {
        console.error('Error al crear el partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS MATCHES (Usando SQL Directo)
matchesCtl.getAllMatches = async (req, res) => {
    try {
        const [matchesSQL] = await sql.promise().query("SELECT * FROM matches WHERE estado = 'activo' ORDER BY fecha DESC, hora DESC");
        
        res.status(200).json(matchesSQL);
    } catch (error) {
        console.error('Error al obtener todos los matches:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER MATCH POR ID (Usando SQL Directo)
matchesCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [matchesSQL] = await sql.promise().query("SELECT * FROM matches WHERE id = ? AND estado = 'activo'", [id]);
        
        if (matchesSQL.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado.' });
        }
        
        const matchSQL = matchesSQL[0];
        
        res.status(200).json(matchSQL);
    } catch (error) {
        console.error('Error al obtener el partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR MATCHES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
matchesCtl.mostrarMatches = async (req, res) => {
    try {
        const query = `
            SELECT m.*, 
                   tl.nombre as equipo_local_nombre,
                   tv.nombre as equipo_visitante_nombre,
                   dl.nombre as division_local,
                   dv.nombre as division_visitante,
                   CONCAT(tl.nombre, ' vs ', tv.nombre) as partido_descripcion,
                   CASE 
                     WHEN m.estado_partido = 'programado' THEN '⏰'
                     WHEN m.estado_partido = 'en_curso' THEN '⚽'
                     WHEN m.estado_partido = 'finalizado' THEN '✅'
                     WHEN m.estado_partido = 'cancelado' THEN '❌'
                     ELSE '📋'
                   END as icono_estado,
                   CASE 
                     WHEN CONCAT(m.fecha, ' ', m.hora) > NOW() THEN 'Próximo'
                     WHEN m.estado_partido = 'finalizado' THEN 'Finalizado'
                     ELSE 'En Curso'
                   END as estado_temporal
            FROM matches m
            LEFT JOIN teams tl ON m.equipoLocalId = tl.id
            LEFT JOIN teams tv ON m.equipoVisitanteId = tv.id
            LEFT JOIN divisions dl ON tl.divisionId = dl.id
            LEFT JOIN divisions dv ON tv.divisionId = dv.id
            WHERE m.estado = 'activo'
            ORDER BY m.fecha DESC, m.hora DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        // Si hay partidos, obtener eventos del primer partido como ejemplo
        let eventos = null;
        if (data.length > 0) {
            eventos = await MatchEvents.findOne({ matchId: data[0].id, estado: true });
        }
        
        res.status(200).json({
            message: 'Partidos con información detallada obtenidos exitosamente',
            partidos: data,
            eventos: eventos,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los partidos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR MATCH (Usando SQL Directo)
matchesCtl.update = async (req, res) => {
    const { id } = req.params;
    const { fecha, hora, equipoLocalId, equipoVisitanteId, descripcion, estado_partido } = req.body;
    
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
        if (equipoLocalId) {
            campos.push('equipoLocalId = ?');
            valores.push(equipoLocalId);
        }
        if (equipoVisitanteId) {
            campos.push('equipoVisitanteId = ?');
            valores.push(equipoVisitanteId);
        }
        if (descripcion !== undefined) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (estado_partido) {
            campos.push('estado_partido = ?');
            valores.push(estado_partido);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE matches SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Partido no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Partido actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR MATCH (Usando SQL Directo)
matchesCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Eliminar eventos relacionados (eliminación lógica en MongoDB)
        await MatchEvents.updateMany(
            { matchId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE matches SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Partido no encontrado.' });
        }
        
        res.status(200).json({ message: 'Partido y eventos eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR MATCH CON ENCRIPTACIÓN
matchesCtl.mandarMatch = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [matchesSQL] = await sql.promise().query("SELECT * FROM matches WHERE id = ? AND estado = 'activo'", [id]);
        
        if (matchesSQL.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado.' });
        }
        
        const matchSQL = matchesSQL[0];
        
        // Encriptar fechas sensibles
        const matchEncriptado = {
            ...matchSQL,
            fecha_creacion: matchSQL.fecha_creacion ? encryptDates(matchSQL.fecha_creacion) : null,
            fecha_modificacion: matchSQL.fecha_modificacion ? encryptDates(matchSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(matchEncriptado);
    } catch (error) {
        console.error('Error al mandar el partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA MATCH EVENTS (MongoDB) ---

// 8. OBTENER EVENTOS DE UN PARTIDO ESPECÍFICO
matchesCtl.getMatchEvents = async (req, res) => {
    const { matchId } = req.params;
    
    try {
        const events = await MatchEvents.findOne({ matchId: parseInt(matchId), estado: true });
        
        if (!events) {
            return res.status(404).json({ error: 'Eventos del partido no encontrados.' });
        }
        
        res.status(200).json({
            message: 'Eventos del partido obtenidos exitosamente',
            eventos: events
        });
    } catch (error) {
        console.error('Error al obtener eventos del partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER PARTIDO COMPLETO CON TODOS SUS EVENTOS
matchesCtl.getMatchWithEvents = async (req, res) => {
    const { matchId } = req.params;
    
    try {
        // Obtener partido de MySQL
        const [matchesSQL] = await sql.promise().query("SELECT * FROM matches WHERE id = ? AND estado = 'activo'", [matchId]);
        
        if (matchesSQL.length === 0) {
            return res.status(404).json({ error: 'Partido no encontrado.' });
        }
        
        // Obtener eventos de MongoDB
        const events = await MatchEvents.findOne({ matchId: parseInt(matchId), estado: true });
        
        res.status(200).json({
            message: 'Partido con eventos obtenido exitosamente',
            partido: matchesSQL[0],
            eventos: events,
            totalEventos: events ? events.eventos.length : 0
        });
    } catch (error) {
        console.error('Error al obtener datos completos del partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. AGREGAR EVENTO AL PARTIDO
matchesCtl.addEvent = async (req, res) => {
    const { matchId } = req.params;
    const { minuto, tipo, jugadorId, descripcion } = req.body;
    
    try {
        const matchEvents = await MatchEvents.findOne({ 
            matchId: parseInt(matchId), 
            estado: true 
        });
        
        if (!matchEvents) {
            return res.status(404).json({ error: 'Eventos del partido no encontrados.' });
        }
        
        matchEvents.eventos.push({
            minuto,
            tipo,
            jugadorId,
            descripcion,
            timestamp: new Date()
        });
        
        await matchEvents.save();
        
        res.status(200).json({ 
            message: 'Evento agregado exitosamente', 
            eventos: matchEvents 
        });
    } catch (error) {
        console.error('Error al agregar evento:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. AGREGAR COMENTARIO AL PARTIDO
matchesCtl.addComment = async (req, res) => {
    const { matchId } = req.params;
    const { minuto, comentario } = req.body;
    
    try {
        const matchEvents = await MatchEvents.findOne({ 
            matchId: parseInt(matchId), 
            estado: true 
        });
        
        if (!matchEvents) {
            return res.status(404).json({ error: 'Eventos del partido no encontrados.' });
        }
        
        matchEvents.comentarios.push({
            minuto,
            comentario,
            timestamp: new Date()
        });
        
        await matchEvents.save();
        
        res.status(200).json({ 
            message: 'Comentario agregado exitosamente', 
            eventos: matchEvents 
        });
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. ACTUALIZAR INFORMACIÓN DEL CLIMA Y ASISTENCIA
matchesCtl.updateMatchInfo = async (req, res) => {
    const { matchId } = req.params;
    const { clima, asistencia, arbitroComentarios } = req.body;
    
    try {
        const updateData = {};
        if (clima) updateData.clima = clima;
        if (asistencia !== undefined) updateData.asistencia = asistencia;
        if (arbitroComentarios) updateData.arbitroComentarios = arbitroComentarios;
        
        const updatedEvents = await MatchEvents.findOneAndUpdate(
            { matchId: parseInt(matchId), estado: true },
            updateData,
            { new: true }
        );
        
        if (!updatedEvents) {
            return res.status(404).json({ error: 'Eventos del partido no encontrados.' });
        }
        
        res.status(200).json({
            message: 'Información del partido actualizada exitosamente',
            eventos: updatedEvents
        });
    } catch (error) {
        console.error('Error al actualizar información del partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. OBTENER RESUMEN DEL PARTIDO
matchesCtl.getMatchSummary = async (req, res) => {
    const { matchId } = req.params;
    
    try {
        const events = await MatchEvents.findOne({ matchId: parseInt(matchId), estado: true });
        
        if (!events) {
            return res.status(404).json({ error: 'Eventos no encontrados.' });
        }
        
        // Filtrar eventos importantes (goles, tarjetas)
        const importantEvents = events.eventos.filter(evento => 
            ['gol', 'tarjeta_amarilla', 'tarjeta_roja', 'cambio'].includes(evento.tipo)
        );
        
        res.status(200).json({
            message: 'Resumen del partido obtenido exitosamente',
            resumen: {
                matchId: parseInt(matchId),
                totalEventos: events.eventos.length,
                eventosImportantes: importantEvents,
                clima: events.clima,
                asistencia: events.asistencia,
                ultimoComentario: events.comentarios[events.comentarios.length - 1]
            }
        });
    } catch (error) {
        console.error('Error al obtener resumen del partido:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = matchesCtl;
