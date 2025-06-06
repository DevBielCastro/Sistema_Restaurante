// backend/src/services/promocao.service.js
const db = require('../config/db');
const { z } = require('zod');

// --- Schemas Zod para Promoção (TiposPromocaoEnum, promocaoBaseSchema, promocaoCreateSchema, promocaoUpdateSchema) ---
const TiposPromocaoEnum = z.enum([
  'DESCONTO_PERCENTUAL_PRODUTO', 
  'PRECO_FIXO_PRODUTO', 
  'COMBO_PRECO_FIXO', 
  'LEVE_X_PAGUE_Y_PRODUTO'
], {
  required_error: "O tipo_promocao é obrigatório.",
  invalid_type_error: "Tipo de promoção inválido. Valores permitidos: DESCONTO_PERCENTUAL_PRODUTO, PRECO_FIXO_PRODUTO, COMBO_PRECO_FIXO, LEVE_X_PAGUE_Y_PRODUTO"
});

const promocaoBaseSchema = z.object({
  nome_promocao: z.string({
    required_error: "O nome da promoção é obrigatório.",
    invalid_type_error: "O nome da promoção deve ser um texto.",
  }).min(3, { message: "O nome da promoção deve ter pelo menos 3 caracteres." }),

  descricao_promocao: z.string()
    .min(3, { message: "A descrição da promoção deve ter pelo menos 3 caracteres, se fornecida."})
    .optional()
    .nullable(),

  tipo_promocao: TiposPromocaoEnum,

  valor_desconto_percentual: z.number({
    invalid_type_error: "O valor de desconto percentual deve ser um número.",
  }).positive({message: "O valor de desconto percentual deve ser positivo."}).max(100, {message: "O valor de desconto percentual não pode ultrapassar 100."}).multipleOf(0.01, {message: "O valor de desconto percentual deve ter no máximo duas casas decimais."}).optional().nullable(),
  
  preco_promocional_combo: z.number({
    invalid_type_error: "O preço promocional do combo deve ser um número.",
  }).positive({message: "O preço promocional do combo deve ser positivo."}).multipleOf(0.01, {message: "O preço promocional do combo deve ter no máximo duas casas decimais."}).optional().nullable(),
  
  data_inicio: z.string({ required_error: "A data de início é obrigatória."})
                      .refine((val) => !isNaN(Date.parse(val)), { message: "Data de início inválida (use formato ISO como YYYY-MM-DDTHH:MM:SSZ)."}),
  
  data_fim: z.string()
                      .refine((val) => !isNaN(Date.parse(val)), { message: "Data de fim inválida (use formato ISO como YYYY-MM-DDTHH:MM:SSZ)." })
                      .optional()
                      .nullable(),
  
  ativo: z.boolean({
    invalid_type_error: "O campo 'ativo' deve ser um valor booleano (true ou false)."
  }).optional().default(true),
});

const promocaoCreateSchema = promocaoBaseSchema.refine(data => {
    if (data.tipo_promocao === 'DESCONTO_PERCENTUAL_PRODUTO' && (data.valor_desconto_percentual == null)) return false;
    if (data.tipo_promocao === 'COMBO_PRECO_FIXO' && (data.preco_promocional_combo == null)) return false;
    return true;
  }, {
    message: "Campos de valor da promoção (desconto ou preço do combo) são obrigatórios e devem ser consistentes com o tipo_promocao. Para DESCONTO_PERCENTUAL_PRODUTO, 'valor_desconto_percentual' é obrigatório. Para COMBO_PRECO_FIXO, 'preco_promocional_combo' é obrigatório.",
    path: ['tipo_promocao'], 
  });

const promocaoUpdateSchema = promocaoBaseSchema.partial();

// Schema Zod para validar os dados ao vincular um produto a uma promoção
const promocaoProdutoVinculoSchema = z.object({
  produto_id: z.number({
    required_error: "O ID do produto é obrigatório para o vínculo.",
    invalid_type_error: "O ID do produto deve ser um número.",
  }).int().positive({ message: "O ID do produto deve ser um número inteiro positivo." }),

  quantidade_no_combo: z.number({
    invalid_type_error: "A quantidade no combo deve ser um número.",
  })
  .int({ message: "A quantidade no combo deve ser um número inteiro." })
  .positive({ message: "A quantidade no combo deve ser positiva." })
  .optional()
  .default(1),

  preco_promocional_produto_individual: z.number({
    invalid_type_error: "O preço promocional individual deve ser um número.",
  })
  .positive({ message: "O preço promocional individual deve ser positivo." })
  .multipleOf(0.01, { message: "O preço promocional individual deve ter no máximo duas casas decimais." })
  .optional()
  .nullable(),
});

