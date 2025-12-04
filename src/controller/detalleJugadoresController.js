// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const detalleJugadoresCtl = {};

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

// --- CRUD de Detalle Jugadores ---

// 1. CREAR NUEVO DETALLE DE JUGADOR
detalleJugadoresCtl.createDetalleJugador = async (req, res) => {
    const { playerId, nacionalidad, fecha_nacimiento, altura, peso, pie_dominante, observaciones } = req.body;
    try {
        // Validación: Verificar si ya existe detalle para este jugador
        const [existingDetail] = await sql.promise().query(
            "SELECT * FROM detalleJugadores WHERE playerId = ? AND estado = 'activo'", 
            [playerId]
        );

        if (existingDetail.length > 0) {
            return res.status(400).json({ error: 'Ya existe un detalle para este jugador.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoDetalleSQL = {
            playerId: playerId,
            nacionalidad: nacionalidad,
            fecha_nacimiento: fecha_nacimiento,
            altura: altura,
            peso: peso,
            pie_dominante: pie_dominante,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const detalleGuardadoSQL = await orm.detalleJugadores.create(nuevoDetalleSQL);
        
        res.status(201).json({ 
            message: 'Detalle de jugador creado exitosamente',
            detalleJugador: detalleGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el detalle de jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS DETALLES DE JUGADORES (Usando SQL Directo)
detalleJugadoresCtl.getAllDetalleJugadores = async (req, res) => {
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleJugadores WHERE estado = 'activo' ORDER BY nacionalidad ASC");
        
        res.status(200).json(detallesSQL);
    } catch (error) {
        console.error('Error al obtener todos los detalles de jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLE DE JUGADOR POR ID (Usando SQL Directo)
detalleJugadoresCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleJugadores WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de jugador no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        res.status(200).json(detalleSQL);
    } catch (error) {
        console.error('Error al obtener el detalle de jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DETALLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
detalleJugadoresCtl.mostrarDetalleJugadores = async (req, res) => {
    try {
        const query = `
            SELECT dj.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   d.nombre as division_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo,
                   TIMESTAMPDIFF(YEAR, dj.fecha_nacimiento, CURDATE()) as edad_actual,
                   CASE 
                     WHEN dj.altura > 1.80 THEN 'Alto'
                     WHEN dj.altura < 1.70 THEN 'Bajo'
                     ELSE 'Promedio'
                   END as categoria_altura,
                   CASE 
                     WHEN dj.peso > 80 THEN 'Pesado'
                     WHEN dj.peso < 65 THEN 'Ligero'
                     ELSE 'Normal'
                   END as categoria_peso,
                   ROUND(dj.peso / POWER(dj.altura, 2), 2) as imc
            FROM detalleJugadores dj
            LEFT JOIN players p ON dj.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            LEFT JOIN divisions d ON t.divisionId = d.id
            WHERE dj.estado = 'activo'
            ORDER BY dj.nacionalidad, p.apellido, p.nombre
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Detalles de jugadores con información detallada obtenidos exitosamente',
            detalleJugadores: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los detalles de jugadores:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DETALLE DE JUGADOR (Usando SQL Directo)
detalleJugadoresCtl.update = async (req, res) => {
    const { id } = req.params;
    const { playerId, nacionalidad, fecha_nacimiento, altura, peso, pie_dominante, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (playerId) {
            campos.push('playerId = ?');
            valores.push(playerId);
        }
        if (nacionalidad) {
            campos.push('nacionalidad = ?');
            valores.push(nacionalidad);
        }
        if (fecha_nacimiento) {
            campos.push('fecha_nacimiento = ?');
            valores.push(fecha_nacimiento);
        }
        if (altura !== undefined) {
            campos.push('altura = ?');
            valores.push(altura);
        }
        if (peso !== undefined) {
            campos.push('peso = ?');
            valores.push(peso);
        }
        if (pie_dominante) {
            campos.push('pie_dominante = ?');
            valores.push(pie_dominante);
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
            const consultaSQL = `UPDATE detalleJugadores SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Detalle de jugador no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Detalle de jugador actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el detalle de jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DETALLE DE JUGADOR (Usando SQL Directo)
detalleJugadoresCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE detalleJugadores SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Detalle de jugador no encontrado.' });
        }
        
        res.status(200).json({ message: 'Detalle de jugador eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el detalle de jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DETALLE CON ENCRIPTACIÓN
detalleJugadoresCtl.mandarDetalleJugador = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleJugadores WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de jugador no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        // Encriptar fechas sensibles
        const detalleEncriptado = {
            ...detalleSQL,
            fecha_creacion: detalleSQL.fecha_creacion ? encryptDates(detalleSQL.fecha_creacion) : null,
            fecha_modificacion: detalleSQL.fecha_modificacion ? encryptDates(detalleSQL.fecha_modificacion) : null,
            fecha_nacimiento: detalleSQL.fecha_nacimiento ? encryptDates(detalleSQL.fecha_nacimiento) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(detalleEncriptado);
    } catch (error) {
        console.error('Error al mandar el detalle de jugador:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER JUGADORES POR NACIONALIDAD
detalleJugadoresCtl.getJugadoresByNacionalidad = async (req, res) => {
    const { nacionalidad } = req.params;
    
    try {
        const query = `
            SELECT dj.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleJugadores dj
            LEFT JOIN players p ON dj.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE dj.nacionalidad = ? AND dj.estado = 'activo'
            ORDER BY p.apellido, p.nombre
        `;
        
        const [jugadores] = await sql.promise().query(query, [nacionalidad]);
        
        res.status(200).json({
            message: `Jugadores de nacionalidad ${nacionalidad} obtenidos exitosamente`,
            jugadores: jugadores,
            total: jugadores.length
        });
    } catch (error) {
        console.error('Error al obtener los jugadores por nacionalidad:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER ESTADÍSTICAS FÍSICAS
detalleJugadoresCtl.getEstadisticasFisicas = async (req, res) => {
    try {
        const query = `
            SELECT 
                AVG(dj.altura) as altura_promedio,
                AVG(dj.peso) as peso_promedio,
                MIN(dj.altura) as altura_minima,
                MAX(dj.altura) as altura_maxima,
                MIN(dj.peso) as peso_minimo,
                MAX(dj.peso) as peso_maximo,
                COUNT(*) as total_jugadores,
                COUNT(CASE WHEN dj.pie_dominante = 'Derecho' THEN 1 END) as pie_derecho,
                COUNT(CASE WHEN dj.pie_dominante = 'Izquierdo' THEN 1 END) as pie_izquierdo,
                COUNT(CASE WHEN dj.pie_dominante = 'Ambidiestro' THEN 1 END) as ambidiestros
            FROM detalleJugadores dj
            WHERE dj.estado = 'activo'
        `;
        
        const [estadisticas] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Estadísticas físicas obtenidas exitosamente',
            estadisticas: estadisticas[0]
        });
    } catch (error) {
        console.error('Error al obtener las estadísticas físicas:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER JUGADORES POR RANGO DE EDAD
detalleJugadoresCtl.getJugadoresByRangoEdad = async (req, res) => {
    const { edadMin, edadMax } = req.params;
    
    try {
        const query = `
            SELECT dj.*, 
                   p.nombre as jugador_nombre,
                   p.apellido as jugador_apellido,
                   p.posicion as jugador_posicion,
                   t.nombre as equipo_nombre,
                   TIMESTAMPDIFF(YEAR, dj.fecha_nacimiento, CURDATE()) as edad_actual,
                   CONCAT(p.nombre, ' ', p.apellido) as nombre_completo
            FROM detalleJugadores dj
            LEFT JOIN players p ON dj.playerId = p.id
            LEFT JOIN teams t ON p.teamId = t.id
            WHERE dj.estado = 'activo'
            HAVING edad_actual BETWEEN ? AND ?
            ORDER BY edad_actual ASC, p.apellido, p.nombre
        `;
        
        const [jugadores] = await sql.promise().query(query, [edadMin, edadMax]);
        
        res.status(200).json({
            message: `Jugadores entre ${edadMin} y ${edadMax} años obtenidos exitosamente`,
            jugadores: jugadores,
            total: jugadores.length
        });
    } catch (error) {
        console.error('Error al obtener los jugadores por rango de edad:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = detalleJugadoresCtl;
