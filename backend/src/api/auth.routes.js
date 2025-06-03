// backend/src/api/auth.routes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Rota para login do responsável pelo restaurante
router.post('/login', authController.loginRestaurante);

// TODO: Futuramente, podemos ter uma rota para /refresh-token ou /logout se necessário

module.exports = router;