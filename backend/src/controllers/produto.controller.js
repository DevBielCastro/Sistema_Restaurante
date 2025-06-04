// backend/src/controllers/produto.controller.js
const produtoService = require('../services/produto.service');

const adicionarProduto = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovoProduto = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Tentando adicionar produto para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa NÃO AUTORIZADA de adicionar produto. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para adicionar produtos a este restaurante.' });
    }

    // Chamo o serviço para criar o produto.
    const produtoCriado = await produtoService.criarNovoProduto(
        restauranteAutenticado.nomeSchemaDb,
        dadosNovoProduto
    );

    // Se o serviço foi bem-sucedido, ele retorna o produto criado.
    res.status(201).json(produtoCriado);

  } catch (error) {
    console.error('Controller Produto (Adicionar) Error:', error.message);

    if (error.isZodError) {
      return res.status(400).json({ message: "Dados inválidos para o produto.", details: error.message });
    } else if (error.isForeignKeyConstraint) { // Erro se a categoria_id não for encontrada
      return res.status(400).json({ message: error.message });
    }
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar adicionar o produto.' });
    }
  }
};

const listarProdutos = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
    console.log(`Controller Produto: Listando produtos para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de LISTAR produtos não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para listar produtos deste restaurante.' });
    }

    // Chamada ao serviço buscarProdutosPorRestaurante
    const produtos = await produtoService.buscarProdutosPorRestaurante(restauranteAutenticado.nomeSchemaDb);
    res.status(200).json(produtos);

  } catch (error) {
    console.error('Controller Produto (Listar) Error:', error.message);
    res.status(500).json({ message: 'Erro interno ao tentar listar os produtos.' });
  }
};

// Nova função para obter um produto específico por ID
const obterProdutoPorId = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, produtoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
    console.log(`Controller Produto: Obtendo produto ID '${produtoId}' para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de OBTER produto não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para acessar produtos deste restaurante.' });
    }

    // TODO: Chamar produtoService.buscarProdutoPorId(restauranteAutenticado.nomeSchemaDb, parseInt(produtoId, 10));
    // const produto = await produtoService.buscarProdutoPorId(restauranteAutenticado.nomeSchemaDb, parseInt(produtoId, 10));
    // if (!produto) {
    //   return res.status(404).json({ message: 'Produto não encontrado.' });
    // }
    // res.status(200).json(produto);

    // Resposta provisória
    res.status(200).json({
      message: 'Controller: Lógica para OBTER produto por ID a ser implementada no service.',
      restauranteIdDaUrl,
      produtoId,
      infoDoToken: restauranteAutenticado // Apenas para debug inicial, pode remover depois
    });

  } catch (error) {
    console.error('Controller Produto (Obter por ID) Error:', error.message);
    // TODO: Adicionar tratamento para erros específicos vindos do service (ex: produto não encontrado)
    res.status(500).json({ message: 'Erro interno ao tentar obter o produto.' });
  }
};

module.exports = {
  adicionarProduto,
  listarProdutos,
  obterProdutoPorId, // Adicionada a nova função aos exports
  // TODO: Adicionar outras funções de controller para produtos (atualizar, deletar)
};