const adicionarNovaPromocao = async (nomeSchemaDbDoRestaurante, dadosBrutosPromocao) => {
  console.log(`Service Promoções: Tentando criar nova promoção no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosPromocao);
  try {
    const dadosPromocao = promocaoCreateSchema.parse(dadosBrutosPromocao);
    const {
      nome_promocao, descricao_promocao, tipo_promocao,
      valor_desconto_percentual, preco_promocional_combo,
      data_inicio, data_fim, ativo,
    } = dadosPromocao;
    const queryText = `
      INSERT INTO "${nomeSchemaDbDoRestaurante}".promocoes 
        (nome_promocao, descricao_promocao, tipo_promocao, valor_desconto_percentual, 
         preco_promocional_combo, data_inicio, data_fim, ativo) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *; 
    `;
    const values = [
      nome_promocao, descricao_promocao, tipo_promocao,
      valor_desconto_percentual, preco_promocional_combo,
      data_inicio, data_fim, ativo,
    ];
    const resultado = await db.query(queryText, values);
    const promocaoCriada = resultado.rows[0];
    if (!promocaoCriada) {
      throw new Error('Falha ao criar a promoção, nenhum dado retornado pelo banco.');
    }
    console.log(`Service Promoções: Promoção ID ${promocaoCriada.id} ('${promocaoCriada.nome_promocao}') criada com sucesso.`);
    return promocaoCriada;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map(issue => {
        if (issue.code === 'custom' && (issue.path === undefined || issue.path.length === 0)) {
            return issue.message;
        }
        return `${issue.path.join('.') || 'promoção'}: ${issue.message}`;
      }).join('; ');
      const validationError = new Error(`Erro de validação para promoção: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues;
      throw validationError;
    }
    console.error(`Service Promoções Error (Criar):`, error.message || error);
    throw new Error(`Erro no serviço ao adicionar promoção: ${error.message}`);
  }
};

const buscarPromocoesPorRestaurante = async (nomeSchemaDbDoRestaurante) => {
  console.log(`Service Promoções: Buscando promoções no schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const queryText = `SELECT * FROM "${nomeSchemaDbDoRestaurante}".promocoes ORDER BY data_inicio DESC, nome_promocao ASC;`;
    const resultado = await db.query(queryText);
    console.log(`Service Promoções: ${resultado.rows.length} promoções encontradas.`);
    return resultado.rows;
  } catch (error) {
    console.error(`Service Promoções Error (Buscar Lista):`, error.message || error);
    throw new Error(`Erro no serviço ao buscar lista de promoções: ${error.message}`);
  }
};

const buscarPromocaoPorId = async (nomeSchemaDbDoRestaurante, promocaoId) => {
  console.log(`Service Promoções: Buscando promoção ID '${promocaoId}'...`);
  try {
    const idPromocaoParaBuscar = parseInt(promocaoId, 10);
    if (isNaN(idPromocaoParaBuscar)) {
      const error = new Error("ID da promoção inválido.");
      error.isValidationError = true;
      throw error;
    }
    const queryText = `SELECT * FROM "${nomeSchemaDbDoRestaurante}".promocoes WHERE id = $1;`;
    const resultado = await db.query(queryText, [idPromocaoParaBuscar]);
    if (resultado.rowCount === 0) {
      return null;
    }
    return resultado.rows[0];
  } catch (error) {
    if (error.isValidationError) throw error;
    console.error(`Service Promoções Error (Buscar por ID):`, error.message);
    throw new Error(`Erro no serviço ao buscar promoção por ID.`);
  }
};

const modificarPromocao = async (nomeSchemaDbDoRestaurante, promocaoId, dadosBrutosUpdate) => {
  console.log(`Service Promoções: Modificando promoção ID '${promocaoId}'...`);
  const idPromocaoParaModificar = parseInt(promocaoId, 10);
  if (isNaN(idPromocaoParaModificar)) {
    const error = new Error("ID da promoção para atualização é inválido.");
    error.isValidationError = true;
    throw error;
  }
  try {
    const dadosUpdateValidados = promocaoUpdateSchema.parse(dadosBrutosUpdate);
    const camposParaAtualizar = Object.keys(dadosUpdateValidados);
    if (camposParaAtualizar.length === 0) {
      const error = new Error('Nenhum dado válido fornecido para atualização.');
      error.isZodError = true;
      throw error;
    }
    if (dadosUpdateValidados.tipo_promocao || dadosUpdateValidados.valor_desconto_percentual !== undefined || dadosUpdateValidados.preco_promocional_combo !== undefined) {
      const promocaoAtual = await buscarPromocaoPorId(nomeSchemaDbDoRestaurante, idPromocaoParaModificar);
      if (!promocaoAtual) {
        const error = new Error(`Promoção com ID '${idPromocaoParaModificar}' não encontrada.`);
        error.isNotFoundError = true;
        throw error;
      }
      const dadosCompletosParaValidacao = { ...promocaoAtual, ...dadosUpdateValidados };
      promocaoCreateSchema.parse(dadosCompletosParaValidacao);
      console.log('Service Promoções: Validação de consistência para update passou.');
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
    values.push(idPromocaoParaModificar);
    const queryText = `UPDATE "${nomeSchemaDbDoRestaurante}".promocoes SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *;`;
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      const error = new Error(`Promoção com ID '${idPromocaoParaModificar}' não encontrada para atualização.`);
      error.isNotFoundError = true;
      throw error;
    }
    return resultado.rows[0];
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map(issue => issue.code === 'custom' ? issue.message : `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues;
      throw validationError;
    }
    if (error.isValidationError || error.isNotFoundError) {
      throw error;
    }
    console.error(`Service Promoções Error (Modificar):`, error.message);
    throw new Error(`Erro no serviço ao modificar promoção.`);
  }
};

