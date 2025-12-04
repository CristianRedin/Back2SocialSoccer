// controller/torneosController.js
// Importa los modelos de ambas bases de datos y las utilidades
const orm = require('../dataBase/dataBase.orm'); // Para Sequelize (SQL)
const sql = require('../dataBase/dataBase.sql'); // MySQL directo
const mongo = require('../dataBase/dataBase.mongo'); // Para Mongoose (MongoDB)
const TournamentBrackets = require('../model/nonRelational/TournamentBrackets'); // Modelo no relacional para brackets de torneos
const { encryptDates, cifrarDato, descifrarDato } = require('../lib/helpers');

const torneosCtl = {};

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

// --- CRUD de Torneos ---

// 1. CREAR NUEVO TORNEO
torneosCtl.createTorneo = async (req, res) => {
    const { nombre, fechaInicio, fechaFin, descripcion, formato = 'eliminacion_directa', premios } = req.body;
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // 1. Crear torneo en MySQL usando SQL directo
        const [resultado] = await sql.promise().query(
            "INSERT INTO torneos (nombre, fechaInicio, fechaFin, descripcion, estado, fecha_creacion) VALUES (?, ?, ?, ?, 'activo', ?)",
            [nombre, fechaInicio, fechaFin, descripcion, formattedNow]
        );

        const torneoId = resultado.insertId;

        // 2. Crear estructura de brackets en MongoDB automáticamente
        const tournamentBracket = new TournamentBrackets({
            torneoId: torneoId,
            formato,
            rondas: [],
            grupos: [],
            premios: premios || {
                campeon: '',
                subcampeon: '',
                tercerPuesto: ''
            },
            estado: true,
            fechaCreacion: new Date()
        });

        await tournamentBracket.save();

        // 3. Obtener el torneo completo para la respuesta
        const [torneoCreado] = await sql.promise().query("SELECT * FROM torneos WHERE id = ?", [torneoId]);

        res.status(201).json({
            message: 'Torneo y estructura de brackets creados exitosamente',
            torneo: torneoCreado[0],
            brackets: tournamentBracket
        });
    } catch (error) {
        console.error('Error al crear el torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 2. OBTENER TODOS LOS TORNEOS (Usando SQL Directo)
torneosCtl.getAllTorneos = async (req, res) => {
    try {
        const [torneosSQL] = await sql.promise().query("SELECT * FROM torneos WHERE estado = 'activo' ORDER BY fechaInicio DESC");
        
        res.status(200).json(torneosSQL);
    } catch (error) {
        console.error('Error al obtener todos los torneos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. OBTENER TORNEO POR ID (Usando SQL Directo)
torneosCtl.getById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [torneosSQL] = await sql.promise().query("SELECT * FROM torneos WHERE id = ? AND estado = 'activo'", [id]);
        
        if (torneosSQL.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado.' });
        }
        
        const torneoSQL = torneosSQL[0];
        
        res.status(200).json(torneoSQL);
    } catch (error) {
        console.error('Error al obtener el torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 4. MOSTRAR TORNEOS CON INFORMACIÓN DETALLADA (Usando SQL Directo + MongoDB)
torneosCtl.mostrarTorneos = async (req, res) => {
    try {
        const query = `
            SELECT t.*,
                   CASE 
                     WHEN t.estado = 'activo' AND t.fechaInicio > NOW() THEN 'Próximo 🕐'
                     WHEN t.estado = 'activo' AND t.fechaInicio <= NOW() AND t.fechaFin >= NOW() THEN 'En curso ⚡'
                     WHEN t.estado = 'activo' AND t.fechaFin < NOW() THEN 'Finalizado ✅'
                     WHEN t.estado = 'inactivo' THEN 'Inactivo ⏸️'
                     ELSE 'Desconocido ❓'
                   END as estado_detallado,
                   CASE 
                     WHEN t.fechaInicio > NOW() THEN DATEDIFF(t.fechaInicio, NOW())
                     WHEN t.fechaInicio <= NOW() AND t.fechaFin >= NOW() THEN 0
                     ELSE -DATEDIFF(NOW(), t.fechaFin)
                   END as dias_diferencia,
                   DATEDIFF(t.fechaFin, t.fechaInicio) as duracion_dias
            FROM torneos t
            WHERE t.estado != 'eliminado'
            ORDER BY t.fechaInicio DESC
        `;
        
        const [torneos] = await sql.promise().query(query);
        
        // Obtener información de brackets de algunos torneos como muestra
        let bracketsInfo = null;
        if (torneos.length > 0) {
            bracketsInfo = await TournamentBrackets.findOne({ 
                torneoId: torneos[0].id, 
                estado: true 
            });
        }
        
        res.status(200).json({
            message: 'Torneos con información detallada obtenidos exitosamente',
            torneos: torneos,
            bracketsInfo: bracketsInfo,
            total: torneos.length,
            estadisticas: {
                activos: torneos.filter(t => t.estado === 'activo').length,
                enCurso: torneos.filter(t => t.estado_detallado.includes('En curso')).length,
                finalizados: torneos.filter(t => t.estado_detallado.includes('Finalizado')).length
            }
        });
    } catch (error) {
        console.error('Error al mostrar los torneos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 5. ACTUALIZAR TORNEO (Usando SQL Directo)
torneosCtl.update = async (req, res) => {
    const { id } = req.params;
    const { nombre, fechaInicio, fechaFin, descripcion, estado } = req.body;
    
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
        if (fechaInicio) {
            campos.push('fechaInicio = ?');
            valores.push(fechaInicio);
        }
        if (fechaFin) {
            campos.push('fechaFin = ?');
            valores.push(fechaFin);
        }
        if (descripcion) {
            campos.push('descripcion = ?');
            valores.push(descripcion);
        }
        if (estado) {
            campos.push('estado = ?');
            valores.push(estado);
        }
        
        // Siempre actualizar fecha_modificacion
        campos.push('fecha_modificacion = ?');
        valores.push(formattedNow);

        if (campos.length > 0) {
            valores.push(id);
            const consultaSQL = `UPDATE torneos SET ${campos.join(', ')} WHERE id = ? AND estado != 'eliminado'`;
            const [resultado] = await sql.promise().query(consultaSQL, valores);
            
            if (resultado.affectedRows === 0) {
                return res.status(404).json({ error: 'Torneo no encontrado.' });
            }
        }
        
        res.status(200).json({ message: 'Torneo actualizado correctamente.' });
    } catch (error) {
        console.error('Error al actualizar el torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 6. ELIMINAR TORNEO (Usando SQL Directo)
torneosCtl.delete = async (req, res) => {
    const { id } = req.params;
    
    try {
        const now = new Date();
        const formattedNow = formatLocalDateTime(now);

        // Obtener información del torneo antes de eliminarlo
        const [torneoInfo] = await sql.promise().query("SELECT * FROM torneos WHERE id = ? AND estado != 'eliminado'", [id]);
        
        if (torneoInfo.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado.' });
        }

        // Eliminar estructura de brackets relacionada (eliminación lógica en MongoDB)
        await TournamentBrackets.updateMany(
            { torneoId: parseInt(id) },
            { estado: false }
        );

        // SQL directo para actualizar estado a 'eliminado'
        const [resultado] = await sql.promise().query(
            "UPDATE torneos SET estado = 'eliminado', fecha_modificacion = ? WHERE id = ? AND estado != 'eliminado'", 
            [formattedNow, id]
        );
        
        if (resultado.affectedRows === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado.' });
        }
        
        res.status(200).json({ message: 'Torneo y estructura de brackets eliminados correctamente.' });
    } catch (error) {
        console.error('Error al eliminar el torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 7. MANDAR TORNEO CON ENCRIPTACIÓN
torneosCtl.mandarTorneo = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [torneosSQL] = await sql.promise().query("SELECT * FROM torneos WHERE id = ? AND estado != 'eliminado'", [id]);
        
        if (torneosSQL.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado.' });
        }
        
        const torneoSQL = torneosSQL[0];
        
        // Encriptar fechas sensibles
        const torneoEncriptado = {
            ...torneoSQL,
            fecha_creacion: torneoSQL.fecha_creacion ? encryptDates(torneoSQL.fecha_creacion) : null,
            fecha_modificacion: torneoSQL.fecha_modificacion ? encryptDates(torneoSQL.fecha_modificacion) : null,
            fechaConsulta: encryptDates(new Date())
        };
        
        res.status(200).json(torneoEncriptado);
    } catch (error) {
        console.error('Error al mandar el torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// --- FUNCIONES ESPECÍFICAS PARA TOURNAMENT BRACKETS (MongoDB) ---

// 8. OBTENER BRACKETS DE UN TORNEO
torneosCtl.getTournamentBrackets = async (req, res) => {
    const { torneoId } = req.params;
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        res.status(200).json({
            message: 'Brackets obtenidos exitosamente',
            torneoId: parseInt(torneoId),
            brackets: brackets
        });
    } catch (error) {
        console.error('Error al obtener brackets:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 9. OBTENER TORNEO COMPLETO CON BRACKETS
torneosCtl.getTournamentWithBrackets = async (req, res) => {
    const { torneoId } = req.params;
    
    try {
        // Obtener torneo de MySQL
        const [torneosSQL] = await sql.promise().query("SELECT * FROM torneos WHERE id = ? AND estado != 'eliminado'", [torneoId]);
        
        if (torneosSQL.length === 0) {
            return res.status(404).json({ error: 'Torneo no encontrado.' });
        }
        
        const torneo = torneosSQL[0];
        
        // Obtener brackets de MongoDB
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        res.status(200).json({
            message: 'Torneo con brackets obtenido exitosamente',
            torneo: torneo,
            brackets: brackets,
            totalRondas: brackets ? brackets.rondas.length : 0,
            totalGrupos: brackets ? brackets.grupos.length : 0,
            formato: brackets ? brackets.formato : 'eliminacion_directa'
        });
    } catch (error) {
        console.error('Error al obtener datos completos del torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 10. CONFIGURAR ESTRUCTURA DE TORNEO
torneosCtl.setupTournament = async (req, res) => {
    const { torneoId } = req.params;
    const { formato, equipos, gruposConfig } = req.body;
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        brackets.formato = formato;
        
        if (formato === 'grupos' && gruposConfig) {
            brackets.grupos = gruposConfig.map(grupo => ({
                nombre: grupo.nombre,
                equipos: grupo.equipos,
                tabla: grupo.equipos.map(equipoId => ({
                    equipoId,
                    puntos: 0,
                    partidosJugados: 0,
                    victorias: 0,
                    empates: 0,
                    derrotas: 0,
                    golesFavor: 0,
                    golesContra: 0,
                    diferencia: 0
                }))
            }));
        }
        
        await brackets.save();
        
        res.status(200).json({ 
            message: 'Estructura del torneo configurada exitosamente', 
            brackets: brackets 
        });
    } catch (error) {
        console.error('Error al configurar torneo:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 11. AGREGAR RONDA AL TORNEO
torneosCtl.addRound = async (req, res) => {
    const { torneoId } = req.params;
    const { nombre, partidos } = req.body;
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        brackets.rondas.push({
            nombre,
            fechaCreacion: new Date(),
            partidos: partidos.map(partido => ({
                equipoLocal: partido.equipoLocal,
                equipoVisitante: partido.equipoVisitante,
                resultado: { golesLocal: 0, golesVisitante: 0 },
                fecha: partido.fecha || null,
                ganador: null,
                estado: 'programado'
            }))
        });
        
        await brackets.save();
        
        res.status(201).json({ 
            message: 'Ronda agregada exitosamente', 
            brackets: brackets,
            nuevaRonda: brackets.rondas[brackets.rondas.length - 1]
        });
    } catch (error) {
        console.error('Error al agregar ronda:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 12. ACTUALIZAR RESULTADO DE PARTIDO
torneosCtl.updateMatchResult = async (req, res) => {
    const { torneoId, rondaIndex, partidoIndex } = req.params;
    const { golesLocal, golesVisitante, fecha } = req.body;
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        if (rondaIndex >= brackets.rondas.length) {
            return res.status(404).json({ error: 'Ronda no encontrada.' });
        }
        
        const ronda = brackets.rondas[rondaIndex];
        
        if (partidoIndex >= ronda.partidos.length) {
            return res.status(404).json({ error: 'Partido no encontrado.' });
        }
        
        const partido = ronda.partidos[partidoIndex];
        
        partido.resultado.golesLocal = golesLocal;
        partido.resultado.golesVisitante = golesVisitante;
        partido.ganador = golesLocal > golesVisitante ? partido.equipoLocal : 
                         golesVisitante > golesLocal ? partido.equipoVisitante : 'empate';
        partido.estado = 'finalizado';
        partido.fechaJugado = fecha || new Date();
        
        await brackets.save();
        
        res.status(200).json({ 
            message: 'Resultado actualizado exitosamente', 
            partido: partido,
            resultado: `${golesLocal} - ${golesVisitante}`,
            ganador: partido.ganador
        });
    } catch (error) {
        console.error('Error al actualizar resultado:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 13. ACTUALIZAR TABLA DE GRUPO
torneosCtl.updateGroupTable = async (req, res) => {
    const { torneoId, grupoIndex } = req.params;
    const { equipoId, puntos, victorias, empates, derrotas, golesFavor, golesContra } = req.body;
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        if (grupoIndex >= brackets.grupos.length) {
            return res.status(404).json({ error: 'Grupo no encontrado.' });
        }
        
        const grupo = brackets.grupos[grupoIndex];
        const equipoIndex = grupo.tabla.findIndex(eq => eq.equipoId === equipoId);
        
        if (equipoIndex === -1) {
            return res.status(404).json({ error: 'Equipo no encontrado en la tabla.' });
        }
        
        grupo.tabla[equipoIndex].puntos += puntos || 0;
        grupo.tabla[equipoIndex].partidosJugados += 1;
        grupo.tabla[equipoIndex].victorias += victorias || 0;
        grupo.tabla[equipoIndex].empates += empates || 0;
        grupo.tabla[equipoIndex].derrotas += derrotas || 0;
        grupo.tabla[equipoIndex].golesFavor += golesFavor || 0;
        grupo.tabla[equipoIndex].golesContra += golesContra || 0;
        grupo.tabla[equipoIndex].diferencia = grupo.tabla[equipoIndex].golesFavor - grupo.tabla[equipoIndex].golesContra;
        
        // Ordenar tabla por puntos y diferencia de goles
        grupo.tabla.sort((a, b) => {
            if (b.puntos !== a.puntos) return b.puntos - a.puntos;
            return b.diferencia - a.diferencia;
        });
        
        await brackets.save();
        
        res.status(200).json({ 
            message: 'Tabla actualizada exitosamente', 
            grupo: grupo,
            equipoActualizado: grupo.tabla[grupo.tabla.findIndex(eq => eq.equipoId === equipoId)]
        });
    } catch (error) {
        console.error('Error al actualizar tabla:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 14. ESTABLECER PREMIOS DEL TORNEO
torneosCtl.setPrizes = async (req, res) => {
    const { torneoId } = req.params;
    const { campeon, subcampeon, tercerPuesto, cuartoPuesto } = req.body;
    
    try {
        const premiosData = { campeon, subcampeon, tercerPuesto };
        if (cuartoPuesto) premiosData.cuartoPuesto = cuartoPuesto;
        
        const updatedBrackets = await TournamentBrackets.findOneAndUpdate(
            { torneoId: parseInt(torneoId), estado: true },
            { premios: premiosData },
            { new: true }
        );
        
        if (!updatedBrackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        res.status(200).json({
            message: 'Premios establecidos exitosamente',
            premios: updatedBrackets.premios
        });
    } catch (error) {
        console.error('Error al establecer premios:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 15. GENERAR BRACKETS AUTOMÁTICOS PARA ELIMINACIÓN DIRECTA
torneosCtl.generateEliminationBrackets = async (req, res) => {
    const { torneoId } = req.params;
    const { equipos } = req.body; // Array de IDs de equipos
    
    try {
        const brackets = await TournamentBrackets.findOne({ 
            torneoId: parseInt(torneoId), 
            estado: true 
        });
        
        if (!brackets) {
            return res.status(404).json({ error: 'Estructura de brackets no encontrada.' });
        }
        
        if (!equipos || equipos.length < 2) {
            return res.status(400).json({ error: 'Se necesitan al menos 2 equipos para generar brackets.' });
        }
        
        // Generar rondas automáticamente
        const rondas = [];
        let equiposActuales = [...equipos];
        
        while (equiposActuales.length > 1) {
            const nombreRonda = getRoundName(equiposActuales.length);
            const partidos = [];
            
            for (let i = 0; i < equiposActuales.length; i += 2) {
                if (i + 1 < equiposActuales.length) {
                    partidos.push({
                        equipoLocal: equiposActuales[i],
                        equipoVisitante: equiposActuales[i + 1],
                        resultado: { golesLocal: 0, golesVisitante: 0 },
                        fecha: null,
                        ganador: null,
                        estado: 'programado'
                    });
                }
            }
            
            rondas.push({ 
                nombre: nombreRonda, 
                partidos,
                fechaCreacion: new Date()
            });
            
            equiposActuales = new Array(Math.ceil(equiposActuales.length / 2));
        }
        
        brackets.rondas = rondas;
        brackets.formato = 'eliminacion_directa';
        await brackets.save();
        
        res.status(200).json({ 
            message: 'Brackets de eliminación generados exitosamente', 
            brackets: brackets,
            totalRondas: rondas.length,
            totalEquipos: equipos.length
        });
    } catch (error) {
        console.error('Error al generar brackets:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 16. BUSCAR TORNEOS
torneosCtl.searchTorneos = async (req, res) => {
    const { q, estado, fechaInicio, fechaFin } = req.query;
    
    try {
        let query = `
            SELECT t.*,
                   CASE 
                     WHEN t.estado = 'activo' AND t.fechaInicio > NOW() THEN 'Próximo'
                     WHEN t.estado = 'activo' AND t.fechaInicio <= NOW() AND t.fechaFin >= NOW() THEN 'En curso'
                     WHEN t.estado = 'activo' AND t.fechaFin < NOW() THEN 'Finalizado'
                     ELSE 'Inactivo'
                   END as estado_detallado
            FROM torneos t
            WHERE t.estado != 'eliminado'
        `;
        
        const params = [];
        
        if (q) {
            query += ` AND (t.nombre LIKE ? OR t.descripcion LIKE ?)`;
            params.push(`%${q}%`, `%${q}%`);
        }
        
        if (estado) {
            query += ` AND t.estado = ?`;
            params.push(estado);
        }
        
        if (fechaInicio) {
            query += ` AND t.fechaInicio >= ?`;
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            query += ` AND t.fechaFin <= ?`;
            params.push(fechaFin);
        }
        
        query += ` ORDER BY t.fechaInicio DESC`;
        
        const [resultados] = await sql.promise().query(query, params);
        
        res.status(200).json({
            message: 'Búsqueda de torneos realizada exitosamente',
            resultados: resultados,
            filtros: { q, estado, fechaInicio, fechaFin },
            total: resultados.length
        });
    } catch (error) {
        console.error('Error al buscar torneos:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 17. OBTENER ESTADÍSTICAS GENERALES DE TORNEOS
torneosCtl.getGeneralStats = async (req, res) => {
    try {
        const [estadisticasSQL] = await sql.promise().query(`
            SELECT 
                COUNT(CASE WHEN t.estado = 'activo' THEN 1 END) as torneos_activos,
                COUNT(CASE WHEN t.estado = 'inactivo' THEN 1 END) as torneos_inactivos,
                COUNT(CASE WHEN t.estado = 'eliminado' THEN 1 END) as torneos_eliminados,
                COUNT(CASE WHEN t.estado = 'activo' AND t.fechaInicio > NOW() THEN 1 END) as torneos_proximos,
                COUNT(CASE WHEN t.estado = 'activo' AND t.fechaInicio <= NOW() AND t.fechaFin >= NOW() THEN 1 END) as torneos_en_curso,
                COUNT(CASE WHEN t.estado = 'activo' AND t.fechaFin < NOW() THEN 1 END) as torneos_finalizados,
                COUNT(t.id) as total_torneos,
                AVG(DATEDIFF(t.fechaFin, t.fechaInicio)) as duracion_promedio_dias
            FROM torneos t
            WHERE t.estado != 'eliminado'
        `);
        
        const estadisticas = estadisticasSQL[0];
        
        res.status(200).json({
            message: 'Estadísticas generales de torneos obtenidas exitosamente',
            estadisticas: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// Función auxiliar para generar nombres de rondas
function getRoundName(numEquipos) {
    if (numEquipos === 2) return 'Final';
    if (numEquipos === 4) return 'Semifinal';
    if (numEquipos === 8) return 'Cuartos de Final';
    if (numEquipos === 16) return 'Octavos de Final';
    if (numEquipos === 32) return 'Dieciseisavos de Final';
    return `Ronda de ${numEquipos}`;
}

module.exports = torneosCtl;
