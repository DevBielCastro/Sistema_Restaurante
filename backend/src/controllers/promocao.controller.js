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
      // A error.message já vem formatada do service
      const details = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : error.message;
      return res.status(400).json({ 
        message: "Dados inválidos para a promoção.", 
        details: details
      });
    } 
    // TODO: Tratar outros erros específicos que o service possa lançar (ex: nome duplicado)
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar criar a promoção.' });
    }
  }
};

const listarPromocoes = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
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

// Função para obter uma promoção específica por ID (AGORA CHAMA O SERVICE REAL)
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

    // Chamo o serviço para buscar a promoção por ID.
    const promocao = await promocaoService.buscarPromocaoPorId(
        restauranteAutenticado.nomeSchemaDb, 
        promocaoId // O serviço fará o parseInt e validação do promocaoId
    );

    // Verifico se a promoção foi encontrada pelo serviço
    if (!promocao) {
      // Se o serviço retornou null, significa que a promoção não foi encontrada.
      return res.status(404).json({ message: `Promoção com ID '${promocaoId}' não encontrada neste restaurante.` });
    }
    
    // Se a promoção foi encontrada, retorno com status 200 OK.
    res.status(200).json(promocao);

  } catch (error) {
    // Log do erro no console do backend
    console.error('Controller Promoção (Obter por ID) Error:', error.message);

    // Verifico o tipo de erro para dar uma resposta HTTP apropriada
    if (error.isValidationError) { // Flag que definimos no service para ID de promoção inválido
        return res.status(400).json({ message: error.message });
    } 
    // O service já retorna null para "não encontrado", que tratamos acima.
    // Outros erros podem ser erros de banco de dados ou inesperados.
    else {
      return res.status(500).json({ message: 'Erro interno no servidor ao tentar obter a promoção.' });
    }
  }
};

module.exports = {
  criarPromocao,
  listarPromocoes,
  obterPromocaoPorId,
  // TODO: Adicionar outras funções de controller para promoções (atualizar, deletar)
};