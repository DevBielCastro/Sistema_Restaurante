// backend/src/controllers/restaurante.controller.js
const restauranteService = require('../services/restaurante.service'); // Importo nosso serviço de restaurante

const criarRestaurante = async (req, res) => {
  try {
    const dadosNovoRestaurante = req.body;
    const restauranteCriado = await restauranteService.criarNovoRestaurante(dadosNovoRestaurante);
    res.status(201).json(restauranteCriado);

  } catch (error) {
    console.error('Controller: Erro ao tentar criar restaurante:', error.message);
    if (error.isZodError) {
      res.status(400).json({
        message: "Dados inválidos fornecidos.",
        details: error.message
      });
    } else if (error.message.includes('Já existe um registro com algum dos valores únicos')) {
      res.status(400).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Ocorreu um erro interno no servidor ao processar a criação do restaurante.' });
    }
  }
};

const obterRestaurantePorId = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteId, 10)) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para visualizar estes dados.' });
    }

    const restaurante = await restauranteService.buscarRestaurantePorId(restauranteId);

    if (!restaurante) {
      return res.status(404).json({ message: 'Restaurante não encontrado.' });
    }

    res.status(200).json(restaurante);
  } catch (error) {
    console.error('Controller: Erro ao obter restaurante:', error.message);
    res.status(500).json({ message: 'Erro interno no servidor ao buscar dados do restaurante.' });
  }
};

const atualizarRestaurante = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const dadosUpdate = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    if (restauranteAutenticado.restauranteId !== parseInt(restauranteId, 10)) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para modificar este restaurante.' });
    }

    const restauranteAtualizado = await restauranteService.modificarRestaurante(restauranteId, dadosUpdate);

    res.status(200).json(restauranteAtualizado);
  } catch (error) {
    console.error('Controller: Erro ao atualizar restaurante:', error.message);

    if (error.isZodError) {
      res.status(400).json({ message: "Dados inválidos para atualização.", details: error.message });
    } else if (error.isNotFoundError) {
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Erro interno no servidor ao atualizar o restaurante.' });
    }
  }
};

// <<<--- NOVO MÉTODO PARA UPLOAD DA LOGO
const uploadLogo = async (req, res) => {
  try {
    const { restauranteId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Verificação de Segurança
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteId, 10)) {
      return res.status(403).json({ message: 'Acesso negado. Você não tem permissão para modificar este restaurante.' });
    }

    // O middleware multer já processou o arquivo e o colocou em req.file
    if (!req.file) {
      return res.status(400).json({ message: 'Nenhum arquivo de imagem foi enviado.' });
    }

    // Construímos a URL pública para a imagem
    // O req.file.filename é o nome único que geramos no multer.config.js
    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Chamamos o serviço para salvar esta URL no banco de dados
    await restauranteService.atualizarPathLogo(restauranteId, logoUrl);

    res.status(200).json({
      message: 'Logo atualizada com sucesso!',
      path_logo: logoUrl,
    });

  } catch (error) {
    console.error('Controller: Erro ao fazer upload da logo:', error.message);
    res.status(500).json({ message: 'Erro interno no servidor ao processar o upload da logo.' });
  }
};

module.exports = {
  criarRestaurante,
  obterRestaurantePorId,
  atualizarRestaurante,
  uploadLogo, // <<<--- ADICIONADO
};