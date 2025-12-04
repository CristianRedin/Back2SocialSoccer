// Router para roles - Manejo de rutas de roles del sistema
const express = require('express');
const router = express.Router();
const { 
  getAllRoles, 
  mostrarRoles, 
  createRole, 
  mandarRole, 
  getById, 
  update, 
  delete: deleteRole,
  getAvailableRoles, // ✅ NUEVA función
  // Funciones específicas para Logs Errores (MongoDB)
  getRoleLogs,
  getRoleWithLogs,
  logError,
  resolveError,
  getErrorStats,
  cleanOldLogs
} = require('../controller/rolesController');

// Rutas principales de roles (SQL)
router.get('/lista', getAllRoles);           // GET /roles/lista - Obtener todos los roles (ORM)
router.get('/disponibles', getAvailableRoles); // ✅ NUEVA: GET /roles/disponibles - Roles para registro
router.get('/mostrar', mostrarRoles);        // GET /roles/mostrar - Mostrar roles (SQL directo)
router.get('/buscar/:id', getById);          // GET /roles/buscar/:id - Buscar rol por ID
router.get('/mandar/:id', mandarRole);       // GET /roles/mandar/:id - Mandar rol específico
router.post('/crear', createRole);           // POST /roles/crear - Crear nuevo rol + log inicial
router.put('/actualizar/:id', update);       // PUT /roles/actualizar/:id - Actualizar rol + log
router.delete('/eliminar/:id', deleteRole);  // DELETE /roles/eliminar/:id - Eliminar rol + logs

// Rutas específicas para Logs Errores (MongoDB)
router.get('/logs/:rolId', getRoleLogs);                    // GET /roles/logs/:rolId - Logs de un rol
router.get('/completo/:rolId', getRoleWithLogs);            // GET /roles/completo/:rolId - Rol + logs
router.post('/log-error/:rolId', logError);                 // POST /roles/log-error/:rolId - Registrar error
router.put('/resolver/:rolId/:logId', resolveError);        // PUT /roles/resolver/:rolId/:logId - Resolver error
router.get('/estadisticas/:rolId', getErrorStats);          // GET /roles/estadisticas/:rolId - Stats de errores
router.delete('/limpiar-logs/:rolId', cleanOldLogs);        // DELETE /roles/limpiar-logs/:rolId - Limpiar logs

module.exports = router;
