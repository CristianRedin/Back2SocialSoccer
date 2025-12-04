// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const PlayerStats = require('../model/nonRelational/PlayerStats'); // Modelo no relacional para estadísticas de jugadores
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const playersCtl = {};

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

// --- CRUD de Jugadores ---

// 1. CREAR NUEVO JUGADOR
playersCtl.createPlayer = async (req, res) => {
    const { nombre, apellido, posicion, edad, equipoId, temporada, dorsal } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoJugadorSQL = {
            nombre: nombre,
            apellido: apellido,
            posicion: posicion,
            edad: edad,
            equipoId: equipoId,
            dorsal: dorsal,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const jugadorGuardadoSQL = await orm.players.create(nuevoJugadorSQL);

        // Crear estadísticas iniciales en MongoDB
        const defaultPlayerStats = {
            playerId: jugadorGuardadoSQL.id,
            temporada: temporada || "2024-2025",
            goles: 0,
            asistencias: 0,
            tarjetasAmarillas: 0,
            tarjetasRojas: 0,
            minutosJugados: 0,
            partidosJugados: 0,
            rating: 0,
            lesiones: [],
            observaciones: `Estadísticas iniciales para ${nombre} ${apellido}`,
            fechaCreacion: new Date(),
            estado: true
        };
        
        const playerStats = await PlayerStats.create(defaultPlayerStats);
        
        res.status(201).json({ 
            message: 'Jugador y estadísticas creados exitosamente',
            jugador: jugadorGuardadoSQL,
            estadisticas: playerStats
        });
    } catch (error) {
        console.error('Error al crear el jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS JUGADORES (Usando SQL Directo)
playersCtl.getAllPlayers = async (req, res) => {
    try {
        const [jugadoresSQL] = await sql.promise().query("SELECT * FROM players WHERE estado = 'activo' ORDER BY nombre ASC");
        
        res.status(200).json(jugadoresSQL);
    } catch (error) {
        console.error('Error al obtener todos los jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER JUGADOR POR ID (Usando SQL Directo)
playersCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [jugadoresSQL] = await sql.promise().query("SELECT * FROM players WHERE id = ? AND estado = 'activo'", [id]);
        
        if (jugadoresSQL.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }
        
        const jugadorSQL = jugadoresSQL[0];
        
        res.status(200).json(jugadorSQL);
    } catch (error) {
        console.error('Error al obtener el jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR JUGADORES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
playersCtl.mostrarPlayers = async (req, res) => {
    try {
        const query = `
            SELECT p.*, 
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CASE 
                     WHEN p.posicion = 'Portero' THEN '🥅'
                     WHEN p.posicion = 'Defensa' THEN '🛡️'
                     WHEN p.posicion = 'Centrocampista' THEN '⚽'
                     WHEN p.posicion = 'Delantero' THEN '🎯'
                     ELSE '👤'
                   END as icono_posicion,
                   CASE 
                     WHEN p.edad < 20 THEN 'Joven'
                     WHEN p.edad >= 20 AND p.edad < 30 THEN 'Adulto'
                     ELSE 'Veterano'
                   END as categoria_edad,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM players p
            LEFT JOIN teams t ON p.equipoId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE p.estado = 'activo'
            ORDER BY p.nombre ASC, p.apellido ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        // Si hay jugadores, obtener estadísticas del primer jugador como ejemplo
        let estadisticas = null;
        if (data.length > 0) {
            estadisticas = await PlayerStats.findOne({ playerId: data[0].id, estado: true });
        }
        
        res.status(200).json({
            message: 'Jugadores con información detallada obtenidos exitosamente',
            jugadores: data,
            estadisticas: estadisticas,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR JUGADOR (Usando SQL Directo)
playersCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, posicion, edad, equipoId, dorsal } = req.body;
    
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
        if (apellido) {
            campos.push('apellido = ?');
            valores.push(apellido);
        }
        if (posicion) {
            campos.push('posicion = ?');
            valores.push(posicion);
        }
        if (edad) {
            campos.push('edad = ?');
            valores.push(edad);
        }
        if (equipoId) {
            campos.push('equipoId = ?');
            valores.push(equipoId);
        }
        if (dorsal) {
            campos.push('dorsal = ?');
            valores.push(dorsal);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE players SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Jugador no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Jugador actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR JUGADOR (Usando SQL Directo)
playersCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Desactivar estadísticas relacionadas (eliminación lógica en MongoDB)
        await PlayerStats.updateMany(
            { playerId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE players SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }
        
        res.status(200).json({ message: 'Jugador y estadísticas eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR JUGADOR CON ENCRIPTACIÓN
playersCtl.mandarPlayer = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [jugadoresSQL] = await sql.promise().query("SELECT * FROM players WHERE id = ? AND estado = 'activo'", [id]);
        
        if (jugadoresSQL.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }
        
        const jugadorSQL = jugadoresSQL[0];
        
        // Encriptar fechas sensibles
        const jugadorEncriptado = {
            ...jugadorSQL,
            fecha_creacion: jugadorSQL.fecha_creacion ? encryptDates(jugadorSQL.fecha_creacion) : null,
            fecha_modificacion: jugadorSQL.fecha_modificacion ? encryptDates(jugadorSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(jugadorEncriptado);
    } catch (error) {
        console.error('Error al mandar el jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA PLAYER STATS (MongoDB) ---

// 8. OBTENER ESTADÍSTICAS DE UN JUGADOR ESPECÍFICO
playersCtl.getPlayerStats = async (req, res) => {
    const { playerId } = req.params;
    
    try {
        const stats = await PlayerStats.find({ 
            playerId: parseInt(playerId), 
            estado: true
        }).sort({ temporada: -1 });
        
        res.status(200).json({
            message: 'Estadísticas del jugador obtenidas exitosamente',
            estadisticas: stats,
            total: stats.length
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER JUGADOR COMPLETO CON TODAS SUS ESTADÍSTICAS
playersCtl.getPlayerWithStats = async (req, res) => {
    const { playerId } = req.params;
    
    try {
        // Obtener jugador de MySQL
        const [jugadoresSQL] = await sql.promise().query("SELECT * FROM players WHERE id = ? AND estado = 'activo'", [playerId]);
        
        if (jugadoresSQL.length === 0) {
            return res.status(404).json({ error: 'Jugador no encontrado.' });
        }
        
        const jugador = jugadoresSQL[0];
        
        // Obtener estadísticas de MongoDB
        const stats = await PlayerStats.find({ 
            playerId: parseInt(playerId), 
            estado: true
        }).sort({ temporada: -1 });
        
        // Calcular totales
        const totales = stats.reduce((acc, stat) => {
            acc.totalGoles += stat.goles || 0;
            acc.totalAsistencias += stat.asistencias || 0;
            acc.totalTarjetasAmarillas += stat.tarjetasAmarillas || 0;
            acc.totalTarjetasRojas += stat.tarjetasRojas || 0;
            acc.totalMinutos += stat.minutosJugados || 0;
            acc.totalPartidos += stat.partidosJugados || 0;
            return acc;
        }, {
            totalGoles: 0,
            totalAsistencias: 0,
            totalTarjetasAmarillas: 0,
            totalTarjetasRojas: 0,
            totalMinutos: 0,
            totalPartidos: 0
        });
        
        res.status(200).json({
            message: 'Jugador con estadísticas obtenido exitosamente',
            jugador,
            estadisticas: stats,
            totales,
            temporadas: stats.length
        });
    } catch (error) {
        console.error('Error al obtener datos completos del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. CREAR ESTADÍSTICAS MANUALMENTE
playersCtl.createPlayerStats = async (req, res) => {
    const { playerId } = req.params;
    const { temporada, goles, asistencias, tarjetasAmarillas, tarjetasRojas, minutosJugados, partidosJugados, rating, observaciones } = req.body;
    
    try {
        // Verificar si ya existen estadísticas para esta temporada
        const existingStats = await PlayerStats.findOne({
            playerId: parseInt(playerId),
            temporada: temporada,
            estado: true
        });
        
        if (existingStats) {
            return res.status(400).json({ error: 'Ya existen estadísticas para este jugador en esta temporada.' });
        }
        
        const nuevasStats = new PlayerStats({
            playerId: parseInt(playerId),
            temporada: temporada,
            goles: goles || 0,
            asistencias: asistencias || 0,
            tarjetasAmarillas: tarjetasAmarillas || 0,
            tarjetasRojas: tarjetasRojas || 0,
            minutosJugados: minutosJugados || 0,
            partidosJugados: partidosJugados || 0,
            rating: rating || 0,
            lesiones: [],
            observaciones: observaciones || `Estadísticas creadas para temporada ${temporada}`,
            fechaCreacion: new Date(),
            estado: true
        });
        
        await nuevasStats.save();
        
        res.status(201).json({ 
            message: 'Estadísticas creadas exitosamente', 
            estadisticas: nuevasStats 
        });
    } catch (error) {
        console.error('Error al crear estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. ACTUALIZAR ESTADÍSTICAS DE UN JUGADOR
playersCtl.updatePlayerStats = async (req, res) => {
    const { statsId } = req.params;
    const { goles, asistencias, tarjetasAmarillas, tarjetasRojas, minutosJugados, partidosJugados, rating, observaciones } = req.body;
    
    try {
        const updatedStats = await PlayerStats.findByIdAndUpdate(
            statsId,
            {
                goles: goles,
                asistencias: asistencias,
                tarjetasAmarillas: tarjetasAmarillas,
                tarjetasRojas: tarjetasRojas,
                minutosJugados: minutosJugados,
                partidosJugados: partidosJugados,
                rating: rating,
                observaciones: observaciones
            },
            { new: true }
        );
        
        if (!updatedStats) {
            return res.status(404).json({ error: 'Estadísticas no encontradas.' });
        }
        
        res.status(200).json({ 
            message: 'Estadísticas actualizadas exitosamente', 
            estadisticas: updatedStats 
        });
    } catch (error) {
        console.error('Error al actualizar estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. OBTENER RANKING DE JUGADORES POR ESTADÍSTICA
playersCtl.getPlayersRanking = async (req, res) => {
    const { stat = 'goles', temporada, limite = 10 } = req.query;
    
    try {
        const matchQuery = { estado: true };
        if (temporada) matchQuery.temporada = temporada;
        
        const ranking = await PlayerStats.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$playerId',
                    total: { $sum: `$${stat}` },
                    temporadas: { $addToSet: '$temporada' },
                    promedioRating: { $avg: '$rating' }
                }
            },
            { $sort: { total: -1 } },
            { $limit: parseInt(limite) }
        ]);
        
        res.status(200).json({
            message: `Ranking de jugadores por ${stat} obtenido exitosamente`,
            ranking: ranking,
            criterio: stat,
            temporada: temporada || 'todas'
        });
    } catch (error) {
        console.error('Error al obtener ranking de jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. OBTENER ESTADÍSTICAS GENERALES
playersCtl.getGeneralStats = async (req, res) => {
    try {
        const totalJugadores = await PlayerStats.countDocuments({ estado: true });
        
        const stats = await PlayerStats.aggregate([
            { $match: { estado: true } },
            {
                $group: {
                    _id: null,
                    totalGoles: { $sum: '$goles' },
                    totalAsistencias: { $sum: '$asistencias' },
                    totalTarjetasAmarillas: { $sum: '$tarjetasAmarillas' },
                    totalTarjetasRojas: { $sum: '$tarjetasRojas' },
                    totalMinutos: { $sum: '$minutosJugados' },
                    totalPartidos: { $sum: '$partidosJugados' },
                    promedioRating: { $avg: '$rating' }
                }
            }
        ]);
        
        const resultado = stats[0] || {
            totalGoles: 0,
            totalAsistencias: 0,
            totalTarjetasAmarillas: 0,
            totalTarjetasRojas: 0,
            totalMinutos: 0,
            totalPartidos: 0,
            promedioRating: 0
        };
        
        res.status(200).json({
            message: 'Estadísticas generales obtenidas exitosamente',
            totalJugadores,
            estadisticasGenerales: resultado
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. AGREGAR LESIÓN A UN JUGADOR
playersCtl.addInjury = async (req, res) => {
    const { playerId, temporada } = req.params;
    const { tipo, fecha, tiempoRecuperacion, descripcion } = req.body;
    
    try {
        const stats = await PlayerStats.findOne({ 
            playerId: parseInt(playerId), 
            temporada: temporada,
            estado: true 
        });
        
        if (!stats) {
            return res.status(404).json({ error: 'Estadísticas no encontradas para esta temporada.' });
        }
        
        stats.lesiones.push({
            tipo,
            fecha: fecha ? new Date(fecha) : new Date(),
            tiempoRecuperacion,
            descripcion: descripcion || '',
            fechaRegistro: new Date()
        });
        
        await stats.save();
        
        res.status(200).json({ 
            message: 'Lesión agregada exitosamente', 
            estadisticas: stats 
        });
    } catch (error) {
        console.error('Error al agregar lesión:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. OBTENER LESIONES DE UN JUGADOR
playersCtl.getPlayerInjuries = async (req, res) => {
    const { playerId } = req.params;
    const { temporada } = req.query;
    
    try {
        const query = { 
            playerId: parseInt(playerId), 
            estado: true
        };
        
        if (temporada) {
            query.temporada = temporada;
        }
        
        const stats = await PlayerStats.find(query).sort({ temporada: -1 });
        
        // Extraer todas las lesiones
        const todasLesiones = stats.flatMap(stat => 
            stat.lesiones.map(lesion => ({
                ...lesion.toObject(),
                temporada: stat.temporada
            }))
        );
        
        res.status(200).json({
            message: 'Lesiones del jugador obtenidas exitosamente',
            lesiones: todasLesiones,
            total: todasLesiones.length
        });
    } catch (error) {
        console.error('Error al obtener lesiones del jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = playersCtl;
