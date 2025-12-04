// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const detalleRolCtl = {};

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

// --- CRUD de Detalle Rol ---

// 1. CREAR NUEVO DETALLE DE ROL
detalleRolCtl.createDetalleRol = async (req, res) => {
    const { rolId, usuarioId, fecha_asignacion, fecha_vencimiento, observaciones } = req.body;
    try {
        // Validación: Verificar si la relación ya existe
        const [existingRelation] = await sql.promise().query(
            "SELECT * FROM detalleRols WHERE rolId = ? AND usuarioId = ? AND estado = 'activo'", 
            [rolId, usuarioId]
        );

        if (existingRelation.length > 0) {
            return res.status(400).json({ error: 'Ya existe un detalle de rol para este usuario y rol.' });
        }

        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        const nuevoDetalleSQL = {
            rolId: rolId,
            usuarioId: usuarioId,
            fecha_asignacion: fecha_asignacion || formattedNow,
            fecha_vencimiento: fecha_vencimiento,
            observaciones: observaciones,
            estado: 'activo',
            fecha_creacion: formattedNow
        };

        const detalleGuardadoSQL = await orm.detalleRol.create(nuevoDetalleSQL);
        
        res.status(201).json({ 
            message: 'Detalle de rol creado exitosamente',
            detalleRol: detalleGuardadoSQL
        });
    } catch (error) {
        console.error('Error al crear el detalle de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS DETALLES DE ROLES (Usando SQL Directo)
detalleRolCtl.getAllDetalleRoles = async (req, res) => {
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleRols WHERE estado = 'activo' ORDER BY fecha_asignacion DESC");
        
        res.status(200).json(detallesSQL);
    } catch (error) {
        console.error('Error al obtener todos los detalles de roles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER DETALLE DE ROL POR ID (Usando SQL Directo)
detalleRolCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleRols WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de rol no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        res.status(200).json(detalleSQL);
    } catch (error) {
        console.error('Error al obtener el detalle de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR DETALLES CON INFORMACIÓN DETALLADA (Usando SQL Directo)
detalleRolCtl.mostrarDetalleRoles = async (req, res) => {
    try {
        const query = `
            SELECT dr.*, 
                   r.nombre as rol_nombre,
                   r.descripcion as rol_descripcion,
                   u.nombre as usuario_nombre,
                   u.email as usuario_email,
                   CONCAT(u.nombre, ' - ', u.email) as usuario_info,
                   CASE 
                     WHEN dr.fecha_vencimiento IS NULL THEN 'Permanente'
                     WHEN dr.fecha_vencimiento > CURDATE() THEN 'Vigente'
                     ELSE 'Vencido'
                   END as estado_asignacion,
                   CASE 
                     WHEN dr.fecha_vencimiento IS NULL THEN NULL
                     ELSE DATEDIFF(dr.fecha_vencimiento, CURDATE())
                   END as dias_restantes,
                   DATEDIFF(CURDATE(), dr.fecha_asignacion) as dias_asignado
            FROM detalleRols dr
            LEFT JOIN rols r ON dr.rolId = r.id
            LEFT JOIN usuarios u ON dr.usuarioId = u.id
            WHERE dr.estado = 'activo'
            ORDER BY dr.fecha_asignacion DESC
        `;
        
        const [data] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Detalles de roles con información detallada obtenidos exitosamente',
            detalleRoles: data,
            total: data.length
        });
    } catch (error) {
        console.error('Error al mostrar los detalles de roles:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR DETALLE DE ROL (Usando SQL Directo)
detalleRolCtl.update = async (req, res) => {
    const { id } = req.params;
    const { rolId, usuarioId, fecha_asignacion, fecha_vencimiento, observaciones } = req.body;
    
    try {
        // Preparar datos para SQL (solo los que no son undefined)
        const campos = [];
        const valores = [];
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        if (rolId) {
            campos.push('rolId = ?');
            valores.push(rolId);
        }
        if (usuarioId) {
            campos.push('usuarioId = ?');
            valores.push(usuarioId);
        }
        if (fecha_asignacion) {
            campos.push('fecha_asignacion = ?');
            valores.push(fecha_asignacion);
        }
        if (fecha_vencimiento !== undefined) {
            campos.push('fecha_vencimiento = ?');
            valores.push(fecha_vencimiento);
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
            const consultaSQL = `UPDATE detalleRols SET ${campos.join(', ')} WHERE id = ? AND estado = 'activo'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Detalle de rol no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Detalle de rol actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el detalle de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR DETALLE DE ROL (Usando SQL Directo)
detalleRolCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE detalleRols SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado = 'activo'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Detalle de rol no encontrado.' });
        }
        
        res.status(200).json({ message: 'Detalle de rol eliminado correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el detalle de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR DETALLE CON ENCRIPTACIÓN
detalleRolCtl.mandarDetalleRol = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [detallesSQL] = await sql.promise().query("SELECT * FROM detalleRols WHERE id = ? AND estado = 'activo'", [id]);
        
        if (detallesSQL.length === 0) {
            return res.status(404).json({ error: 'Detalle de rol no encontrado.' });
        }
        
        const detalleSQL = detallesSQL[0];
        
        // Encriptar fechas sensibles
        const detalleEncriptado = {
            ...detalleSQL,
            fecha_creacion: detalleSQL.fecha_creacion ? encryptDates(detalleSQL.fecha_creacion) : null,
            fecha_modificacion: detalleSQL.fecha_modificacion ? encryptDates(detalleSQL.fecha_modificacion) : null,
            fecha_asignacion: detalleSQL.fecha_asignacion ? encryptDates(detalleSQL.fecha_asignacion) : null,
            fecha_vencimiento: detalleSQL.fecha_vencimiento ? encryptDates(detalleSQL.fecha_vencimiento) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(detalleEncriptado);
    } catch (error) {
        console.error('Error al mandar el detalle de rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ADICIONALES ---

// 8. OBTENER ROLES POR USUARIO
detalleRolCtl.getRolesByUsuario = async (req, res) => {
    const { usuarioId } = req.params;
    
    try {
        const query = `
            SELECT dr.*, 
                   r.nombre as rol_nombre,
                   r.descripcion as rol_descripcion,
                   CASE 
                     WHEN dr.fecha_vencimiento IS NULL THEN 'Permanente'
                     WHEN dr.fecha_vencimiento > CURDATE() THEN 'Vigente'
                     ELSE 'Vencido'
                   END as estado_asignacion
            FROM detalleRols dr
            LEFT JOIN rols r ON dr.rolId = r.id
            WHERE dr.usuarioId = ? AND dr.estado = 'activo'
            ORDER BY dr.fecha_asignacion DESC
        `;
        
        const [roles] = await sql.promise().query(query, [usuarioId]);
        
        res.status(200).json({
            message: 'Roles del usuario obtenidos exitosamente',
            roles: roles,
            total: roles.length
        });
    } catch (error) {
        console.error('Error al obtener los roles del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER USUARIOS POR ROL
detalleRolCtl.getUsuariosByRol = async (req, res) => {
    const { rolId } = req.params;
    
    try {
        const query = `
            SELECT dr.*, 
                   u.nombre as usuario_nombre,
                   u.email as usuario_email,
                   CASE 
                     WHEN dr.fecha_vencimiento IS NULL THEN 'Permanente'
                     WHEN dr.fecha_vencimiento > CURDATE() THEN 'Vigente'
                     ELSE 'Vencido'
                   END as estado_asignacion
            FROM detalleRols dr
            LEFT JOIN usuarios u ON dr.usuarioId = u.id
            WHERE dr.rolId = ? AND dr.estado = 'activo'
            ORDER BY dr.fecha_asignacion DESC
        `;
        
        const [usuarios] = await sql.promise().query(query, [rolId]);
        
        res.status(200).json({
            message: 'Usuarios con el rol obtenidos exitosamente',
            usuarios: usuarios,
            total: usuarios.length
        });
    } catch (error) {
        console.error('Error al obtener los usuarios por rol:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. OBTENER ASIGNACIONES VIGENTES
detalleRolCtl.getAsignacionesVigentes = async (req, res) => {
    try {
        const query = `
            SELECT dr.*, 
                   r.nombre as rol_nombre,
                   u.nombre as usuario_nombre,
                   u.email as usuario_email,
                   DATEDIFF(dr.fecha_vencimiento, CURDATE()) as dias_restantes
            FROM detalleRols dr
            LEFT JOIN rols r ON dr.rolId = r.id
            LEFT JOIN usuarios u ON dr.usuarioId = u.id
            WHERE dr.estado = 'activo' 
            AND (dr.fecha_vencimiento IS NULL OR dr.fecha_vencimiento > CURDATE())
            ORDER BY dr.fecha_asignacion DESC
        `;
        
        const [asignacionesVigentes] = await sql.promise().query(query);
        
        res.status(200).json({
            message: 'Asignaciones vigentes obtenidas exitosamente',
            asignaciones: asignacionesVigentes,
            total: asignacionesVigentes.length
        });
    } catch (error) {
        console.error('Error al obtener las asignaciones vigentes:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

module.exports = detalleRolCtl;
