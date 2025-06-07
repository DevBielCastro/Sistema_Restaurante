// backend/src/api/restaurantes.routes.js
const express = require('express');
const router = express.Router();
const restauranteController = require('../controllers/restaurante.controller');
const categoriaController = require('../controllers/categoria.controller');
const produtoController = require('../controllers/produto.controller');
const promocaoController = require('../controllers/promocao.controller');
const { protegerRota } = require('../middlewares/auth.middleware');
const uploadLogo = require('../config/multer.config'); // Para a logo do restaurante
const uploadProduto = require('../config/produto-multer.config'); // <<< NOVO: Para imagens de produtos

// --- Rotas de Onboarding e Gerenciamento do Restaurante ---

// Rota pública para criação de novos restaurantes
router.post('/', restauranteController.criarRestaurante);

// Rota para obter os dados do próprio restaurante (protegida)
router.get('/:restauranteId', protegerRota, restauranteController.obterRestaurantePorId);

// Rota para atualizar os dados do próprio restaurante (protegida)
router.put('/:restauranteId', protegerRota, restauranteController.atualizarRestaurante);

// Rota para fazer upload da logo do restaurante (protegida)
router.post(
  '/:restauranteId/logo',
  protegerRota,
  uploadLogo.single('logo'), // Middleware do Multer para a logo
  restauranteController.uploadLogo
);


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

// Rota para upload de imagem de um produto específico <<<--- ADIÇÃO
router.post(
    '/:restauranteId/produtos/:produtoId/imagem',
    protegerRota,
    uploadProduto.single('imagem'), // Usa a config de produto, campo 'imagem'
    produtoController.uploadImagemProduto
);


// --- Rotas de Promoções para um Restaurante Específico (protegidas) ---
router.post('/:restauranteId/promocoes', protegerRota, promocaoController.criarPromocao);
// ... (demais rotas de promoções)
router.get('/:restauranteId/promocoes', protegerRota, promocaoController.listarPromocoes);
router.get('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.obterPromocaoPorId);
router.put('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.atualizarPromocao);
router.delete('/:restauranteId/promocoes/:promocaoId', protegerRota, promocaoController.deletarPromocao);
router.post('/:restauranteId/promocoes/:promocaoId/produtos', protegerRota, promocaoController.adicionarProdutoNaPromocao);
router.get('/:restauranteId/promocoes/:promocaoId/produtos', protegerRota, promocaoController.listarProdutosDaPromocao);
router.delete('/:restauranteId/promocoes/:promocaoId/produtos/:produtoId', protegerRota, promocaoController.removerProdutoDaPromocao);


module.exports = router;