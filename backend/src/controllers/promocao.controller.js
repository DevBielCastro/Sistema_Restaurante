// backend/src/controllers/promocao.controller.js
const promocaoService = require('../services/promocao.service');

const criarPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovaPromocao = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa NÃO AUTORIZADA de criar promoção. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para criar promoções para este restaurante.' });
    }

    const promocaoCriada = await promocaoService.adicionarNovaPromocao(
        restauranteAutenticado.nomeSchemaDb, 
        dadosNovaPromocao
    );
    
    res.status(201).json(promocaoCriada);

  } catch (error) {
    console.error('Controller Promoção (Criar) Error:', error.message);
    if (error.isZodError) {
      const details = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : error.message;
      return res.status(400).json({ 
        message: "Dados inválidos para a promoção.", 
        details: details
      });
    } 
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar criar a promoção.' });
    }
  }
};

const listarPromocoes = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de LISTAR promoções não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para listar promoções deste restaurante.' });
    }

    const promocoes = await promocaoService.buscarPromocoesPorRestaurante(restauranteAutenticado.nomeSchemaDb);
    res.status(200).json(promocoes);

  } catch (error) {
    console.error('Controller Promoção (Listar) Error:', error.message);
    res.status(500).json({ message: 'Erro interno ao tentar listar as promoções.' });
  }
};

const obterPromocaoPorId = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de OBTER promoção não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para acessar promoções deste restaurante.' });
    }

    const promocao = await promocaoService.buscarPromocaoPorId(
        restauranteAutenticado.nomeSchemaDb, 
        promocaoId
    );

    if (!promocao) {
      return res.status(404).json({ message: `Promoção com ID '${promocaoId}' não encontrada neste restaurante.` });
    }
    
    res.status(200).json(promocao);

  } catch (error) {
    console.error('Controller Promoção (Obter por ID) Error:', error.message);
    if (error.isValidationError) { 
        return res.status(400).json({ message: error.message });
    } 
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar obter a promoção.' });
    }
  }
};

const atualizarPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId } = req.params;
    const dadosUpdatePromocao = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de ATUALIZAR promoção não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para modificar promoções deste restaurante.' });
    }

    const promocaoAtualizada = await promocaoService.modificarPromocao(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(promocaoId, 10),
        dadosUpdatePromocao
    );
    
    res.status(200).json(promocaoAtualizada);

  } catch (error) {
    console.error('Controller Promoção (Atualizar) Error:', error.message);
    if (error.isZodError) { 
      const details = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : undefined;
      const message = error.message.startsWith("Erro de validação") || error.message.startsWith("Nenhum dado válido") 
                      ? error.message 
                      : "Dados inválidos para atualização da promoção.";
      return res.status(400).json({ message: message, details: details });
    } else if (error.isForeignKeyConstraint) { 
      return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) { 
      return res.status(404).json({ message: error.message });
    } else if (error.isValidationError) { 
        return res.status(400).json({ message: error.message });
    }
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar atualizar a promoção.' });
    }
  }
};

const deletarPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de DELETAR promoção não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para deletar promoções deste restaurante.' });
    }

    await promocaoService.removerPromocao(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(promocaoId, 10)
    );
    
    res.status(204).send();

  } catch (error) {
    console.error('Controller Promoção (Deletar) Error:', error.message);
    if (error.isValidationError) {
        return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) {
        return res.status(404).json({ message: error.message });
    } else if (error.isForeignKeyViolation) {
        return res.status(409).json({ message: error.message }); 
    } else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar deletar a promoção.' });
    }
  }
};

const adicionarProdutoNaPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId } = req.params;
    const dadosVinculoProduto = req.body; 
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Promoção: Adicionando produto à promoção ID '${promocaoId}' do restauranteId (URL): ${restauranteIdDaUrl}`);
    console.log(`Controller Promoção: Dados do vínculo do produto:`, dadosVinculoProduto);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa NÃO AUTORIZADA de adicionar produto à promoção. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para modificar esta promoção.' });
    }

    const vinculoCriado = await promocaoService.vincularProdutoAPromocao(
      restauranteAutenticado.nomeSchemaDb, 
      parseInt(promocaoId, 10), 
      dadosVinculoProduto
    );
    
    res.status(201).json(vinculoCriado);

  } catch (error) {
    console.error('Controller Promoção (Adicionar Produto) Error:', error.message);
    
    if (error.isZodError) {
        const details = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : undefined;
        return res.status(400).json({ message: "Dados inválidos para vincular produto.", details });
    } else if (error.isValidationError || error.isBusinessLogicError || error.isForeignKeyConstraint) {
        return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError || error.isReferencedResourceNotFound) {
        return res.status(404).json({ message: error.message });
    } else if (error.isConflictError) {
        return res.status(409).json({ message: error.message });
    } else {
        return res.status(500).json({ message: 'Erro interno ao tentar adicionar produto à promoção.' });
    }
  }
};

const removerProdutoDaPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId, produtoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Promoção: Removendo produto ID '${produtoId}' da promoção ID '${promocaoId}' do restauranteId (URL): ${restauranteIdDaUrl}`);

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa NÃO AUTORIZADA de remover produto da promoção. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para modificar esta promoção.' });
    }
    
    await promocaoService.removerProdutoDaPromocao(
      restauranteAutenticado.nomeSchemaDb,
      parseInt(promocaoId, 10),
      parseInt(produtoId, 10)
    );
    
    res.status(204).send();

  } catch (error) {
    console.error('Controller Promoção (Remover Produto) Error:', error.message);

    if (error.isValidationError) {
        return res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) {
        return res.status(404).json({ message: error.message });
    } else {
      return res.status(500).json({ message: 'Erro interno ao tentar remover produto da promoção.' });
    }
  }
};


const listarProdutosDaPromocao = async (req, res) => {
  try {
    const { promocaoId } = req.params;
    // CORREÇÃO: Obter o schema do objeto 'restauranteAutenticado', que é injetado pelo middleware.
    const nomeSchema = req.restauranteAutenticado.nomeSchemaDb; 

    // Medida de segurança para garantir que o schema foi obtido
    if (!nomeSchema) {
      return res.status(403).json({ message: "Informação do restaurante não encontrada no token." });
    }

    const produtos = await promocaoService.listarProdutosDaPromocao(nomeSchema, promocaoId);
    
    res.status(200).json(produtos);

  } catch (error) {
    console.error(`Controller (Listar Produtos da Promoção) Error:`, error.message);
    res.status(500).json({ message: 'Erro interno ao buscar os produtos da promoção.' });
  }
};


module.exports = {
  criarPromocao,
  listarPromocoes,
  obterPromocaoPorId,
  atualizarPromocao,
  deletarPromocao,
  adicionarProdutoNaPromocao,
  removerProdutoDaPromocao,
  listarProdutosDaPromocao,
};