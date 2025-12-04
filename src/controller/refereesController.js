// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const refereesCtl = {};

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

// --- CRUD de Árbitros ---

// 1. CREAR NUEVO ÁRBITRO
refereesCtl.createReferee = async (req, res) => {
    const { nombre, apellido, edad, experiencia, telefono, email, categoria, estado_fisico } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoArbitroSQL = {
            nombre: nombre,
            apellido: apellido,
            edad: edad,
            experiencia: experiencia || 0,
            telefono: telefono,
            email: email,
            categoria: categoria || 'Regional',
            estado_fisico: estado_fisico || 'Bueno',
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const arbitroGuardadoSQL = await orm.referees.create(nuevoArbitroSQL);
        
        res.status(201).json({ 
            message: 'Árbitro creado exitosamente',
            arbitro: arbitroGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el árbitro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS ÁRBITROS (Usando SQL Directo)
refereesCtl.getAllReferees = async (req, res) => {
    try {
        const [arbitrosSQL] = await sql.promise().query("SELECT * FROM referees WHERE estado = 'activo' ORDER BY nombre ASC");
        
        res.status(200).json(arbitrosSQL);
    } catch (error) {
        console.error('Error al obtener todos los árbitros:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER ÁRBITRO POR ID (Usando SQL Directo)
refereesCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [arbitrosSQL] = await sql.promise().query("SELECT * FROM referees WHERE id = ? AND estado = 'activo'", [id]);
        
        if (arbitrosSQL.length === 0) {
            return res.status(404).json({ error: 'Árbitro no encontrado.' });
        }
        
        const arbitroSQL = arbitrosSQL[0];
        
        res.status(200).json(arbitroSQL);
    } catch (error) {
        console.error('Error al obtener el árbitro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR ÁRBITROS CON INFORMACIÓN DETALLADA (Usando SQL Directo)
refereesCtl.mostrarReferees = async (req, res) => {
    try {
        const query = `
            SELECT r.*, 
                   CASE 
                     WHEN r.experiencia < 2 THEN 'Novato'
                     WHEN r.experiencia >= 2 AND r.experiencia < 5 THEN 'Intermedio'
                     WHEN r.experiencia >= 5 AND r.experiencia < 10 THEN 'Experimentado'
                     ELSE 'Veterano'
                   END as nivel_experiencia,
                   CASE 
                     WHEN r.edad < 25 THEN 'Joven'
                     WHEN r.edad >= 25 AND r.edad < 40 THEN 'Adulto'
                     ELSE 'Veterano'
                   END as categoria_edad,
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.categoria = 'Internacional' THEN '🌍'
                     WHEN r.categoria = 'Nacional' THEN '🏆'
                     WHEN r.categoria = 'Regional' THEN '🏅'
                     ELSE '⚽'
                   END as icono_categoria
            FROM referees r
            WHERE r.estado = 'activo'
            ORDER BY r.categoria DESC, r.experiencia DESC, r.nombre ASC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Árbitros con información detallada obtenidos exitosamente',
            arbitros: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los árbitros:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR ÁRBITRO (Usando SQL Directo)
refereesCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, edad, experiencia, telefono, email, categoria, estado_fisico } = req.body;
    
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
        if (edad !== undefined) {
            campos.push('edad = ?');
            valores.push(edad);
        }
        if (experiencia !== undefined) {
            campos.push('experiencia = ?');
            valores.push(experiencia);
        }
        if (telefono) {
            campos.push('telefono = ?');
            valores.push(telefono);
        }
        if (email) {
            campos.push('email = ?');
            valores.push(email);
        }
        if (categoria) {
            campos.push('categoria = ?');
            valores.push(categoria);
        }
        if (estado_fisico) {
            campos.push('estado_fisico = ?');
            valores.push(estado_fisico);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE referees SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Árbitro no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Árbitro actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el árbitro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR ÁRBITRO (Usando SQL Directo)
refereesCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE referees SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Árbitro no encontrado.' });
        }
        
        res.status(200).json({ message: 'Árbitro eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el árbitro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR ÁRBITRO CON ENCRIPTACIÓN
refereesCtl.mandarReferee = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [arbitrosSQL] = await sql.promise().query("SELECT * FROM referees WHERE id = ? AND estado = 'activo'", [id]);
        
        if (arbitrosSQL.length === 0) {
            return res.status(404).json({ error: 'Árbitro no encontrado.' });
        }
        
        const arbitroSQL = arbitrosSQL[0];
        
        // Encriptar datos sensibles
        const arbitroEncriptado = {
            ...arbitroSQL,
            telefono: arbitroSQL.telefono ? cifrarDato(arbitroSQL.telefono) : null,
            email: arbitroSQL.email ? cifrarDato(arbitroSQL.email) : null,
            fecha_creacion: arbitroSQL.fecha_creacion ? encryptDates(arbitroSQL.fecha_creacion) : null,
            fecha_modificacion: arbitroSQL.fecha_modificacion ? encryptDates(arbitroSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(arbitroEncriptado);
    } catch (error) {
        console.error('Error al mandar el árbitro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA ÁRBITROS ---

// 8. OBTENER ÁRBITROS POR CATEGORÍA
refereesCtl.getRefereesByCategory = async (req, res) => {
    const { categoria } = req.params;
    
    try {
        const [arbitrosSQL] = await sql.promise().query(
            "SELECT * FROM referees WHERE categoria = ? AND estado = 'activo' ORDER BY experiencia DESC, nombre ASC", 
            [categoria]
        );
        
        res.status(200).json({
            message: `Árbitros de categoría ${categoria} obtenidos exitosamente`,
            arbitros: arbitrosSQL,
            categoria: categoria,
            total: arbitrosSQL.length
        });
    } catch (error) {
        console.error('Error al obtener árbitros por categoría:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ÁRBITROS DISPONIBLES
refereesCtl.getAvailableReferees = async (req, res) => {
    const { estado_fisico = 'Bueno' } = req.query;
    
    try {
        const query = `
            SELECT r.*, 
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.experiencia < 2 THEN 'Novato'
                     WHEN r.experiencia >= 2 AND r.experiencia < 5 THEN 'Intermedio'
                     WHEN r.experiencia >= 5 AND r.experiencia < 10 THEN 'Experimentado'
                     ELSE 'Veterano'
                   END as nivel_experiencia
            FROM referees r
            WHERE r.estado = 'activo' 
            AND r.estado_fisico = ?
            ORDER BY r.categoria DESC, r.experiencia DESC
        `;
        
        const [arbitros] = await sql.promise().query(query, [estado_fisico]);
        
        res.status(200).json({
            message: 'Árbitros disponibles obtenidos exitosamente',
            arbitros: arbitros,
            filtro: { estado_fisico },
            total: arbitros.length
        });
    } catch (error) {
        console.error('Error al obtener árbitros disponibles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER RANKING DE ÁRBITROS POR EXPERIENCIA
refereesCtl.getRankingByExperience = async (req, res) => {
    const { limite = 10 } = req.query;
    
    try {
        const query = `
            SELECT r.*, 
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.experiencia < 2 THEN 'Novato'
                     WHEN r.experiencia >= 2 AND r.experiencia < 5 THEN 'Intermedio'
                     WHEN r.experiencia >= 5 AND r.experiencia < 10 THEN 'Experimentado'
                     ELSE 'Veterano'
                   END as nivel_experiencia,
                   ROW_NUMBER() OVER (ORDER BY r.experiencia DESC, r.categoria DESC) as ranking
            FROM referees r
            WHERE r.estado = 'activo'
            ORDER BY r.experiencia DESC, r.categoria DESC
            LIMIT ?
        `;
        
        const [ranking] = await sql.promise().query(query, [parseInt(limite)]);
        
        res.status(200).json({
            message: `Top ${limite} árbitros por experiencia obtenido exitosamente`,
            ranking: ranking,
            total: ranking.length
        });
    } catch (error) {
        console.error('Error al obtener ranking de árbitros:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. OBTENER ESTADÍSTICAS GENERALES DE ÁRBITROS
refereesCtl.getGeneralStats = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(*) as total_arbitros,
                ROUND(AVG(edad), 2) as promedio_edad,
                ROUND(AVG(experiencia), 2) as promedio_experiencia,
                MAX(experiencia) as max_experiencia,
                MIN(experiencia) as min_experiencia,
                COUNT(CASE WHEN categoria = 'Internacional' THEN 1 END) as arbitros_internacionales,
                COUNT(CASE WHEN categoria = 'Nacional' THEN 1 END) as arbitros_nacionales,
                COUNT(CASE WHEN categoria = 'Regional' THEN 1 END) as arbitros_regionales,
                COUNT(CASE WHEN estado_fisico = 'Excelente' THEN 1 END) as estado_excelente,
                COUNT(CASE WHEN estado_fisico = 'Bueno' THEN 1 END) as estado_bueno,
                COUNT(CASE WHEN estado_fisico = 'Regular' THEN 1 END) as estado_regular
            FROM referees 
            WHERE estado = 'activo'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de árbitros obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. BUSCAR ÁRBITROS
refereesCtl.searchReferees = async (req, res) => {
    const { q, categoria, edad_min, edad_max, experiencia_min } = req.query;
    
    try {
        let query = `
            SELECT r.*, 
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.experiencia < 2 THEN 'Novato'
                     WHEN r.experiencia >= 2 AND r.experiencia < 5 THEN 'Intermedio'
                     WHEN r.experiencia >= 5 AND r.experiencia < 10 THEN 'Experimentado'
                     ELSE 'Veterano'
                   END as nivel_experiencia
            FROM referees r
            WHERE r.estado = 'activo'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (r.nombre LIKE ? OR r.apellido LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (categoria) {
            query += ` AND r.categoria = ?`;
            params.push(categoria);
        }
        
        if (edad_min) {
            query += ` AND r.edad >= ?`;
            params.push(parseInt(edad_min));
        }
        
        if (edad_max) {
            query += ` AND r.edad <= ?`;
            params.push(parseInt(edad_max));
        }
        
        if (experiencia_min) {
            query += ` AND r.experiencia >= ?`;
            params.push(parseInt(experiencia_min));
        }
        
        query += ` ORDER BY r.experiencia DESC, r.nombre ASC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de árbitros realizada exitosamente',
            resultados: resultados,
            filtros: { q, categoria, edad_min, edad_max, experiencia_min },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar árbitros:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. ACTUALIZAR ESTADO FÍSICO DE ÁRBITRO
refereesCtl.updatePhysicalState = async (req, res) => {
    const { id } = req.params;
    const { estado_fisico } = req.body;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const [resultado] = await sql.promise().query(
            "UPDATE referees SET estado_fisico = ?, fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [estado_fisico, formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Árbitro no encontrado.' });
        }
        
        res.status(200).json({ 
            message: 'Estado físico del árbitro actualizado correctamente.',
            estado_fisico: estado_fisico
        });
    } catch (error) {
        console.error('Error al actualizar estado físico:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. OBTENER ÁRBITROS POR RANGO DE EDAD
refereesCtl.getRefereesByAge = async (req, res) => {
    const { edad_min = 18, edad_max = 65 } = req.query;
    
    try {
        const query = `
            SELECT r.*, 
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.edad < 25 THEN 'Joven'
                     WHEN r.edad >= 25 AND r.edad < 40 THEN 'Adulto'
                     ELSE 'Veterano'
                   END as categoria_edad
            FROM referees r
            WHERE r.estado = 'activo' 
            AND r.edad >= ? AND r.edad <= ?
            ORDER BY r.edad ASC, r.nombre ASC
        `;
        
        const [arbitros] = await sql.promise().query(query, [parseInt(edad_min), parseInt(edad_max)]);
        
        res.status(200).json({
            message: `Árbitros entre ${edad_min} y ${edad_max} años obtenidos exitosamente`,
            arbitros: arbitros,
            rango: { edad_min, edad_max },
            total: arbitros.length
        });
    } catch (error) {
        console.error('Error al obtener árbitros por rango de edad:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. OBTENER ÁRBITROS CON EXPERIENCIA MÍNIMA
refereesCtl.getRefereesByExperience = async (req, res) => {
    const { experiencia_min = 0 } = req.query;
    
    try {
        const query = `
            SELECT r.*, 
                   CONCAT(r.nombre, ' ', r.apellido) as nombre_completo,
                   CASE 
                     WHEN r.experiencia < 2 THEN 'Novato'
                     WHEN r.experiencia >= 2 AND r.experiencia < 5 THEN 'Intermedio'
                     WHEN r.experiencia >= 5 AND r.experiencia < 10 THEN 'Experimentado'
                     ELSE 'Veterano'
                   END as nivel_experiencia
            FROM referees r
            WHERE r.estado = 'activo' 
            AND r.experiencia >= ?
            ORDER BY r.experiencia DESC, r.nombre ASC
        `;
        
        const [arbitros] = await sql.promise().query(query, [parseInt(experiencia_min)]);
        
        res.status(200).json({
            message: `Árbitros con experiencia mínima de ${experiencia_min} años obtenidos exitosamente`,
            arbitros: arbitros,
            experiencia_min: experiencia_min,
            total: arbitros.length
        });
    } catch (error) {
        console.error('Error al obtener árbitros por experiencia:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = refereesCtl;
