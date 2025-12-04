// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const Favorito = require('../model/nonRelational/favoritos'); // Modelo no relacional para favoritos
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const newsCtl = {};

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

// --- CRUD de Noticias ---

// 1. CREAR NUEVA NOTICIA
newsCtl.createNews = async (req, res) => {
    const { titulo, contenido, autor, categoria, etiquetas } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevaNoticiaSQL = {
            titulo: titulo,
            contenido: contenido,
            autor: autor,
            categoria: categoria || 'general',
            fecha: formattedNow,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const noticiaGuardadaSQL = await orm.news.create(nuevaNoticiaSQL);

        // Crear registro inicial en favoritos para estadísticas
        const favoritoStats = new Favorito({
            newsId: noticiaGuardadaSQL.id,
            userId: 0, // Usuario del sistema para estadísticas
            tipoEntidad: 'noticia_stats',
            entidadId: noticiaGuardadaSQL.id,
            etiquetas: ['estadisticas', 'nueva', ...(etiquetas || [])],
            notas: `Noticia creada: ${titulo}`,
            fechaMarcado: new Date(),
            prioridad: 'normal',
            contadorVistas: 0,
            estado: true
        });

        await favoritoStats.save();
        
        res.status(201).json({ 
            message: 'Noticia y registro de estadísticas creados exitosamente',
            noticia: noticiaGuardadaSQL,
            statsId: favoritoStats._id
        });
    } catch (error) {
        console.error('Error al crear la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODAS LAS NOTICIAS (Usando SQL Directo)
newsCtl.getAllNews = async (req, res) => {
    try {
        const [noticiasSQL] = await sql.promise().query("SELECT * FROM news WHERE estado = 'activo' ORDER BY fecha DESC");
        
        res.status(200).json(noticiasSQL);
    } catch (error) {
        console.error('Error al obtener todas las noticias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER NOTICIA POR ID (Usando SQL Directo)
newsCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [noticiasSQL] = await sql.promise().query("SELECT * FROM news WHERE id = ? AND estado = 'activo'", [id]);
        
        if (noticiasSQL.length === 0) {
            return res.status(404).json({ error: 'Noticia no encontrada.' });
        }
        
        const noticiaSQL = noticiasSQL[0];
        
        res.status(200).json(noticiaSQL);
    } catch (error) {
        console.error('Error al obtener la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR NOTICIAS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
newsCtl.mostrarNews = async (req, res) => {
    try {
        const query = `
            SELECT n.*, 
                   CASE 
                     WHEN n.categoria = 'deportes' THEN '⚽'
                     WHEN n.categoria = 'general' THEN '📰'
                     WHEN n.categoria = 'eventos' THEN '📅'
                     ELSE '📋'
                   END as icono_categoria,
                   CASE 
                     WHEN DATE(n.fecha) = CURDATE() THEN 'Hoy'
                     WHEN DATE(n.fecha) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 'Ayer'
                     ELSE DATE_FORMAT(n.fecha, '%d/%m/%Y')
                   END as fecha_relativa,
                   DATEDIFF(CURDATE(), DATE(n.fecha)) as dias_publicado,
                   LENGTH(n.contenido) as longitud_contenido
            FROM news n
            WHERE n.estado = 'activo'
            ORDER BY n.fecha DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Noticias con información detallada obtenidas exitosamente',
            noticias: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar las noticias:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR NOTICIA (Usando SQL Directo)
newsCtl.update = async (req, res) => {
    const { id } = req.params;
    const { titulo, contenido, autor, categoria } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (titulo) {
            campos.push('titulo = ?');
            valores.push(titulo);
        }
        if (contenido) {
            campos.push('contenido = ?');
            valores.push(contenido);
        }
        if (autor) {
            campos.push('autor = ?');
            valores.push(autor);
        }
        if (categoria) {
            campos.push('categoria = ?');
            valores.push(categoria);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE news SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Noticia no encontrada.' });
            }
        }
        
        res.status(200).json({ message: 'Noticia actualizada correctamente.' });
    } catch (error) {
        console.error('Error al actualizar la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR NOTICIA (Usando SQL Directo) - NOMBRE CAMBIADO PARA EVITAR CONFLICTOS CON 'delete'
newsCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Desactivar favoritos relacionados (eliminación lógica en MongoDB)
        await Favorito.updateMany(
            { newsId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE news SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Noticia no encontrada.' });
        }
        
        res.status(200).json({ message: 'Noticia y favoritos relacionados eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR NOTICIA CON ENCRIPTACIÓN
newsCtl.mandarNews = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [noticiasSQL] = await sql.promise().query("SELECT * FROM news WHERE id = ? AND estado = 'activo'", [id]);
        
        if (noticiasSQL.length === 0) {
            return res.status(404).json({ error: 'Noticia no encontrada.' });
        }
        
        const noticiaSQL = noticiasSQL[0];
        
        // Encriptar fechas sensibles
        const noticiaEncriptada = {
            ...noticiaSQL,
            fecha_creacion: noticiaSQL.fecha_creacion ? encryptDates(noticiaSQL.fecha_creacion) : null,
            fecha_modificacion: noticiaSQL.fecha_modificacion ? encryptDates(noticiaSQL.fecha_modificacion) : null,
            fecha: noticiaSQL.fecha ? encryptDates(noticiaSQL.fecha) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(noticiaEncriptada);
    } catch (error) {
        console.error('Error al mandar la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA FAVORITOS (MongoDB) ---

// 8. OBTENER FAVORITOS DE UNA NOTICIA ESPECÍFICA
newsCtl.getNewsFavoritos = async (req, res) => {
    const { newsId } = req.params;
    
    try {
        const favoritos = await Favorito.find({ 
            newsId: parseInt(newsId), 
            estado: true,
            tipoEntidad: 'noticia'
        }).sort({ fechaMarcado: -1 });
        
        res.status(200).json({
            message: 'Favoritos de la noticia obtenidos exitosamente',
            favoritos: favoritos,
            total: favoritos.length
        });
    } catch (error) {
        console.error('Error al obtener favoritos de la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER NOTICIA COMPLETA CON INFORMACIÓN DE FAVORITOS
newsCtl.getNewsWithFavoritos = async (req, res) => {
    const { newsId } = req.params;
    
    try {
        // Obtener noticia de MySQL
        const [noticiasSQL] = await sql.promise().query("SELECT * FROM news WHERE id = ? AND estado = 'activo'", [newsId]);
        
        if (noticiasSQL.length === 0) {
            return res.status(404).json({ error: 'Noticia no encontrada.' });
        }
        
        const noticia = noticiasSQL[0];
        
        // Obtener favoritos de MongoDB
        const favoritos = await Favorito.find({ 
            newsId: parseInt(newsId), 
            estado: true,
            tipoEntidad: 'noticia'
        }).sort({ fechaMarcado: -1 });
        
        // Calcular estadísticas
        const totalFavoritos = favoritos.length;
        const vistasTotales = favoritos.reduce((sum, fav) => sum + (fav.contadorVistas || 0), 0);
        const favoritosConValoracion = favoritos.filter(f => f.valoracion);
        const valoracionPromedio = favoritosConValoracion.length > 0 
            ? favoritosConValoracion.reduce((sum, f) => sum + f.valoracion, 0) / favoritosConValoracion.length 
            : 0;
        
        res.status(200).json({
            message: 'Noticia con favoritos obtenida exitosamente',
            noticia,
            favoritos,
            estadisticas: {
                totalFavoritos,
                vistasTotales,
                valoracionPromedio: parseFloat(valoracionPromedio.toFixed(1)),
                usuariosUnicos: new Set(favoritos.map(f => f.userId)).size
            }
        });
    } catch (error) {
        console.error('Error al obtener datos completos de la noticia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. MARCAR NOTICIA COMO FAVORITA
newsCtl.addToFavorites = async (req, res) => {
    const { newsId } = req.params;
    const { userId, etiquetas, notas, prioridad, valoracion } = req.body;
    
    try {
        // Verificar si ya existe este favorito
        const existingFavorito = await Favorito.findOne({
            newsId: parseInt(newsId),
            userId: parseInt(userId),
            tipoEntidad: 'noticia',
            estado: true
        });
        
        if (existingFavorito) {
            return res.status(400).json({ error: 'Esta noticia ya está en favoritos.' });
        }
        
        const nuevoFavorito = new Favorito({
            newsId: parseInt(newsId),
            userId: parseInt(userId),
            tipoEntidad: 'noticia',
            entidadId: parseInt(newsId),
            etiquetas: etiquetas || [],
            notas: notas || '',
            fechaMarcado: new Date(),
            prioridad: prioridad || 'normal',
            valoracion: valoracion || null,
            contadorVistas: 1,
            ultimaVista: new Date(),
            estado: true
        });
        
        await nuevoFavorito.save();
        
        res.status(201).json({ 
            message: 'Noticia agregada a favoritos exitosamente', 
            favorito: nuevoFavorito 
        });
    } catch (error) {
        console.error('Error al agregar a favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. REMOVER NOTICIA DE FAVORITOS
newsCtl.removeFromFavorites = async (req, res) => {
    const { newsId, userId } = req.params;
    
    try {
        const updatedFavorito = await Favorito.findOneAndUpdate(
            { 
                newsId: parseInt(newsId), 
                userId: parseInt(userId),
                tipoEntidad: 'noticia',
                estado: true 
            },
            { estado: false },
            { new: true }
        );
        
        if (!updatedFavorito) {
            return res.status(404).json({ error: 'Favorito no encontrado.' });
        }
        
        res.status(200).json({ message: 'Noticia removida de favoritos exitosamente.' });
    } catch (error) {
        console.error('Error al remover de favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. REGISTRAR VISTA DE FAVORITO
newsCtl.registerFavoriteView = async (req, res) => {
    const { newsId, userId } = req.params;
    
    try {
        const favorito = await Favorito.findOne({
            newsId: parseInt(newsId),
            userId: parseInt(userId),
            tipoEntidad: 'noticia',
            estado: true
        });
        
        if (favorito) {
            favorito.contadorVistas = (favorito.contadorVistas || 0) + 1;
            favorito.ultimaVista = new Date();
            await favorito.save();
        }
        
        res.status(200).json({ 
            message: 'Vista registrada exitosamente', 
            vistas: favorito?.contadorVistas || 0 
        });
    } catch (error) {
        console.error('Error al registrar vista:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. ACTUALIZAR FAVORITO
newsCtl.updateFavorite = async (req, res) => {
    const { newsId, userId } = req.params;
    const { etiquetas, notas, prioridad, valoracion } = req.body;
    
    try {
        const updatedFavorito = await Favorito.findOneAndUpdate(
            { 
                newsId: parseInt(newsId), 
                userId: parseInt(userId),
                tipoEntidad: 'noticia',
                estado: true 
            },
            { 
                etiquetas: etiquetas || [],
                notas: notas || '',
                prioridad: prioridad || 'normal',
                valoracion: valoracion || null
            },
            { new: true }
        );
        
        if (!updatedFavorito) {
            return res.status(404).json({ error: 'Favorito no encontrado.' });
        }
        
        res.status(200).json({ 
            message: 'Favorito actualizado exitosamente', 
            favorito: updatedFavorito 
        });
    } catch (error) {
        console.error('Error al actualizar favorito:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. OBTENER FAVORITOS DE UN USUARIO
newsCtl.getUserFavorites = async (req, res) => {
    const { userId } = req.params;
    const { etiqueta, prioridad, limite = 20, pagina = 1 } = req.query;
    
    try {
        const filtros = {
            userId: parseInt(userId),
            tipoEntidad: 'noticia',
            estado: true
        };
        
        if (etiqueta) filtros.etiquetas = { $in: [etiqueta] };
        if (prioridad) filtros.prioridad = prioridad;
        
        const favoritos = await Favorito.find(filtros)
            .sort({ fechaMarcado: -1 })
            .limit(parseInt(limite))
            .skip((parseInt(pagina) - 1) * parseInt(limite));
        
        res.status(200).json({
            message: 'Favoritos del usuario obtenidos exitosamente',
            favoritos: favoritos,
            total: favoritos.length,
            pagina: parseInt(pagina),
            limite: parseInt(limite)
        });
    } catch (error) {
        console.error('Error al obtener favoritos del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. OBTENER ESTADÍSTICAS DE FAVORITOS
newsCtl.getFavoriteStats = async (req, res) => {
    try {
        const stats = await Favorito.aggregate([
            { 
                $match: { 
                    tipoEntidad: 'noticia', 
                    estado: true,
                    userId: { $ne: 0 } // Excluir estadísticas del sistema
                } 
            },
            {
                $group: {
                    _id: '$newsId',
                    totalFavoritos: { $sum: 1 },
                    vistasTotales: { $sum: '$contadorVistas' },
                    valoracionPromedio: { $avg: '$valoracion' },
                    ultimaActividad: { $max: '$ultimaVista' }
                }
            },
            { $sort: { totalFavoritos: -1 } },
            { $limit: 10 }
        ]);
        
        res.status(200).json({
            message: 'Estadísticas de favoritos obtenidas exitosamente',
            noticiasPopulares: stats,
            resumen: {
                totalNoticias: stats.length,
                promedioFavoritos: stats.length > 0 
                    ? stats.reduce((sum, s) => sum + s.totalFavoritos, 0) / stats.length 
                    : 0
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de favoritos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = newsCtl;
