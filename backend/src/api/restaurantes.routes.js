// backend/src/api/restaurantes.routes.js
const express = require('express');
const router = express.Router();
const restauranteController = require('../controllers/restaurante.controller');
const categoriaController = require('../controllers/categoria.controller');
const produtoController = require('../controllers/produto.controller');
const promocaoController = require('../controllers/promocao.controller');
const { protegerRota } = require('../middlewares/auth.middleware');

// Rota para criação de restaurantes
router.post('/', restauranteController.criarRestaurante);

// --- Rotas de Categorias para um Restaurante Específico ---
// ... (rotas de categorias) ...
router.post('/:restauranteId/categorias', protegerRota, categoriaController.criarCategoria);
router.get('/:restauranteId/categorias', protegerRota, categoriaController.listarCategorias);
router.put('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.atualizarCategoria);
router.delete('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.deletarCategoria);

// --- Rotas de Produtos para um Restaurante Específico ---
// ... (rotas de produtos) ...
router.post('/:restauranteId/produtos', protegerRota, produtoController.adicionarProduto);
router.get('/:restauranteId/produtos', protegerRota, produtoController.listarProdutos);
router.get('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.obterProdutoPorId);
router.put('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.atualizarProduto);
router.delete('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.deletarProduto);

// --- Rotas de Promoções para um Restaurante Específico ---
router.post('/:restauranteId/promocoes', protegerRota, promocaoController.criarPromocao);
router.get('/:restauranteId/promocoes', protegerRota, promocaoController.listarPromocoes);

// GET para obter uma promoção específica do restauranteId pela promocaoId // <<<--- NOVA ROTA
router.get('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.obterPromocaoPorId);

// TODO: Outras rotas para promoções (atualizar, deletar, adicionar/remover produtos da promoção)
// router.put('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.atualizarPromocao);
// router.delete('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.deletarPromocao);

module.exports = router;