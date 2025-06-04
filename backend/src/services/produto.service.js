// backend/src/services/produto.service.js
const db = require('../config/db');
const { z } = require('zod');

// Schema Zod para CRIAR um novo produto
const produtoCreateSchema = z.object({
  nome: z.string({
    required_error: "O nome do produto é obrigatório.",
    invalid_type_error: "O nome do produto deve ser um texto.",
  })
  .min(2, { message: "O nome do produto deve ter pelo menos 2 caracteres." }),

  descricao: z.string()
    .min(3, { message: "A descrição do produto deve ter pelo menos 3 caracteres, se fornecida."})
    .optional()
    .nullable(),

  preco: z.number({
    required_error: "O preço é obrigatório.",
    invalid_type_error: "O preço deve ser um número.",
  })
  .positive({ message: "O preço deve ser um valor positivo." })
  .multipleOf(0.01, { message: "O preço deve ter no máximo duas casas decimais." }),

  categoria_id: z.number({
    required_error: "O ID da categoria é obrigatório.",
    invalid_type_error: "O ID da categoria deve ser um número.",
  })
  .int({ message: "O ID da categoria deve ser um número inteiro." })
  .positive({ message: "O ID da categoria deve ser um número positivo." }),

  url_foto: z.string()
    .url({ message: "A URL da foto deve ser uma URL válida (ex: http://... ou https://...)." })
    .optional()
    .nullable(),

  ordem_exibicao: z.number({
    invalid_type_error: "A ordem de exibição deve ser um número.",
  })
  .int({ message: "A ordem de exibicao deve ser um número inteiro."})
  .optional()
  .default(0),

  ativo: z.boolean({
    invalid_type_error: "O campo 'ativo' deve ser um valor booleano (true ou false).",
  })
  .optional()
  .default(true),
});

// Schema Zod para ATUALIZAR um produto (todos os campos do create schema são opcionais)
const produtoUpdateSchema = produtoCreateSchema.partial();


