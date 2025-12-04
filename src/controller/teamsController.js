// controller/teamsController.js
// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const TeamSocial = require('../model/nonRelational/TeamSocial'); // Modelo no relacional para contenido social de equipos
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const teamsCtl = {};

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

// --- CRUD de Equipos ---

// 1. CREAR NUEVO EQUIPO
teamsCtl.createTeam = async (req, res) => {
    const { nombre, logo, entrenador, redesSociales, colores, himno, historia } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // 1. Crear equipo en MySQL usando SQL directo
        const [resultado] = await sql.promise().query(
            "INSERT INTO teams (nombre, logo, entrenador, estado, fecha_creacion) VALUES (?, ?, ?, 'activo', ?)",
            [nombre, logo, entrenador, formattedNow]
        );

        const teamId = resultado.insertId;

        // 2. Crear contenido social inicial en MongoDB
        const defaultTeamSocial = new TeamSocial({
            teamId: teamId,
            redesSociales: redesSociales || {
                facebook: "",
                instagram: "",
                twitter: "",
                youtube: "",
                tiktok: ""
            },
            publicaciones: [{
                tipo: "texto",
                contenido: `¡Bienvenidos al equipo ${nombre}! 🚀⚽`,
                fecha: new Date(),
                likes: 0,
                comentarios: 0,
                hashtags: [nombre.replace(/\s+/g, ''), "futbol", "equipo"]
            }],
            seguidores: {
                facebook: 0,
                instagram: 0,
                twitter: 0
            },
            himno: himno || "",
            historia: historia || `Historia del equipo ${nombre}`,
            colores: colores || {
                primario: "#000000",
                secundario: "#FFFFFF"
            },
            estado: true
        });

        await defaultTeamSocial.save();

        // 3. Obtener el equipo completo para la respuesta
        const [equipoCreado] = await sql.promise().query("SELECT * FROM teams WHERE id = ?", [teamId]);

        res.status(201).json({
            message: 'Equipo y contenido social creados exitosamente',
            equipo: equipoCreado[0],
            contenidoSocial: defaultTeamSocial
        });
    } catch (error) {
        console.error('Error al crear el equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS EQUIPOS (Usando SQL Directo)
teamsCtl.getAllTeams = async (req, res) => {
    try {
        const [teamsSQL] = await sql.promise().query("SELECT * FROM teams WHERE estado = 'activo' ORDER BY nombre ASC");
        
        res.status(200).json(teamsSQL);
    } catch (error) {
        console.error('Error al obtener todos los equipos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER EQUIPO POR ID (Usando SQL Directo)
teamsCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [teamsSQL] = await sql.promise().query("SELECT * FROM teams WHERE id = ? AND estado = 'activo'", [id]);
        
        if (teamsSQL.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado.' });
        }
        
        const teamSQL = teamsSQL[0];
        
        res.status(200).json(teamSQL);
    } catch (error) {
        console.error('Error al obtener el equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR EQUIPOS CON INFORMACIÓN DETALLADA (Usando SQL Directo + MongoDB)
teamsCtl.mostrarTeams = async (req, res) => {
    try {
        const query = `
            SELECT t.*,
                   COUNT(j.id) as total_jugadores,
                   CASE 
                     WHEN t.estado = 'activo' THEN '✅'
                     WHEN t.estado = 'inactivo' THEN '⏸️'
                     ELSE '❌'
                   END as icono_estado,
                   CASE 
                     WHEN COUNT(j.id) = 0 THEN 'Sin jugadores'
                     WHEN COUNT(j.id) = 1 THEN 'Un jugador'
                     ELSE CONCAT(COUNT(j.id), ' jugadores')
                   END as descripcion_jugadores
            FROM teams t
            LEFT JOIN jugadores j ON t.id = j.equipoId AND j.estado = 'activo'
            WHERE t.estado = 'activo'
            GROUP BY t.id, t.nombre, t.logo, t.entrenador, t.estado, t.fecha_creacion, t.fecha_modificacion
            ORDER BY t.nombre ASC
        `;
        
        const [equipos] = await sql.promise().query(query);
        
        // Obtener contenido social de algunos equipos como muestra
        let contenidoSocialMuestra = null;
        if (equipos.length > 0) {
            contenidoSocialMuestra = await TeamSocial.findOne({ 
                teamId: equipos[0].id, 
                estado: true 
            });
        }
        
        res.status(200).json({
            message: 'Equipos con información detallada obtenidos exitosamente',
            equipos: equipos,
            contenidoSocialMuestra: contenidoSocialMuestra,
            total: equipos.length
        });
    } catch (error) {
        console.error('Error al mostrar los equipos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR EQUIPO (Usando SQL Directo)
teamsCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, logo, entrenador } = req.body;
    
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
        if (logo) {
            campos.push('logo = ?');
            valores.push(logo);
        }
        if (entrenador) {
            campos.push('entrenador = ?');
            valores.push(entrenador);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE teams SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Equipo no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Equipo actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR EQUIPO (Usando SQL Directo)
teamsCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Obtener información del equipo antes de eliminarlo
        const [teamInfo] = await sql.promise().query("SELECT * FROM teams WHERE id = ? AND estado = 'activo'", [id]);
        
        if (teamInfo.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado.' });
        }

        // Eliminar contenido social relacionado (eliminación lógica en MongoDB)
        await TeamSocial.updateMany(
            { teamId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE teams SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado.' });
        }
        
        res.status(200).json({ message: 'Equipo y contenido social eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR EQUIPO CON ENCRIPTACIÓN
teamsCtl.mandarTeam = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [teamsSQL] = await sql.promise().query("SELECT * FROM teams WHERE id = ? AND estado = 'activo'", [id]);
        
        if (teamsSQL.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado.' });
        }
        
        const teamSQL = teamsSQL[0];
        
        // Encriptar fechas sensibles
        const teamEncriptado = {
            ...teamSQL,
            fecha_creacion: teamSQL.fecha_creacion ? encryptDates(teamSQL.fecha_creacion) : null,
            fecha_modificacion: teamSQL.fecha_modificacion ? encryptDates(teamSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(teamEncriptado);
    } catch (error) {
        console.error('Error al mandar el equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA CONTENIDO SOCIAL (MongoDB) ---

// 8. OBTENER CONTENIDO SOCIAL DE UN EQUIPO
teamsCtl.getTeamSocial = async (req, res) => {
    const { teamId } = req.params;
    
    try {
        const teamSocial = await TeamSocial.findOne({ 
            teamId: parseInt(teamId), 
            estado: true 
        });
        
        if (!teamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        res.status(200).json({
            message: 'Contenido social obtenido exitosamente',
            teamId: parseInt(teamId),
            contenidoSocial: teamSocial
        });
    } catch (error) {
        console.error('Error al obtener contenido social:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER EQUIPO COMPLETO CON TODO SU CONTENIDO SOCIAL
teamsCtl.getTeamWithSocial = async (req, res) => {
    const { teamId } = req.params;
    
    try {
        // Obtener equipo de MySQL
        const [teamsSQL] = await sql.promise().query("SELECT * FROM teams WHERE id = ? AND estado = 'activo'", [teamId]);
        
        if (teamsSQL.length === 0) {
            return res.status(404).json({ error: 'Equipo no encontrado.' });
        }
        
        const team = teamsSQL[0];
        
        // Obtener contenido social de MongoDB
        const teamSocial = await TeamSocial.findOne({ 
            teamId: parseInt(teamId), 
            estado: true 
        });
        
        res.status(200).json({
            message: 'Equipo con contenido social obtenido exitosamente',
            equipo: team,
            contenidoSocial: teamSocial,
            totalPublicaciones: teamSocial ? teamSocial.publicaciones.length : 0,
            totalSeguidores: teamSocial ? Object.values(teamSocial.seguidores).reduce((a, b) => a + b, 0) : 0
        });
    } catch (error) {
        console.error('Error al obtener datos completos del equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. AGREGAR PUBLICACIÓN AL EQUIPO
teamsCtl.addPost = async (req, res) => {
    const { teamId } = req.params;
    const { tipo, contenido, hashtags } = req.body;
    
    try {
        const teamSocial = await TeamSocial.findOne({ 
            teamId: parseInt(teamId), 
            estado: true 
        });
        
        if (!teamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        teamSocial.publicaciones.push({
            tipo: tipo || 'texto',
            contenido,
            fecha: new Date(),
            likes: 0,
            comentarios: 0,
            hashtags: hashtags || []
        });
        
        await teamSocial.save();
        
        res.status(201).json({ 
            message: 'Publicación agregada exitosamente', 
            contenidoSocial: teamSocial,
            nuevaPublicacion: teamSocial.publicaciones[teamSocial.publicaciones.length - 1]
        });
    } catch (error) {
        console.error('Error al agregar publicación:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. ACTUALIZAR REDES SOCIALES DEL EQUIPO
teamsCtl.updateSocialMedia = async (req, res) => {
    const { teamId } = req.params;
    const { redesSociales } = req.body;
    
    try {
        const updatedTeamSocial = await TeamSocial.findOneAndUpdate(
            { teamId: parseInt(teamId), estado: true },
            { redesSociales },
            { new: true }
        );
        
        if (!updatedTeamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        res.status(200).json({
            message: 'Redes sociales actualizadas exitosamente',
            contenidoSocial: updatedTeamSocial
        });
    } catch (error) {
        console.error('Error al actualizar redes sociales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. ACTUALIZAR SEGUIDORES DEL EQUIPO
teamsCtl.updateFollowers = async (req, res) => {
    const { teamId } = req.params;
    const { seguidores } = req.body;
    
    try {
        const updatedTeamSocial = await TeamSocial.findOneAndUpdate(
            { teamId: parseInt(teamId), estado: true },
            { seguidores },
            { new: true }
        );
        
        if (!updatedTeamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        res.status(200).json({
            message: 'Seguidores actualizados exitosamente',
            contenidoSocial: updatedTeamSocial
        });
    } catch (error) {
        console.error('Error al actualizar seguidores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. DAR LIKE A UNA PUBLICACIÓN
teamsCtl.likePost = async (req, res) => {
    const { teamId, postId } = req.params;
    
    try {
        const teamSocial = await TeamSocial.findOne({ 
            teamId: parseInt(teamId), 
            estado: true 
        });
        
        if (!teamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        const post = teamSocial.publicaciones.id(postId);
        if (!post) {
            return res.status(404).json({ error: 'Publicación no encontrada.' });
        }
        
        post.likes += 1;
        await teamSocial.save();
        
        res.status(200).json({ 
            message: 'Like agregado exitosamente', 
            publicacion: post,
            totalLikes: post.likes
        });
    } catch (error) {
        console.error('Error al dar like:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. ACTUALIZAR INFORMACIÓN DEL EQUIPO (himno, historia, colores)
teamsCtl.updateTeamInfo = async (req, res) => {
    const { teamId } = req.params;
    const { himno, historia, colores } = req.body;
    
    try {
        const updateData = {};
        if (himno !== undefined) updateData.himno = himno;
        if (historia !== undefined) updateData.historia = historia;
        if (colores !== undefined) updateData.colores = colores;
        
        const updatedTeamSocial = await TeamSocial.findOneAndUpdate(
            { teamId: parseInt(teamId), estado: true },
            updateData,
            { new: true }
        );
        
        if (!updatedTeamSocial) {
            return res.status(404).json({ error: 'Contenido social del equipo no encontrado.' });
        }
        
        res.status(200).json({
            message: 'Información del equipo actualizada exitosamente',
            contenidoSocial: updatedTeamSocial
        });
    } catch (error) {
        console.error('Error al actualizar información del equipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. BUSCAR EQUIPOS
teamsCtl.searchTeams = async (req, res) => {
    const { q, estado } = req.query;
    
    try {
        let query = `
            SELECT t.*,
                   COUNT(j.id) as total_jugadores
            FROM teams t
            LEFT JOIN jugadores j ON t.id = j.equipoId AND j.estado = 'activo'
            WHERE t.estado != 'eliminado'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (t.nombre LIKE ? OR t.entrenador LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (estado) {
            query += ` AND t.estado = ?`;
            params.push(estado);
        }
        
        query += ` GROUP BY t.id ORDER BY t.nombre ASC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de equipos realizada exitosamente',
            resultados: resultados,
            filtros: { q, estado },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar equipos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 16. OBTENER ESTADÍSTICAS GENERALES DE EQUIPOS
teamsCtl.getGeneralStats = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(CASE WHEN t.estado = 'activo' THEN 1 END) as equipos_activos,
                COUNT(CASE WHEN t.estado = 'inactivo' THEN 1 END) as equipos_inactivos,
                COUNT(CASE WHEN t.estado = 'eliminado' THEN 1 END) as equipos_eliminados,
                COUNT(j.id) as total_jugadores,
                COUNT(DISTINCT j.equipoId) as equipos_con_jugadores,
                COUNT(t.id) as total_equipos
            FROM teams t
            LEFT JOIN jugadores j ON t.id = j.equipoId AND j.estado = 'activo'
            WHERE t.estado != 'eliminado'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de equipos obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = teamsCtl;
