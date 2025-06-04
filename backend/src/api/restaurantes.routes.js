// backend/src/api/restaurantes.routes.js
const express = require('express');
const router = express.Router();
const restauranteController = require('../controllers/restaurante.controller');
const categoriaController = require('../controllers/categoria.controller');
const produtoController = require('../controllers/produto.controller');
const promocaoController = require('../controllers/promocao.controller');
const { protegerRota } = require('../middlewares/auth.middleware');

// Rota para criação de restaurantes (geralmente pública ou admin da plataforma)
router.post('/', restauranteController.criarRestaurante);

// --- Rotas de Categorias para um Restaurante Específico (protegidas) ---
router.post('/:restauranteId/categorias', protegerRota, categoriaController.criarCategoria);
router.get('/:restauranteId/categorias', protegerRota, categoriaController.listarCategorias);
router.put('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.atualizarCategoria);
router.delete('/:restauranteId/categorias/:categoriaId', protegerRota, categoriaController.deletarCategoria);

// --- Rotas de Produtos para um Restaurante Específico (protegidas) ---
router.post('/:restauranteId/produtos', protegerRota, produtoController.adicionarProduto);
router.get('/:restauranteId/produtos', protegerRota, produtoController.listarProdutos);
router.get('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.obterProdutoPorId);
router.put('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.atualizarProduto);
router.delete('/:restauranteId/produtos/:produtoId', protegerRota, produtoController.deletarProduto);

// --- Rotas de Promoções para um Restaurante Específico (protegidas) ---
router.post('/:restauranteId/promocoes', protegerRota, promocaoController.criarPromocao);
router.get('/:restauranteId/promocoes', protegerRota, promocaoController.listarPromocoes);

// TODO: Outras rotas para promoções (obter por id, atualizar, deletar, adicionar/remover produtos da promoção)
// router.get('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.obterPromocaoPorId);
// router.put('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.atualizarPromocao);
// router.delete('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.deletarPromocao);

// TODO: Rotas para associar produtos a promoções (ex: /:restauranteId/promocoes/:promocaoId/produtos)

module.exports = router;