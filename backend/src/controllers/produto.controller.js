// backend/src/controllers/produto.controller.js
const produtoService = require('../services/produto.service');

const adicionarProduto = async (req, res) => {
  // ... (código existente da função adicionarProduto)
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovoProduto = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Tentando adicionar produto para restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa NÃO AUTORIZADA de adicionar produto. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para adicionar produtos a este restaurante.' });
    }

    const produtoCriado = await produtoService.criarNovoProduto(
        restauranteAutenticado.nomeSchemaDb,
        dadosNovoProduto
    );
    
    res.status(201).json(produtoCriado);

  } catch (error) {
    console.error('Controller Produto (Adicionar) Error:', error.message);
    if (error.isZodError) {
      return res.status(400).json({ message: "Dados inválidos para o produto.", details: error.message });
    } else if (error.isForeignKeyConstraint) { 
      return res.status(400).json({ message: error.message });
    }
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar adicionar o produto.' });
    }
  }
};

const listarProdutos = async (req, res) => {
  // ... (código existente da função listarProdutos)
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Listando produtos para restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de LISTAR produtos não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para listar produtos deste restaurante.' });
    }

    const produtos = await produtoService.buscarProdutosPorRestaurante(restauranteAutenticado.nomeSchemaDb);
    res.status(200).json(produtos);

  } catch (error) {
    console.error('Controller Produto (Listar) Error:', error.message);
    res.status(500).json({ message: 'Erro interno ao tentar listar os produtos.' });
  }
};

const obterProdutoPorId = async (req, res) => {
  // ... (código existente da função obterProdutoPorId)
  try {
    const { restauranteId: restauranteIdDaUrl, produtoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Obtendo produto ID '${produtoId}' para restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de OBTER produto não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para acessar produtos deste restaurante.' });
    }

    const produto = await produtoService.buscarProdutoPorId(
        restauranteAutenticado.nomeSchemaDb, 
        produtoId 
    );

    if (!produto) {
      return res.status(404).json({ message: `Produto com ID '${produtoId}' não encontrado neste restaurante.` });
    }
    
    res.status(200).json(produto);

  } catch (error) {
    console.error('Controller Produto (Obter por ID) Error:', error.message);
    if (error.isValidationError) { 
        return res.status(400).json({ message: error.message });
    } 
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar obter o produto.' });
    }
  }
};

const atualizarProduto = async (req, res) => {
  // ... (código existente da função atualizarProduto)
  try {
    const { restauranteId: restauranteIdDaUrl, produtoId } = req.params;
    const dadosUpdateProduto = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Atualizando produto ID '${produtoId}' para restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de ATUALIZAR produto não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para modificar produtos deste restaurante.' });
    }

    const produtoAtualizado = await produtoService.modificarProduto(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(produtoId, 10),
        dadosUpdateProduto
    );
    
    res.status(200).json(produtoAtualizado);

  } catch (error) {
    console.error('Controller Produto (Atualizar) Error:', error.message);

    if (error.isZodError) { 
      const details = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : undefined;
      const message = error.message.startsWith("Erro de validação") || error.message.startsWith("Nenhum dado válido") 
                      ? error.message 
                      : "Dados inválidos para atualização do produto.";
      
      return res.status(400).json({ 
        message: message,
        details: details 
      });
    } else if (error.isForeignKeyConstraint) { 
      return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) { 
      return res.status(404).json({ message: error.message });
    } else if (error.message && error.message.includes('Já existe um produto com o nome fornecido')) { 
      return res.status(400).json({ message: error.message });
    }
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar atualizar o produto.' });
    }
  }
};

// Função para deletar um produto existente (AGORA IMPLEMENTADA)
const deletarProduto = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, produtoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
    console.log(`Controller Produto: Deletando produto ID '${produtoId}' do restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de DELETAR produto não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para deletar produtos deste restaurante.' });
    }

    // Chamo o serviço para remover o produto.
    // O serviço agora lança erros específicos para 'não encontrado' ou 'ID inválido'.
    await produtoService.removerProduto(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(produtoId, 10) // Garanto que produtoId é um número
    );
    
    // Se o serviço foi bem-sucedido (não lançou erro), o produto foi deletado.
    // Respondo com 204 No Content, que é o padrão para DELETE bem-sucedido sem corpo de resposta.
    res.status(204).send();

  } catch (error) {
    // Log do erro no console do backend
    console.error('Controller Produto (Deletar) Error:', error.message);

    // Verifico o tipo de erro para dar uma resposta HTTP apropriada
    if (error.isValidationError) { // Flag de erro de validação do ID do produto (do service)
        return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) { // Flag que definimos no service para produto não encontrado
        return res.status(404).json({ message: error.message });
    } 
    // A flag 'isForeignKeyViolation' foi removida do service de deletar produto, pois produtos
    // geralmente não têm essa restrição ao serem deletados, a menos que itens de pedido os referenciem.
    // Se essa lógica for adicionada ao service, o controller precisaria tratar 'isForeignKeyViolation' aqui.
    else {
      // Para todos os outros tipos de erro
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar deletar o produto.' });
    }
  }
};

module.exports = {
  adicionarProduto,
  listarProdutos,
  obterProdutoPorId,
  atualizarProduto,
  deletarProduto, // Função agora implementada e exportada
};