// backend/src/services/categoria.service.js
const db = require('../config/db');
const { z } = require('zod');

// Schema Zod para CRIAR uma nova categoria (campos obrigatórios, defaults)
const categoriaCreateSchema = z.object({
  nome: z.string({
    required_error: "O nome da categoria é obrigatório.",
    invalid_type_error: "O nome da categoria deve ser um texto.",
  })
  .min(2, { message: "O nome da categoria deve ter pelo menos 2 caracteres." }),

  descricao: z.string()
    .min(3, { message: "A descrição deve ter pelo menos 3 caracteres, se fornecida."})
    .optional()
    .nullable(),

  ordem_exibicao: z.number({
    invalid_type_error: "A ordem de exibição deve ser um número.",
  })
  .int({ message: "A ordem de exibição deve ser um número inteiro."})
  .optional()
  .default(0),

  ativo: z.boolean({
    invalid_type_error: "O campo 'ativo' deve ser um valor booleano (true ou false).",
  })
  .optional()
  .default(true),
});

// Schema Zod para ATUALIZAR uma categoria (todos os campos são opcionais)
const categoriaUpdateSchema = categoriaCreateSchema.partial();


const adicionarNovaCategoria = async (nomeSchemaDbDoRestaurante, dadosBrutosCategoria) => {
  // Log para desenvolvimento.
  console.log(`Service Categoria: Adicionando categoria no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosCategoria);
  try {
    const dadosCategoria = categoriaCreateSchema.parse(dadosBrutosCategoria);
    console.log(`Service Categoria: Dados validados (com defaults Zod) :`, dadosCategoria);
    const { nome, descricao, ordem_exibicao, ativo } = dadosCategoria;
    const queryText = `
      INSERT INTO "${nomeSchemaDbDoRestaurante}".categorias 
        (nome, descricao, ordem_exibicao, ativo) 
      VALUES 
        ($1, $2, $3, $4) 
      RETURNING *; 
    `;
    const values = [ nome, descricao, ordem_exibicao, ativo ];
    const resultado = await db.query(queryText, values);
    const categoriaCriada = resultado.rows[0];
    if (!categoriaCriada) {
      throw new Error('Falha ao criar a categoria, nenhum dado retornado pelo banco.');
    }
    console.log(`Service Categoria: Categoria ID ${categoriaCriada.id} ('${categoriaCriada.nome}') criada com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return categoriaCriada;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Categoria Validation Error (Adicionar):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para categoria: ${formattedErrors}`);
      validationError.isZodError = true;
      throw validationError;
    }
    if (error.code === '23505' && error.constraint === 'categorias_nome_key') {
        console.error('Service Categoria DB Error (Adicionar): Tentativa de inserir categoria com nome duplicado.');
        throw new Error(`Já existe uma categoria com o nome '${dadosBrutosCategoria.nome}' neste cardápio.`);
    }
    console.error('Service Categoria Error (Adicionar):', error.message || error);
    throw new Error(`Erro no serviço ao adicionar categoria: ${error.message}`);
  }
};

const buscarCategoriasPorRestaurante = async (nomeSchemaDbDoRestaurante) => {
  // Log para desenvolvimento.
  console.log(`Service Categoria: Buscando categorias no schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const queryText = `
      SELECT id, nome, descricao, ordem_exibicao, ativo, data_criacao, data_atualizacao 
      FROM "${nomeSchemaDbDoRestaurante}".categorias 
      ORDER BY ordem_exibicao ASC, nome ASC;
    `;
    const resultado = await db.query(queryText);
    console.log(`Service Categoria: ${resultado.rows.length} categorias encontradas para o schema '${nomeSchemaDbDoRestaurante}'.`);
    return resultado.rows;
  } catch (error) {
    console.error(`Service Categoria Error (Buscar): Falha ao buscar categorias no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar categorias: ${error.message}`);
  }
};

