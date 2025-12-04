// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const comentariosCtl = {};

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

// --- CRUD de Comentarios ---

// 1. CREAR NUEVO COMENTARIO
comentariosCtl.createComentario = async (req, res) => {
    const { contenido, tipo, entidadId, usuarioId } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoComentarioSQL = {
            contenido: contenido,
            tipo: tipo,
            entidadId: entidadId,
            usuarioId: usuarioId,
            estado: 'activo',
            fecha_creacion: formattedNow,
            creadoEn: formattedNow
        };

        const comentarioGuardadoSQL = await orm.comentarios.create(nuevoComentarioSQL);
        
        res.status(201).json({ 
            message: 'Comentario creado exitosamente',
            comentario: comentarioGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS COMENTARIOS (Usando SQL Directo)
comentariosCtl.getAllComentarios = async (req, res) => {
    try {
        const [comentariosSQL] = await sql.promise().query("SELECT * FROM comentarios WHERE estado = 'activo' ORDER BY creadoEn DESC");
        
        res.status(200).json(comentariosSQL);
    } catch (error) {
        console.error('Error al obtener todos los comentarios:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER COMENTARIO POR ID (Usando SQL Directo)
comentariosCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [comentariosSQL] = await sql.promise().query("SELECT * FROM comentarios WHERE id = ? AND estado = 'activo'", [id]);
        
        if (comentariosSQL.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        }
        
        const comentarioSQL = comentariosSQL[0];
        
        res.status(200).json(comentarioSQL);
    } catch (error) {
        console.error('Error al obtener el comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR COMENTARIOS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
comentariosCtl.mostrarComentarios = async (req, res) => {
    try {
        const query = `
            SELECT c.*, 
                   u.nombre as usuario_nombre,
                   CASE 
                     WHEN c.tipo = 'match' THEN CONCAT('Partido: ', m.fecha, ' - ', t1.nombre, ' vs ', t2.nombre)
                     WHEN c.tipo = 'team' THEN CONCAT('Equipo: ', t.nombre)
                     WHEN c.tipo = 'player' THEN CONCAT('Jugador: ', p.nombre, ' ', p.apellido)
                     WHEN c.tipo = 'news' THEN CONCAT('Noticia: ', n.titulo)
                     ELSE c.tipo
                   END as entidad_info,
                   CASE 
                     WHEN TIMESTAMPDIFF(MINUTE, c.creadoEn, NOW()) < 60 
                       THEN CONCAT(TIMESTAMPDIFF(MINUTE, c.creadoEn, NOW()), ' min ago')
                     WHEN TIMESTAMPDIFF(HOUR, c.creadoEn, NOW()) < 24 
                       THEN CONCAT(TIMESTAMPDIFF(HOUR, c.creadoEn, NOW()), ' hrs ago')
                     ELSE CONCAT(TIMESTAMPDIFF(DAY, c.creadoEn, NOW()), ' días ago')
                   END as tiempo_transcurrido,
                   CASE 
                     WHEN c.tipo = 'match' THEN '⚽'
                     WHEN c.tipo = 'team' THEN '👥'
                     WHEN c.tipo = 'player' THEN '🏃‍♂️'
                     WHEN c.tipo = 'news' THEN '📰'
                     ELSE '💬'
                   END as icono_tipo
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuarioId = u.id
            LEFT JOIN matches m ON c.tipo = 'match' AND c.entidadId = m.id
            LEFT JOIN teams t1 ON m.equipoLocalId = t1.id
            LEFT JOIN teams t2 ON m.equipoVisitanteId = t2.id
            LEFT JOIN teams t ON c.tipo = 'team' AND c.entidadId = t.id
            LEFT JOIN players p ON c.tipo = 'player' AND c.entidadId = p.id
            LEFT JOIN news n ON c.tipo = 'news' AND c.entidadId = n.id
            WHERE c.estado = 'activo'
            ORDER BY c.creadoEn DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Comentarios con información detallada obtenidos exitosamente',
            comentarios: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los comentarios:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR COMENTARIO (Usando SQL Directo)
comentariosCtl.update = async (req, res) => {
    const { id } = req.params;
    const { contenido, tipo, entidadId } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (contenido) {
            campos.push('contenido = ?');
            valores.push(contenido);
        }
        if (tipo) {
            campos.push('tipo = ?');
            valores.push(tipo);
        }
        if (entidadId) {
            campos.push('entidadId = ?');
            valores.push(entidadId);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE comentarios SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Comentario no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Comentario actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR COMENTARIO (Usando SQL Directo)
comentariosCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE comentarios SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        }
        
        res.status(200).json({ message: 'Comentario eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR COMENTARIO CON ENCRIPTACIÓN
comentariosCtl.mandarComentario = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [comentariosSQL] = await sql.promise().query("SELECT * FROM comentarios WHERE id = ? AND estado = 'activo'", [id]);
        
        if (comentariosSQL.length === 0) {
            return res.status(404).json({ error: 'Comentario no encontrado.' });
        }
        
        const comentarioSQL = comentariosSQL[0];
        
        // Encriptar fechas sensibles
        const comentarioEncriptado = {
            ...comentarioSQL,
            fecha_creacion: comentarioSQL.fecha_creacion ? encryptDates(comentarioSQL.fecha_creacion) : null,
            fecha_modificacion: comentarioSQL.fecha_modificacion ? encryptDates(comentarioSQL.fecha_modificacion) : null,
            creadoEn: comentarioSQL.creadoEn ? encryptDates(comentarioSQL.creadoEn) : null
        };
        
        res.status(200).json(comentarioEncriptado);
    } catch (error) {
        console.error('Error al mandar el comentario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER COMENTARIOS POR TIPO DE ENTIDAD
comentariosCtl.getComentariosByTipo = async (req, res) => {
    const { tipo } = req.params;
    
    try {
        const [comentarios] = await sql.promise().query(
            "SELECT * FROM comentarios WHERE tipo = ? AND estado = 'activo' ORDER BY creadoEn DESC", 
            [tipo]
        );
        
        res.status(200).json({
            message: `Comentarios de tipo ${tipo} obtenidos exitosamente`,
            comentarios: comentarios,
            total: comentarios.length
        });
    } catch (error) {
        console.error('Error al obtener los comentarios por tipo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER COMENTARIOS POR USUARIO
comentariosCtl.getComentariosByUsuario = async (req, res) => {
    const { usuarioId } = req.params;
    
    try {
        const query = `
            SELECT c.*, 
                   u.nombre as usuario_nombre,
                   CASE 
                     WHEN c.tipo = 'match' THEN 'Partido'
                     WHEN c.tipo = 'team' THEN 'Equipo'
                     WHEN c.tipo = 'player' THEN 'Jugador'
                     WHEN c.tipo = 'news' THEN 'Noticia'
                     ELSE c.tipo
                   END as tipo_entidad
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuarioId = u.id
            WHERE c.usuarioId = ? AND c.estado = 'activo'
            ORDER BY c.creadoEn DESC
        `;
        
        const [comentarios] = await sql.promise().query(query, [usuarioId]);
        
        res.status(200).json({
            message: 'Comentarios del usuario obtenidos exitosamente',
            comentarios: comentarios,
            total: comentarios.length
        });
    } catch (error) {
        console.error('Error al obtener los comentarios del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER COMENTARIOS POR ENTIDAD ESPECÍFICA
comentariosCtl.getComentariosByEntidad = async (req, res) => {
    const { tipo, entidadId } = req.params;
    
    try {
        const query = `
            SELECT c.*, 
                   u.nombre as usuario_nombre,
                   CASE 
                     WHEN TIMESTAMPDIFF(MINUTE, c.creadoEn, NOW()) < 60 
                       THEN CONCAT(TIMESTAMPDIFF(MINUTE, c.creadoEn, NOW()), ' min ago')
                     WHEN TIMESTAMPDIFF(HOUR, c.creadoEn, NOW()) < 24 
                       THEN CONCAT(TIMESTAMPDIFF(HOUR, c.creadoEn, NOW()), ' hrs ago')
                     ELSE CONCAT(TIMESTAMPDIFF(DAY, c.creadoEn, NOW()), ' días ago')
                   END as tiempo_transcurrido
            FROM comentarios c
            LEFT JOIN usuarios u ON c.usuarioId = u.id
            WHERE c.tipo = ? AND c.entidadId = ? AND c.estado = 'activo'
            ORDER BY c.creadoEn DESC
        `;
        
        const [comentarios] = await sql.promise().query(query, [tipo, entidadId]);
        
        res.status(200).json({
            message: `Comentarios de ${tipo} obtenidos exitosamente`,
            comentarios: comentarios,
            total: comentarios.length
        });
    } catch (error) {
        console.error('Error al obtener los comentarios de la entidad:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = comentariosCtl;
