// backend/src/controllers/restaurante.controller.js
const restauranteService = require('../services/restaurante.service'); // Importo nosso serviço de restaurante

const criarRestaurante = async (req, res) => {
  try {
    // Os dados para o novo restaurante virão no corpo da requisição
    const dadosNovoRestaurante = req.body;

    // Chamo o serviço para efetivamente criar o restaurante.
    // O serviço já faz a validação dos dados com Zod e toda a lógica de banco.
    const restauranteCriado = await restauranteService.criarNovoRestaurante(dadosNovoRestaurante);

    // Se o serviço foi bem-sucedido, o restaurante foi criado.
    // Respondo com 201 (Created) e os dados do restaurante.
    res.status(201).json(restauranteCriado);
  } catch (error) {
    // Log do erro no console do backend para fins de debug.
    console.error('Controller: Erro ao tentar criar restaurante:', error.message);

    // Verifico o tipo de erro para dar uma resposta HTTP apropriada.
    if (error.isZodError) {
      // Se for um erro de validação do Zod (flag que definimos no service).
      // A error.message já vem formatada do service com os detalhes da validação.
      res.status(400).json({
        message: "Dados inválidos fornecidos.",
        details: error.message // Contém a string com todos os erros de validação Zod
        // Opcionalmente, poderia usar error.issues se o frontend precisasse de um array:
        // issues: error.issues
      });
    } else if (error.message.includes('Já existe um registro com algum dos valores únicos')) {
      // Se for um erro de constraint UNIQUE do banco, também é um Bad Request.
      res.status(400).json({ message: error.message });
    } else {
      // Para todos os outros tipos de erro que chegam aqui, considero um erro interno do servidor.
      res.status(500).json({ message: 'Ocorreu um erro interno no servidor ao processar a criação do restaurante.' });
    }
  }
};

module.exports = {
  criarRestaurante,
  // TODO: Adicionar aqui as outras funções de controller para restaurantes (listar, atualizar, etc.)
};