const modificarCategoria = async (nomeSchemaDbDoRestaurante, categoriaId, dadosBrutosUpdate) => {
  // Log para desenvolvimento.
  console.log(`Service Categoria: Modificando categoria ID '${categoriaId}' no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosUpdate);
  try {
    const dadosUpdateValidados = categoriaUpdateSchema.parse(dadosBrutosUpdate);
    console.log(`Service Categoria: Dados de atualização validados pelo Zod:`, dadosUpdateValidados);

    const camposParaAtualizar = Object.keys(dadosUpdateValidados);
    if (camposParaAtualizar.length === 0) {
      const validationError = new Error('Nenhum dado válido fornecido para atualização da categoria.');
      validationError.isZodError = true;
      throw validationError;
    }

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const key of camposParaAtualizar) {
      if (dadosUpdateValidados[key] !== undefined) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(dadosUpdateValidados[key]);
        paramIndex++;
      }
    }
    values.push(categoriaId); 

    const queryText = `
      UPDATE "${nomeSchemaDbDoRestaurante}".categorias
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *; 
    `;
    
    console.log(`Service Categoria: Query UPDATE: ${queryText}`);
    console.log(`Service Categoria: Values UPDATE:`, values);
    const resultado = await db.query(queryText, values);

    if (resultado.rowCount === 0) {
      const error = new Error(`Categoria com ID '${categoriaId}' não encontrada no schema '${nomeSchemaDbDoRestaurante}' para atualização.`);
      error.isNotFoundError = true;
      throw error;
    }
    
    const categoriaAtualizada = resultado.rows[0];
    console.log(`Service Categoria: Categoria ID ${categoriaAtualizada.id} ('${categoriaAtualizada.nome}') atualizada com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return categoriaAtualizada;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Categoria Validation Error (Modificar):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para atualização da categoria: ${formattedErrors}`);
      validationError.isZodError = true;
      throw validationError;
    }
    if (error.message.includes('Nenhum dado válido fornecido para atualização')) {
        error.isZodError = true;
        throw error;
    }
    if (error.code === '23505' && error.constraint === 'categorias_nome_key') {
        console.error('Service Categoria DB Error (Modificar): Tentativa de atualizar para um nome de categoria duplicado.');
        const nomeTentado = dadosBrutosUpdate && dadosBrutosUpdate.nome ? dadosBrutosUpdate.nome : "desconhecido";
        throw new Error(`Já existe uma categoria com o nome fornecido ('${nomeTentado}') neste cardápio.`);
    }
    if (error.isNotFoundError) { // Erro que lançamos se rowCount === 0
        throw error;
    }
    console.error(`Service Categoria Error (Modificar): Falha ao modificar categoria ID '${categoriaId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao modificar categoria: ${error.message}`);
  }
};

// Função para remover uma categoria existente
const removerCategoria = async (nomeSchemaDbDoRestaurante, categoriaId) => {
  // Log para desenvolvimento.
  console.log(`Service Categoria: Removendo categoria ID '${categoriaId}' do schema '${nomeSchemaDbDoRestaurante}'`);

  try {
    // Converto categoriaId para inteiro para garantir.
    const idCategoriaParaDeletar = parseInt(categoriaId, 10);
    if (isNaN(idCategoriaParaDeletar)) {
      const error = new Error("ID da categoria inválido.");
      error.isValidationError = true; // Trato como erro de validação
      throw error;
    }

    // Construo a query SQL DELETE
    const queryText = `
      DELETE FROM "${nomeSchemaDbDoRestaurante}".categorias 
      WHERE id = $1;
    `;
    const values = [idCategoriaParaDeletar];

    // Executo a query
    const resultado = await db.query(queryText, values);

    // Verifico se alguma linha foi realmente deletada
    if (resultado.rowCount === 0) {
      // Se nenhuma linha foi afetada, a categoria com o ID fornecido não existe.
      const error = new Error(`Categoria com ID '${idCategoriaParaDeletar}' não encontrada no schema '${nomeSchemaDbDoRestaurante}' para deleção.`);
      error.isNotFoundError = true; // Sinalizo para o controller tratar como 404
      throw error;
    }

    // Se chegou aqui, a categoria foi deletada com sucesso.
    console.log(`Service Categoria: Categoria ID ${idCategoriaParaDeletar} deletada com sucesso do schema '${nomeSchemaDbDoRestaurante}'.`);
    return { message: `Categoria ID ${idCategoriaParaDeletar} deletada com sucesso.` };

  } catch (error) {
    if (error.isValidationError || error.isNotFoundError) {
        // Se for um erro que já sinalizamos (validação de ID ou não encontrado), apenas relanço.
        throw error;
    }

    // Verifico se o erro é uma violação de chave estrangeira (foreign_key_violation - código 23503)
    // Isso acontece se tentarmos deletar uma categoria que ainda tem produtos associados.
    if (error.code === '23503') { // 'foreign_key_violation'
      console.error(`Service Categoria DB Error (Remover): Tentativa de deletar categoria ID '${categoriaId}' que possui produtos associados.`);
      const fkError = new Error('Esta categoria não pode ser deletada, pois existem produtos associados a ela. Remova ou desassocie os produtos primeiro.');
      fkError.isForeignKeyViolation = true; // Flag para o controller
      throw fkError;
    }
    
    // Para outros erros do banco ou inesperados
    console.error(`Service Categoria Error (Remover): Falha ao remover categoria ID '${categoriaId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao remover categoria: ${error.message}`);
  }
};

module.exports = {
  adicionarNovaCategoria,
  buscarCategoriasPorRestaurante,
  modificarCategoria,
  removerCategoria, // Exporto a nova função
};