const criarNovoProduto = async (nomeSchemaDbDoRestaurante, dadosBrutosProduto) => {
  // Log para desenvolvimento (pode ser ajustado em produção)
  console.log(`Service Produto: Tentando criar novo produto no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosProduto);

  try {
    // 1. Validar 'dadosBrutosProduto' usando o schema Zod.
    const dadosProduto = produtoCreateSchema.parse(dadosBrutosProduto);
    console.log(`Service Produto: Dados validados (com defaults Zod):`, dadosProduto);

    const {
      nome,
      descricao,
      preco,
      categoria_id,
      url_foto,
      ordem_exibicao,
      ativo,
    } = dadosProduto;

    // 2. Verificar se a 'categoria_id' fornecida existe na tabela 'categorias'
    //    do schema do restaurante.
    const queryVerificaCategoria = `
      SELECT id FROM "${nomeSchemaDbDoRestaurante}".categorias WHERE id = $1;
    `;
    const resultadoCategoria = await db.query(queryVerificaCategoria, [categoria_id]);

    if (resultadoCategoria.rowCount === 0) {
      const error = new Error(`Categoria com ID '${categoria_id}' não encontrada no cardápio deste restaurante.`);
      error.isForeignKeyConstraint = true; // Flag para o controller tratar
      throw error;
    }

    // 3. Construir a query SQL para inserir na tabela 'produtos'
    const queryInsertProduto = `
      INSERT INTO "${nomeSchemaDbDoRestaurante}".produtos 
        (nome, descricao, preco, categoria_id, url_foto, ativo, ordem_exibicao) 
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *; 
    `;
    const valuesInsertProduto = [
      nome,
      descricao,
      preco,
      categoria_id,
      url_foto,
      ativo,
      ordem_exibicao,
    ];

    // 4. Executar a query de inserção do produto
    const resultadoProduto = await db.query(queryInsertProduto, valuesInsertProduto);
    const produtoCriado = resultadoProduto.rows[0];

    if (!produtoCriado) {
      // Esta checagem é uma segurança extra, o 'RETURNING *' deveria garantir um resultado ou erro antes.
      throw new Error('Falha ao criar o produto, nenhum dado retornado pelo banco.');
    }

    console.log(`Service Produto: Produto ID ${produtoCriado.id} ('${produtoCriado.nome}') criado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoCriado; // Retorno o produto completo como veio do banco

  } catch (error) {
    // Se for um erro de validação do Zod
    if (error instanceof z.ZodError) {
      console.error('Service Produto Validation Error (Criar):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para produto: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues; 
      throw validationError;
    }
    // Se for o erro que lançamos para categoria_id não encontrada
    if (error.isForeignKeyConstraint) {
        throw error; // Relanço para o controller tratar
    }
    // TODO: Adicionar tratamento para outros erros de banco específicos se necessário
    // (ex: nome de produto duplicado dentro da mesma categoria, se essa constraint for adicionada no futuro)
    
    // Para outros erros
    console.error(`Service Produto Error (Criar):`, error.message || error);
    throw new Error(`Erro no serviço ao adicionar produto: ${error.message}`);
  }
};

const buscarProdutosPorRestaurante = async (nomeSchemaDbDoRestaurante) => {
  // Log para desenvolvimento.
  console.log(`Service Produto: Buscando produtos no schema '${nomeSchemaDbDoRestaurante}'`);

  try {
    // Construo a query para selecionar os produtos e também o nome da categoria associada.
    const queryText = `
      SELECT 
        p.id, 
        p.nome, 
        p.descricao, 
        p.preco, 
        p.categoria_id, 
        c.nome AS nome_categoria, 
        p.url_foto, 
        p.ativo, 
        p.ordem_exibicao, 
        p.data_criacao, 
        p.data_atualizacao 
      FROM 
        "${nomeSchemaDbDoRestaurante}".produtos p
      LEFT JOIN 
        "${nomeSchemaDbDoRestaurante}".categorias c ON p.categoria_id = c.id
      ORDER BY 
        c.ordem_exibicao ASC, 
        p.ordem_exibicao ASC, 
        p.nome ASC;
    `;

    const resultado = await db.query(queryText);
    
    console.log(`Service Produto: ${resultado.rows.length} produtos encontrados para o schema '${nomeSchemaDbDoRestaurante}'.`);
    return resultado.rows; // Retorna um array de produtos (pode ser vazio)

  } catch (error) {
    console.error(`Service Produto Error (Buscar Lista): Falha ao buscar produtos no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar lista de produtos: ${error.message}`);
  }
};

const buscarProdutoPorId = async (nomeSchemaDbDoRestaurante, produtoId) => {
  // Log para desenvolvimento.
  console.log(`Service Produto: Buscando produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}'`);

  try {
    // Converto produtoId para inteiro para garantir.
    const idProdutoParaBuscar = parseInt(produtoId, 10);
    if (isNaN(idProdutoParaBuscar)) {
      const error = new Error("ID do produto inválido. Deve ser um número.");
      error.isValidationError = true; // Trato como erro de validação para o controller
      throw error;
    }

    // Construo a query SQL para selecionar o produto e também o nome da categoria associada.
    const queryText = `
      SELECT 
        p.id, 
        p.nome, 
        p.descricao, 
        p.preco, 
        p.categoria_id, 
        c.nome AS nome_categoria, 
        p.url_foto, 
        p.ativo, 
        p.ordem_exibicao, 
        p.data_criacao, 
        p.data_atualizacao 
      FROM 
        "${nomeSchemaDbDoRestaurante}".produtos p
      LEFT JOIN 
        "${nomeSchemaDbDoRestaurante}".categorias c ON p.categoria_id = c.id
      WHERE 
        p.id = $1; 
    `;
    const values = [idProdutoParaBuscar];

    // Executo a query
    const resultado = await db.query(queryText, values);

    // Verifico se o produto foi encontrado
    if (resultado.rowCount === 0) {
      console.log(`Service Produto: Produto ID '${idProdutoParaBuscar}' não encontrado no schema '${nomeSchemaDbDoRestaurante}'.`);
      return null; // Retorno null para o controller tratar como 404.
    }
    
    const produtoEncontrado = resultado.rows[0];
    console.log(`Service Produto: Produto ID ${produtoEncontrado.id} ('${produtoEncontrado.nome}') encontrado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoEncontrado; // Retorno o produto encontrado

  } catch (error) {
    // Se o erro já é uma validação que fizemos (ID inválido)
    if (error.isValidationError) {
        throw error;
    }
    // Para outros erros do banco ou inesperados
    console.error(`Service Produto Error (Buscar por ID): Falha ao buscar produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar produto por ID: ${error.message}`);
  }
};

// Função para modificar um produto existente
const modificarProduto = async (nomeSchemaDbDoRestaurante, produtoId, dadosBrutosUpdate) => {
  console.log(`Service Produto: Modificando produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosUpdate);

  const idProdutoParaModificar = parseInt(produtoId, 10);
  if (isNaN(idProdutoParaModificar)) {
    const error = new Error("ID do produto para atualização é inválido. Deve ser um número.");
    error.isValidationError = true;
    throw error;
  }

  try {
    const dadosUpdateValidados = produtoUpdateSchema.parse(dadosBrutosUpdate);
    console.log(`Service Produto: Dados de atualização validados pelo Zod:`, dadosUpdateValidados);

    const camposParaAtualizar = Object.keys(dadosUpdateValidados);
    if (camposParaAtualizar.length === 0) {
      const error = new Error('Nenhum dado válido fornecido para atualização do produto.');
      error.isZodError = true; 
      throw error;
    }

    if (dadosUpdateValidados.categoria_id !== undefined) {
      const queryVerificaCategoria = `
        SELECT id FROM "${nomeSchemaDbDoRestaurante}".categorias WHERE id = $1;
      `;
      const resultadoCategoria = await db.query(queryVerificaCategoria, [dadosUpdateValidados.categoria_id]);
      if (resultadoCategoria.rowCount === 0) {
        const error = new Error(`Categoria com ID '${dadosUpdateValidados.categoria_id}' não encontrada para associar ao produto.`);
        error.isForeignKeyConstraint = true;
        throw error;
      }
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
    
    setClauses.push(`data_atualizacao = NOW()`);
    values.push(idProdutoParaModificar);

    const queryText = `
      UPDATE "${nomeSchemaDbDoRestaurante}".produtos
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *; 
    `;

    console.log(`Service Produto: Query UPDATE: ${queryText}`);
    console.log(`Service Produto: Values UPDATE:`, values);

    const resultado = await db.query(queryText, values);

    if (resultado.rowCount === 0) {
      const error = new Error(`Produto com ID '${idProdutoParaModificar}' não encontrado no schema '${nomeSchemaDbDoRestaurante}' para atualização.`);
      error.isNotFoundError = true;
      throw error;
    }
    
    const produtoAtualizado = resultado.rows[0];
    console.log(`Service Produto: Produto ID ${produtoAtualizado.id} ('${produtoAtualizado.nome}') atualizado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoAtualizado;

  } catch (error) {
    if (error instanceof z.ZodError) { // Erro vindo do parse do Zod
      console.error('Service Produto Validation Error (Modificar - Zod Instance):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para atualização do produto: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues; // Preserva as issues originais
      throw validationError;
    }
    // Verifica outras flags customizadas que podemos ter setado antes de ser um ZodError real
    if (error.isValidationError || error.isForeignKeyConstraint || error.isNotFoundError || error.isZodError /* para nosso erro customizado de "nenhum dado" */) {
        console.error(`Service Produto Error (Modificar - Erro Sinalizado):`, error.message);
        throw error; 
    }
    
    // TODO: Adicionar tratamento para constraint de nome de produto duplicado, se houver.
    
    console.error(`Service Produto Error (Modificar - Genérico): Falha ao modificar produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao modificar produto: ${error.message}`);
  }
};

// Função para remover um produto existente (IMPLEMENTADA)
const removerProduto = async (nomeSchemaDbDoRestaurante, produtoId) => {
  console.log(`Service Produto: Removendo produto ID '${produtoId}' do schema '${nomeSchemaDbDoRestaurante}'`);

  try {
    const idProdutoParaDeletar = parseInt(produtoId, 10);
    if (isNaN(idProdutoParaDeletar)) {
      const error = new Error("ID do produto inválido para deleção. Deve ser um número.");
      error.isValidationError = true;
      throw error;
    }

    const queryText = `
      DELETE FROM "${nomeSchemaDbDoRestaurante}".produtos 
      WHERE id = $1
      RETURNING id; 
    `;
    const values = [idProdutoParaDeletar];

    const resultado = await db.query(queryText, values);

    if (resultado.rowCount === 0) {
      const error = new Error(`Produto com ID '${idProdutoParaDeletar}' não encontrado no schema '${nomeSchemaDbDoRestaurante}' para deleção.`);
      error.isNotFoundError = true;
      throw error;
    }

    console.log(`Service Produto: Produto ID ${idProdutoParaDeletar} deletado com sucesso do schema '${nomeSchemaDbDoRestaurante}'.`);
    return { message: `Produto ID ${idProdutoParaDeletar} deletado com sucesso.` };

  } catch (error) {
    if (error.isValidationError || error.isNotFoundError) {
        throw error;
    }
    // Não esperamos violação de FK ao deletar produto, a menos que outra tabela o referencie.
    
    console.error(`Service Produto Error (Remover): Falha ao remover produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao remover produto: ${error.message}`);
  }
};

module.exports = {
  criarNovoProduto,
  buscarProdutosPorRestaurante,
  buscarProdutoPorId,
  modificarProduto,
  removerProduto, // Função agora implementada e exportada
};