const removerPromocao = async (nomeSchemaDbDoRestaurante, promocaoId) => {
  console.log(`Service Promoções: Removendo promoção ID '${promocaoId}'...`);
  try {
    const idPromocaoParaDeletar = parseInt(promocaoId, 10);
    if (isNaN(idPromocaoParaDeletar)) {
      const error = new Error("ID da promoção inválido.");
      error.isValidationError = true;
      throw error;
    }
    const queryText = `DELETE FROM "${nomeSchemaDbDoRestaurante}".promocoes WHERE id = $1 RETURNING id;`;
    const resultado = await db.query(queryText, [idPromocaoParaDeletar]);
    if (resultado.rowCount === 0) {
      const error = new Error(`Promoção com ID '${idPromocaoParaDeletar}' não encontrada.`);
      error.isNotFoundError = true;
      throw error;
    }
    console.log(`Service Promoções: Promoção ID ${idPromocaoParaDeletar} deletada.`);
    return { message: `Promoção ID ${idPromocaoParaDeletar} deletada com sucesso.` };
  } catch (error) {
    if (error.isValidationError || error.isNotFoundError) {
      throw error;
    }
    if (error.code === '23503') {
      const fkError = new Error('Esta promoção não pode ser deletada, pois é referenciada.');
      fkError.isForeignKeyViolation = true;
      throw fkError;
    }
    console.error(`Service Promoções Error (Remover):`, error.message);
    throw new Error(`Erro no serviço ao remover promoção.`);
  }
};

