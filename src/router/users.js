const express = require("express");
const router = express.Router();
const usersController = require('../controller/usersController');

// Rutas principales CRUD
router.post('/create', usersController.createUser);
router.get('/all', usersController.getAllUsers);
router.get('/mostrar', usersController.mostrarUsers);
router.get('/estadisticas', usersController.getGeneralStats);
router.get('/search', usersController.searchUsers);
router.get('/encrypted/:id', usersController.mandarUser);
router.get('/:id', usersController.getById);
router.put('/update/:id', usersController.update);
router.delete('/delete/:id', usersController.delete);

// Rutas específicas para preferencias de usuario
router.get('/preferences/:userId', usersController.getUserPreferences);
router.get('/complete/:userId', usersController.getUserComplete);
router.put('/preferences/:userId', usersController.updateUserPreferences);

// Rutas específicas para notificaciones
router.get('/notifications/:userId', usersController.getUserNotifications);
router.post('/notifications/:userId', usersController.createNotification);
router.put('/notifications/:userId/:notificationId/read', usersController.markNotificationAsRead);
router.put('/notifications/:userId/read-all', usersController.markAllNotificationsAsRead);
router.get('/notifications/:userId/stats', usersController.getNotificationStats);
router.delete('/notifications/:userId/clean', usersController.cleanOldNotifications);

module.exports = router;
