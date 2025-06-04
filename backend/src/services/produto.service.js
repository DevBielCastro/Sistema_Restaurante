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
      error.isForeignKeyConstraint = true; // Flag para o controller tratar como 400 ou 404
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

// Função para buscar todos os produtos de um restaurante específico
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

// Nova função (stub) para buscar um produto específico por ID
const buscarProdutoPorId = async (nomeSchemaDbDoRestaurante, produtoId) => {
  // Log para desenvolvimento.
  console.log(`Service Produto: Buscando produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}'`);

  // Converto produtoId para inteiro para garantir.
  const idProdutoParaBuscar = parseInt(produtoId, 10);
  if (isNaN(idProdutoParaBuscar)) {
    const error = new Error("ID do produto inválido.");
    error.isValidationError = true; // Trato como erro de validação para o controller
    throw error;
  }

  // TODO:
  // 1. Construir a query SQL para selecionar o produto da tabela 'produtos'
  //    DENTRO do schema do restaurante, ONDE id = $1.
  //    Ex: SELECT p.*, c.nome as nome_categoria 
  //        FROM "${nomeSchemaDbDoRestaurante}".produtos p
  //        LEFT JOIN "${nomeSchemaDbDoRestaurante}".categorias c ON p.categoria_id = c.id
  //        WHERE p.id = $1;
  // 2. Executar a query.
  // 3. Se resultado.rowCount === 0, o produto não foi encontrado (retornar null ou lançar erro "não encontrado" com flag).
  // 4. Retornar o produto encontrado (resultado.rows[0]).

  // Retorno provisório
  console.warn(`Service Produto: A função buscarProdutoPorId ('${produtoId}') ainda é um stub e retornará dados mockados se ID for 1.`);
  if (idProdutoParaBuscar === 1) { // Simula encontrar o produto com ID 1
      return { 
          id: 1, 
          nome: "Produto Encontrado Stub " + idProdutoParaBuscar, 
          preco: "10.99", 
          categoria_id: 1, 
          nome_categoria: "Categoria Stub 1 do Schema " + nomeSchemaDbDoRestaurante 
        };
  }
  return null; // Simula não encontrar para outros IDs
};


module.exports = {
  criarNovoProduto,
  buscarProdutosPorRestaurante,
  buscarProdutoPorId, // Adicionada a nova função (ainda stubbed) aos exports
  // TODO: Adicionar outros serviços para produtos (atualizar, deletar)
};