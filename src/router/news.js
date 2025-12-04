// Router para news - Manejo de rutas de noticias del sistema
const express = require('express');
const router = express.Router();
const { 
  getAllNews, 
  mostrarNews, 
  createNews, 
  mandarNews, 
  getById, 
  update, 
  delete: deleteNews,
  // Funciones específicas para Favoritos (MongoDB)
  getNewsFavoritos,
  getNewsWithFavoritos,
  addToFavorites,
  removeFromFavorites,
  registerFavoriteView,
  updateFavorite,
  getUserFavorites,
  getFavoriteStats
} = require('../controller/newsController');

// Rutas principales de noticias (SQL)
router.get('/lista', getAllNews);           // GET /news/lista - Obtener todas las noticias (ORM)
router.get('/mostrar', mostrarNews);        // GET /news/mostrar - Mostrar noticias (SQL directo)
router.get('/buscar/:id', getById);         // GET /news/buscar/:id - Buscar noticia por ID
router.get('/mandar/:id', mandarNews);      // GET /news/mandar/:id - Mandar noticia específica
router.post('/crear', createNews);          // POST /news/crear - Crear nueva noticia + registro de stats
router.put('/actualizar/:id', update);      // PUT /news/actualizar/:id - Actualizar noticia
router.delete('/eliminar/:id', deleteNews); // DELETE /news/eliminar/:id - Eliminar noticia + favoritos

// Rutas específicas para Favoritos (MongoDB)
router.get('/favoritos/:newsId', getNewsFavoritos);                    // GET /news/favoritos/:newsId - Favoritos de una noticia
router.get('/completo/:newsId', getNewsWithFavoritos);                 // GET /news/completo/:newsId - Noticia + favoritos + stats
router.post('/favorito/:newsId', addToFavorites);                      // POST /news/favorito/:newsId - Agregar a favoritos
router.delete('/favorito/:newsId/:userId', removeFromFavorites);       // DELETE /news/favorito/:newsId/:userId - Remover de favoritos
router.patch('/favorito/:newsId/:userId/vista', registerFavoriteView); // PATCH /news/favorito/:newsId/:userId/vista - Registrar vista
router.put('/favorito/:newsId/:userId', updateFavorite);               // PUT /news/favorito/:newsId/:userId - Actualizar favorito
router.get('/usuario/:userId/favoritos', getUserFavorites);            // GET /news/usuario/:userId/favoritos - Favoritos del usuario
router.get('/estadisticas/favoritos', getFavoriteStats);               // GET /news/estadisticas/favoritos - Stats de favoritos

module.exports = router;
