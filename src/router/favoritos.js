const express = require('express');
const router = express.Router();
const { 
  getAllFavoritos, 
  mostrarFavoritos, 
  createFavoritos, 
  mandarFavoritos,
  getById,
  update,
  delete: deleteFavoritos
} = require('../controller/favoritosController');

// Rutas principales con nombres descriptivos
router.get('/lista', getAllFavoritos);
router.get('/mostrar', mostrarFavoritos);
router.get('/buscar/:id', getById);
router.get('/mandar/:id', mandarFavoritos);
router.post('/crear', createFavoritos);
router.put('/actualizar/:id', update);
router.delete('/eliminar/:id', deleteFavoritos);

// Rutas de compatibilidad (mantener funcionalidad existente)
router.get('/', getAllFavoritos);
router.get('/:id', getById);
router.post('/', createFavoritos);
router.put('/:id', update);
router.delete('/:id', deleteFavoritos);

module.exports = router;
