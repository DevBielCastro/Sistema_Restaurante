// backend/src/controllers/produto.controller.js
const produtoService = require('../services/produto.service');

const adicionarProduto = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovoProduto = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento (pode ser ajustado ou removido em produção)
    console.log(`Controller Produto: Tentando adicionar produto para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa NÃO AUTORIZADA de adicionar produto. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para adicionar produtos a este restaurante.' });
    }

    // Chamo o serviço para criar o produto.
    // O serviço agora também verifica se a categoria_id existe.
    const produtoCriado = await produtoService.criarNovoProduto(
        restauranteAutenticado.nomeSchemaDb, 
        dadosNovoProduto
    );
    
    // Se o serviço foi bem-sucedido, ele retorna o produto criado.
    res.status(201).json(produtoCriado);

  } catch (error) {
    // Log do erro no console do backend
    console.error('Controller Produto (Adicionar) Error:', error.message);

    // Verifico o tipo de erro para dar uma resposta HTTP apropriada
    if (error.isZodError) { // Flag de erro de validação Zod (do service)
      return res.status(400).json({ message: "Dados inválidos para o produto.", details: error.message });
    } else if (error.isForeignKeyConstraint) { // Flag para categoria_id não encontrada (do service)
      // Se a categoria_id fornecida não existe, é um erro do cliente (Bad Request).
      return res.status(400).json({ message: error.message }); 
    }
    // TODO: Adicionar tratamento para outros erros específicos de produtoService 
    //       (ex: nome de produto duplicado dentro da mesma categoria, se essa constraint existir)
    else {
      // Para outros erros, considero um erro interno do servidor.
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar adicionar o produto.' });
    }
  }
};

module.exports = {
  adicionarProduto,
  // TODO: Adicionar outras funções de controller para produtos (listar, atualizar, deletar)
};