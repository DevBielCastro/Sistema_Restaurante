// backend/src/services/produto.service.js
const db = require('../config/db'); // Certifique-se que esta linha está descomentada
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
  console.log(`Service Produto: Criando novo produto no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosProduto);

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
      // Se a categoria não for encontrada, lanço um erro específico.
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
      // Segurança extra
      throw new Error('Falha ao criar o produto, nenhum dado retornado pelo banco.');
    }

    console.log(`Service Produto: Produto ID ${produtoCriado.id} ('${produtoCriado.nome}') criado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoCriado; // Retorno o produto completo como veio do banco

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Produto Validation Error:', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para produto: ${formattedErrors}`);
      validationError.isZodError = true;
      throw validationError;
    }
    if (error.isForeignKeyConstraint) { // Erro que lançamos se a categoria não existe
        throw error; // Relanço para o controller tratar
    }
    // TODO: Adicionar tratamento para outros erros de banco específicos se necessário (ex: nome de produto duplicado, se houver essa constraint)
    
    console.error(`Service Produto Error (Criar):`, error.message || error);
    throw new Error(`Erro no serviço ao adicionar produto: ${error.message}`);
  }
};

module.exports = {
  criarNovoProduto,
  // TODO: Adicionar outros serviços para produtos (listar, obter por id, atualizar, deletar)
};