const vincularProdutoAPromocao = async (nomeSchemaDbDoRestaurante, promocaoIdParam, dadosBrutosVinculo) => {
  console.log(`Service Promoções: Vinculando produto à promoção ID '${promocaoIdParam}' com dados:`, dadosBrutosVinculo);
  try {
    const idPromocao = parseInt(promocaoIdParam, 10);
    if (isNaN(idPromocao)) {
      const error = new Error("ID da promoção na URL é inválido.");
      error.isValidationError = true;
      throw error;
    }

    const dadosVinculoProduto = promocaoProdutoVinculoSchema.parse(dadosBrutosVinculo);
    console.log(`Service Promoções: Dados de vínculo validados pelo Zod:`, dadosVinculoProduto);

    const { produto_id, quantidade_no_combo, preco_promocional_produto_individual } = dadosVinculoProduto;

    const [promocaoExistenteResult, produtoExistenteResult] = await Promise.all([
        db.query(`SELECT tipo_promocao FROM "${nomeSchemaDbDoRestaurante}".promocoes WHERE id = $1;`, [idPromocao]),
        db.query(`SELECT id FROM "${nomeSchemaDbDoRestaurante}".produtos WHERE id = $1;`, [produto_id])
    ]);
    
    if (promocaoExistenteResult.rowCount === 0) {
        const error = new Error(`Promoção com ID '${idPromocao}' não encontrada neste restaurante.`);
        error.isNotFoundError = true;
        throw error;
    }
    if (produtoExistenteResult.rowCount === 0) {
        const error = new Error(`Produto com ID '${produto_id}' não encontrado no cardápio deste restaurante.`);
        error.isReferencedResourceNotFound = true;
        throw error;
    }

    const tipoPromocao = promocaoExistenteResult.rows[0].tipo_promocao;
    if (tipoPromocao === 'PRECO_FIXO_PRODUTO' && preco_promocional_produto_individual == null) {
        const error = new Error(`Para promoções do tipo 'PRECO_FIXO_PRODUTO', o 'preco_promocional_produto_individual' é obrigatório no vínculo.`);
        error.isBusinessLogicError = true;
        throw error;
    }
    if (tipoPromocao !== 'PRECO_FIXO_PRODUTO' && preco_promocional_produto_individual != null) {
        const error = new Error(`O campo 'preco_promocional_produto_individual' só é permitido para promoções do tipo 'PRECO_FIXO_PRODUTO'.`);
        error.isBusinessLogicError = true;
        throw error;
    }

    const queryText = `
      INSERT INTO "${nomeSchemaDbDoRestaurante}".promocao_produtos
        (promocao_id, produto_id, quantidade_no_combo, preco_promocional_produto_individual)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [idPromocao, produto_id, quantidade_no_combo, preco_promocional_produto_individual];
    const resultado = await db.query(queryText, values);
    const vinculoCriado = resultado.rows[0];

    if (!vinculoCriado) {
      throw new Error('Falha ao vincular produto à promoção.');
    }

    console.log(`Service Promoções: Produto ID ${produto_id} vinculado com sucesso à Promoção ID ${idPromocao}.`);
    return vinculoCriado;
  } catch (error) {
    if (error.code === '23505' && error.constraint?.includes('promocao_produtos_promocao_id_produto_id_key')) {
      const uniqueError = new Error(`O produto com ID '${dadosBrutosVinculo.produto_id}' já está associado a esta promoção.`);
      uniqueError.isConflictError = true;
      throw uniqueError;
    }
    if (error instanceof z.ZodError || error.isValidationError || error.isNotFoundError || error.isReferencedResourceNotFound || error.isBusinessLogicError || error.isConflictError) {
      if (error instanceof z.ZodError) {
          const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
          const validationError = new Error(`Erro de validação ao vincular produto: ${formattedErrors}`);
          validationError.isZodError = true;
          validationError.issues = error.issues;
          throw validationError;
      }
      console.error(`Service Promoções Error (Vincular Produto - Sinalizado):`, error.message);
      throw error;
    }
    
    console.error(`Service Promoções Error (Vincular Produto - Genérico):`, error.message);
    throw new Error(`Erro no serviço ao vincular produto à promoção.`);
  }
};

/**
 * Desvincula um produto de uma promoção específica.
 * @param {string} nomeSchemaDbDoRestaurante - O nome do schema do banco de dados do restaurante.
 * @param {string|number} promocaoId - O ID da promoção da qual o produto será desvinculado.
 * @param {string|number} produtoId - O ID do produto a ser desvinculado.
 * @returns {Promise<object>} Uma mensagem de sucesso.
 * @throws {Error} Lança um erro se os IDs forem inválidos, se o vínculo não for encontrado ou se ocorrer um erro no banco de dados.
 */
const removerProdutoDaPromocao = async (nomeSchemaDbDoRestaurante, promocaoId, produtoId) => {
  console.log(`Service Promoções: Desvinculando produto ID '${produtoId}' da promoção ID '${promocaoId}'...`);
  try {
    const idPromocao = parseInt(promocaoId, 10);
    const idProduto = parseInt(produtoId, 10);

    if (isNaN(idPromocao) || isNaN(idProduto)) {
      const error = new Error("IDs da promoção e/ou do produto são inválidos.");
      error.isValidationError = true;
      throw error;
    }

    const queryText = `
      DELETE FROM "${nomeSchemaDbDoRestaurante}".promocao_produtos
      WHERE promocao_id = $1 AND produto_id = $2
      RETURNING promocao_id, produto_id;
    `;
    
    const resultado = await db.query(queryText, [idPromocao, idProduto]);

    if (resultado.rowCount === 0) {
      const error = new Error(`Vínculo entre a promoção ID '${idPromocao}' e o produto ID '${idProduto}' não encontrado.`);
      error.isNotFoundError = true;
      throw error;
    }

    console.log(`Service Promoções: Produto ID ${idProduto} desvinculado com sucesso da Promoção ID ${idPromocao}.`);
    return { message: `Produto ID ${idProduto} desvinculado com sucesso da Promoção ID ${idPromocao}.` };

  } catch (error) {
    if (error.isValidationError || error.isNotFoundError) {
      throw error;
    }
    console.error(`Service Promoções Error (Desvincular Produto):`, error.message);
    throw new Error(`Erro no serviço ao desvincular produto da promoção.`);
  }
};


module.exports = {
  adicionarNovaPromocao,
  buscarPromocoesPorRestaurante,
  buscarPromocaoPorId,
  modificarPromocao,
  removerPromocao,
  vincularProdutoAPromocao,
  removerProdutoDaPromocao, // <-- Função adicionada e exportada
};