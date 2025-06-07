// backend/src/controllers/produto.controller.js
const produtoService = require('../services/produto.service');

// ... (funções adicionarProduto, listarProdutos, obterProdutoPorId, atualizarProduto - como na última versão completa) ...
const adicionarProduto = async (req, res) => {
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
      return res.status(400).json({ message: message, details: details });
    } else if (error.isForeignKeyConstraint) { 
      return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) { 
      return res.status(404).json({ message: error.message });
    } else if (error.isValidationError) { 
        return res.status(400).json({ message: error.message });
    }
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar atualizar o produto.' });
    }
  }
};

const deletarProduto = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, produtoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Produto: Deletando produto ID '${produtoId}' do restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Produto: Tentativa de DELETAR produto não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para deletar produtos deste restaurante.' });
    }

    await produtoService.removerProduto(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(produtoId, 10)
    );
    
    res.status(204).send();

  } catch (error) {
    console.error('Controller Produto (Deletar) Error:', error.message);

    if (error.isValidationError) {
        return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) {
        return res.status(404).json({ message: error.message });
    } else if (error.isForeignKeyViolation) {
        return res.status(409).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar deletar o produto.' });
    }
  }
};

// <<<--- NOVO MÉTODO PARA UPLOAD DE IMAGEM DO PRODUTO
const uploadImagemProduto = async (req, res) => {
    try {
        const { restauranteId, produtoId } = req.params;
        const restauranteAutenticado = req.restauranteAutenticado;

        // Verificação de segurança
        if (restauranteAutenticado.restauranteId !== parseInt(restauranteId, 10)) {
            return res.status(403).json({ message: 'Acesso negado.' });
        }

        // Verifica se o arquivo foi enviado
        if (!req.file) {
            return res.status(400).json({ message: 'Nenhum arquivo de imagem foi enviado.' });
        }

        // Constrói a URL pública da imagem
        const imageUrl = `/uploads/produtos/${req.file.filename}`;

        // Chama o serviço para salvar a URL no banco de dados
        await produtoService.atualizarUrlFotoProduto(
            restauranteAutenticado.nomeSchemaDb,
            produtoId,
            imageUrl
        );

        res.status(200).json({
            message: 'Imagem do produto atualizada com sucesso!',
            url_foto: imageUrl,
        });

    } catch (error) {
        console.error('Controller: Erro ao fazer upload da imagem do produto:', error.message);
        if (error.isNotFoundError) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Erro interno no servidor ao processar o upload da imagem.' });
    }
};

module.exports = {
  adicionarProduto,
  listarProdutos,
  obterProdutoPorId,
  atualizarProduto,
  deletarProduto,
  uploadImagemProduto,
};