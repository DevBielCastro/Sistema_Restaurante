// backend/src/controllers/public.controller.js
const publicService = require('../services/public.service');

const obterCardapioPublico = async (req, res) => {
  try {
    // Pega o 'identificador_url' da URL da requisição
    // Ex: .../public/cardapio/cantina_do_vale_feliz -> identificador_url = 'cantina_do_vale_feliz'
    const { identificador_url } = req.params;

    if (!identificador_url) {
      return res.status(400).json({ message: 'Identificador do restaurante não fornecido.' });
    }

    // Chama o serviço para buscar todos os dados do cardápio
    const cardapioCompleto = await publicService.getPublicCardapio(identificador_url);

    // Se o serviço retornar null, significa que o restaurante não foi encontrado
    if (!cardapioCompleto) {
      return res.status(404).json({ message: 'Restaurante não encontrado.' });
    }

    // Envia a resposta completa com os dados do cardápio
    res.status(200).json(cardapioCompleto);

  } catch (error) {
    console.error('Controller Público (obterCardapioPublico) Error:', error.message);
    // Para erros inesperados, retorna um 500
    res.status(500).json({ message: 'Erro interno ao tentar buscar o cardápio.' });
  }
};

module.exports = {
  obterCardapioPublico,
};