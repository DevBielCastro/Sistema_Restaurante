// backend/src/controllers/promocao.controller.js
const promocaoService = require('../services/promocao.service');

const criarPromocao = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovaPromocao = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Promoção: Tentando criar promoção para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa NÃO AUTORIZADA de criar promoção. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para criar promoções para este restaurante.' });
    }

    // Chamo o serviço para adicionar a nova promoção.
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

// Função para listar as promoções de um restaurante
const listarPromocoes = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    console.log(`Controller Promoção: Listando promoções para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de LISTAR promoções não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para listar promoções deste restaurante.' });
    }

    // Chamo o serviço para buscar as promoções
    const promocoes = await promocaoService.buscarPromocoesPorRestaurante(restauranteAutenticado.nomeSchemaDb);
    
    res.status(200).json(promocoes);

  } catch (error) {
    console.error('Controller Promoção (Listar) Error:', error.message);
    res.status(500).json({ message: 'Erro interno ao tentar listar as promoções.' });
  }
};

// Nova função para obter uma promoção específica por ID (esqueleto)
const obterPromocaoPorId = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, promocaoId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
    console.log(`Controller Promoção: Obtendo promoção ID '${promocaoId}' para restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Promoção: Tentativa de OBTER promoção não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para acessar promoções deste restaurante.' });
    }

    // TODO: Chamar promocaoService.buscarPromocaoPorId(restauranteAutenticado.nomeSchemaDb, parseInt(promocaoId, 10));
    // const promocao = await promocaoService.buscarPromocaoPorId(restauranteAutenticado.nomeSchemaDb, parseInt(promocaoId, 10));
    // if (!promocao) {
    //   return res.status(404).json({ message: 'Promoção não encontrada.' });
    // }
    // res.status(200).json(promocao);

    // Resposta provisória
    res.status(200).json({
      message: 'Controller: Lógica para OBTER promoção por ID a ser implementada no service.',
      restauranteIdDaUrl,
      promocaoId,
      infoDoToken: restauranteAutenticado 
    });

  } catch (error) {
    console.error('Controller Promoção (Obter por ID) Error:', error.message);
    // TODO: Adicionar tratamento para erros específicos vindos do service (ex: promocaoId inválido)
    res.status(500).json({ message: 'Erro interno ao tentar obter a promoção.' });
  }
};

module.exports = {
  criarPromocao,
  listarPromocoes,
  obterPromocaoPorId, // Adicionada a nova função aos exports
  // TODO: Adicionar outras funções de controller para promoções (atualizar, deletar)
};