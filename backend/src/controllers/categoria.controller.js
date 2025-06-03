// backend/src/controllers/categoria.controller.js
const categoriaService = require('../services/categoria.service');

const criarCategoria = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const dadosNovaCategoria = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Categoria: Tentativa de CRIAR categoria não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para adicionar categorias a este restaurante.' });
    }

    const categoriaCriada = await categoriaService.adicionarNovaCategoria(
      restauranteAutenticado.nomeSchemaDb,
      dadosNovaCategoria
    );
    
    res.status(201).json(categoriaCriada);

  } catch (error) {
    console.error('Controller Categoria (Criar) Error:', error.message);
    if (error.isZodError) {
      res.status(400).json({ message: "Dados inválidos para categoria.", details: error.message });
    } else if (error.message.includes('Já existe uma categoria com o nome')) {
      res.status(400).json({ message: error.message });
    }
    else {
      res.status(500).json({ message: 'Erro interno ao tentar criar a categoria.' });
    }
  }
};

const listarCategorias = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Categoria: Tentativa de LISTAR categorias não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para listar categorias deste restaurante.' });
    }

    const categorias = await categoriaService.buscarCategoriasPorRestaurante(restauranteAutenticado.nomeSchemaDb);
    res.status(200).json(categorias);

  } catch (error) {
    console.error('Controller Categoria (Listar) Error:', error.message);
    res.status(500).json({ message: 'Erro interno ao tentar listar as categorias.' });
  }
};

const atualizarCategoria = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, categoriaId } = req.params;
    const dadosUpdateCategoria = req.body;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Categoria: Tentativa de ATUALIZAR categoria não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para modificar categorias deste restaurante.' });
    }

    const categoriaAtualizada = await categoriaService.modificarCategoria(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(categoriaId, 10),
        dadosUpdateCategoria
    );
    
    res.status(200).json(categoriaAtualizada);

  } catch (error) {
    console.error('Controller Categoria (Atualizar) Error:', error.message);
    if (error.isZodError) {
      res.status(400).json({ message: "Dados inválidos para atualização da categoria.", details: error.message });
    } else if (error.isNotFoundError) {
      res.status(404).json({ message: error.message });
    } else if (error.message.includes('Já existe uma categoria com o nome fornecido')) {
      res.status(400).json({ message: error.message });
    }
    else {
      res.status(500).json({ message: 'Erro interno ao tentar atualizar a categoria.' });
    }
  }
};

// Função para deletar uma categoria existente
const deletarCategoria = async (req, res) => {
  try {
    const { restauranteId: restauranteIdDaUrl, categoriaId } = req.params;
    const restauranteAutenticado = req.restauranteAutenticado;

    // Log para desenvolvimento
    console.log(`Controller Categoria: Deletando categoria ID '${categoriaId}' do restauranteId (URL): ${restauranteIdDaUrl}`);

    // Verificação de Autorização
    if (restauranteAutenticado.restauranteId !== parseInt(restauranteIdDaUrl, 10)) {
      console.warn(`Controller Categoria: Tentativa de DELETAR categoria não autorizada. ID do Token: ${restauranteAutenticado.restauranteId}, ID da URL: ${restauranteIdDaUrl}`);
      return res.status(403).json({ message: 'Acesso proibido: você não tem permissão para deletar categorias deste restaurante.' });
    }

    // Chamo o serviço para remover a categoria
    await categoriaService.removerCategoria(
        restauranteAutenticado.nomeSchemaDb, 
        parseInt(categoriaId, 10) // Garanto que categoriaId é um número
    );
    
    // Se o serviço foi bem-sucedido (não lançou erro), a categoria foi deletada.
    // Respondo com 204 No Content, que é o padrão para DELETE bem-sucedido sem corpo de resposta.
    res.status(204).send();

  } catch (error) {
    // Log do erro no console do backend
    console.error('Controller Categoria (Deletar) Error:', error.message);

    // Verifico o tipo de erro para dar uma resposta HTTP apropriada
    if (error.isValidationError) { // Flag de erro de validação do ID da categoria (do service)
        res.status(400).json({ message: error.message });
    } else if (error.isNotFoundError) { // Flag que definimos no service para categoria não encontrada
        res.status(404).json({ message: error.message });
    } else if (error.isForeignKeyViolation) { // Flag para violação de chave estrangeira (categoria com produtos)
        res.status(409).json({ message: error.message }); 
    } else {
      // Para todos os outros tipos de erro
      res.status(500).json({ message: 'Erro interno ao tentar deletar a categoria.' });
    }
  }
};

module.exports = {
  criarCategoria,
  listarCategorias,
  atualizarCategoria,
  deletarCategoria,
};