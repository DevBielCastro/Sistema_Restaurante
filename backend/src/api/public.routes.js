// backend/src/api/public.routes.js
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');

// Rota para obter todos os dados públicos de um cardápio de uma vez
// Ex: GET /api/v1/public/cardapio/cantina_do_vale_feliz
router.get('/cardapio/:identificador_url', publicController.obterCardapioPublico);

module.exports = router;