const express = require('express');
const router = express.Router();
const { 
  getAllComentarios, createComentario,getById, update, delete: deleteComentario 
} = require('../controller/comentariosController');

// Rutas básicas de comentarios
router.get('/lista', getAllComentarios);           // Lista básica con ORM
router.get('/buscar/:id', getById);                // Buscar por ID
router.post('/crear', createComentario);           // Crear nuevo
router.put('/actualizar/:id', update);             // Actualizar existente
router.delete('/eliminar/:id', deleteComentario); // Eliminar (lógico)

module.exports = router;
