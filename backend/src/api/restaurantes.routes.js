// backend/src/api/restaurantes.routes.js
const express = require('express');
const router = express.Router();
const restauranteController = require('../controllers/restaurante.controller');
const categoriaController = require('../controllers/categoria.controller');
const produtoController = require('../controllers/produto.controller'); // <<<--- ADICIONE ESTA LINHA
const { protegerRota } = require('../middlewares/auth.middleware');

// Rota para criação de restaurantes
router.post('/', restauranteController.criarRestaurante);

// --- Rotas de Categorias para um Restaurante Específico ---
router.post('/:restauranteId/categorias', protegerRota, categoriaController.criarCategoria);
router.get('/:restauranteId/categorias', protegerRota, categoriaController.listarCategorias);
router.put('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.atualizarCategoria);
router.delete('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.deletarCategoria);

// --- Rotas de Produtos para um Restaurante Específico ---
// POST para adicionar um novo produto ao restauranteId
router.post('/:restauranteId/produtos', protegerRota, produtoController.adicionarProduto); // <<<--- ADICIONE ESTA LINHA

// TODO: Outras rotas para produtos (listar, obter por id, atualizar, deletar)

// TODO: Minhas próximas rotas a implementar para gestão de restaurantes:
// router.get('/', restauranteController.listarRestaurantes);
// router.get('/:id', restauranteController.obterRestaurantePorId);

module.exports = router;