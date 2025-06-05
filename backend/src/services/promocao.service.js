// backend/src/services/promocao.service.js
const db = require('../config/db');
const { z } = require('zod');

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

// Schema para CRIAR uma promoção (aplica o refine de consistência)
const promocaoCreateSchema = promocaoBaseSchema.refine(data => {
    if (data.tipo_promocao === 'DESCONTO_PERCENTUAL_PRODUTO' && (data.valor_desconto_percentual == null)) {
      return false;
    }
    if (data.tipo_promocao === 'COMBO_PRECO_FIXO' && (data.preco_promocional_combo == null)) {
      return false;
    }
    // TODO: Adicionar mais lógicas de refinamento para PRECO_FIXO_PRODUTO e LEVE_X_PAGUE_Y_PRODUTO
    return true;
  }, {
    message: "Campos de valor da promoção (desconto ou preço do combo) são obrigatórios e devem ser consistentes com o tipo_promocao. Para DESCONTO_PERCENTUAL_PRODUTO, 'valor_desconto_percentual' é obrigatório. Para COMBO_PRECO_FIXO, 'preco_promocional_combo' é obrigatório.",
    path: ['tipo_promocao'], 
  });

// Schema para ATUALIZAR uma promoção (todos os campos são opcionais)
const promocaoUpdateSchema = promocaoBaseSchema.partial();
// A lógica de consistência para update é feita dentro da função modificarPromocao.

const adicionarNovaPromocao = async (nomeSchemaDbDoRestaurante, dadosBrutosPromocao) => {
  console.log(`Service Promoções: Tentando criar nova promoção no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosPromocao);
  try {
    const dadosPromocao = promocaoCreateSchema.parse(dadosBrutosPromocao);
    console.log(`Service Promoções: Dados validados pelo Zod:`, dadosPromocao);
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
      console.error('Service Promoções Validation Error (Criar):', error.issues);
      const formattedErrors = error.issues.map(issue => {
        if (issue.code === 'custom' && (issue.path === undefined || issue.path.length === 0 || issue.path[0] === 'tipo_promocao')) { return issue.message; }
        return `${issue.path.join('.') || 'dados da promoção'}: ${issue.message}`;
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
    const queryText = `
      SELECT * FROM "${nomeSchemaDbDoRestaurante}".promocoes 
      ORDER BY data_inicio DESC, nome_promocao ASC;
    `;
    const resultado = await db.query(queryText);
    console.log(`Service Promoções: ${resultado.rows.length} promoções encontradas.`);
    return resultado.rows;
  } catch (error) {
    console.error(`Service Promoções Error (Buscar Lista):`, error.message || error);
    throw new Error(`Erro no serviço ao buscar lista de promoções: ${error.message}`);
  }
};

const buscarPromocaoPorId = async (nomeSchemaDbDoRestaurante, promocaoId) => {
  console.log(`Service Promoções: Buscando promoção ID '${promocaoId}' no schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const idPromocaoParaBuscar = parseInt(promocaoId, 10);
    if (isNaN(idPromocaoParaBuscar)) {
      const error = new Error("ID da promoção inválido. Deve ser um número.");
      error.isValidationError = true;
      throw error;
    }
    const queryText = `SELECT * FROM "${nomeSchemaDbDoRestaurante}".promocoes WHERE id = $1;`;
    const values = [idPromocaoParaBuscar];
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      console.log(`Service Promoções: Promoção ID '${idPromocaoParaBuscar}' não encontrada.`);
      return null;
    }
    const promocaoEncontrada = resultado.rows[0];
    console.log(`Service Promoções: Promoção ID ${promocaoEncontrada.id} ('${promocaoEncontrada.nome_promocao}') encontrada.`);
    return promocaoEncontrada;
  } catch (error) {
    if (error.isValidationError) throw error;
    console.error(`Service Promoções Error (Buscar por ID):`, error.message || error);
    throw new Error(`Erro no serviço ao buscar promoção por ID: ${error.message}`);
  }
};

const modificarPromocao = async (nomeSchemaDbDoRestaurante, promocaoId, dadosBrutosUpdate) => {
  console.log(`Service Promoções: Modificando promoção ID '${promocaoId}' com dados brutos:`, dadosBrutosUpdate);
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
      const error = new Error('Nenhum dado válido fornecido para atualização da promoção.');
      error.isZodError = true; 
      throw error;
    }
    if (dadosUpdateValidados.tipo_promocao || 
        dadosUpdateValidados.valor_desconto_percentual !== undefined || 
        dadosUpdateValidados.preco_promocional_combo !== undefined) {
      const promocaoAtual = await buscarPromocaoPorId(nomeSchemaDbDoRestaurante, idPromocaoParaModificar);
      if (!promocaoAtual) {
        const error = new Error(`Promoção com ID '${idPromocaoParaModificar}' não encontrada para verificar consistência.`);
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
    const queryText = `
      UPDATE "${nomeSchemaDbDoRestaurante}".promocoes
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} RETURNING *;`;
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      const error = new Error(`Promoção com ID '${idPromocaoParaModificar}' não encontrada para atualização.`);
      error.isNotFoundError = true;
      throw error;
    }
    const promocaoAtualizada = resultado.rows[0];
    console.log(`Service Promoções: Promoção ID ${promocaoAtualizada.id} atualizada.`);
    return promocaoAtualizada;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Promoções Validation Error (Modificar):', error.issues);
      const formattedErrors = error.issues.map(issue => {
        if (issue.code === 'custom' && (issue.path === undefined || issue.path.length === 0 || issue.path[0] === 'tipo_promocao')) { return issue.message; }
        return `${issue.path.join('.') || 'dados da promoção'}: ${issue.message}`;
      }).join('; ');
      const validationError = new Error(`Erro de validação para atualização da promoção: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues;
      throw validationError;
    }
    if (error.isValidationError || error.isNotFoundError || error.isZodError) {
        console.error(`Service Promoções Error (Modificar - Sinalizado):`, error.message);
        throw error; 
    }
    console.error(`Service Promoções Error (Modificar - Genérico):`, error.message || error);
    throw new Error(`Erro no serviço ao modificar promoção: ${error.message}`);
  }
};

const removerPromocao = async (nomeSchemaDbDoRestaurante, promocaoId) => {
  console.log(`Service Promoções: Removendo promoção ID '${promocaoId}' do schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const idPromocaoParaDeletar = parseInt(promocaoId, 10);
    if (isNaN(idPromocaoParaDeletar)) {
      const error = new Error("ID da promoção inválido para deleção. Deve ser um número.");
      error.isValidationError = true;
      throw error;
    }
    const queryText = `DELETE FROM "${nomeSchemaDbDoRestaurante}".promocoes WHERE id = $1 RETURNING id;`;
    const values = [idPromocaoParaDeletar];
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      const error = new Error(`Promoção com ID '${idPromocaoParaDeletar}' não encontrada para deleção.`);
      error.isNotFoundError = true;
      throw error;
    }
    console.log(`Service Promoções: Promoção ID ${idPromocaoParaDeletar} deletada com sucesso.`);
    return { message: `Promoção ID ${idPromocaoParaDeletar} deletada com sucesso.` };
  } catch (error) {
    if (error.isValidationError || error.isNotFoundError) {
        throw error;
    }
    if (error.code === '23503') { 
      console.error(`Service Promoções DB Error (Remover): Tentativa de deletar promoção ID '${promocaoId}' que possui dependências.`);
      const fkError = new Error('Esta promoção não pode ser deletada, pois está sendo referenciada por outros itens.');
      fkError.isForeignKeyViolation = true; 
      throw fkError;
    }
    console.error(`Service Promoções Error (Remover):`, error.message || error);
    throw new Error(`Erro no serviço ao remover promoção: ${error.message}`);
  }
};

// Esqueleto da função para vincular produto à promoção
const vincularProdutoAPromocao = async (nomeSchemaDbDoRestaurante, promocaoId, dadosVinculoProduto) => {
  console.log(`Service Promoções: Vinculando produto à promoção ID '${promocaoId}' com dados:`, dadosVinculoProduto);
  // TODO: Implementar schema Zod para dadosVinculoProduto
  // TODO: Validar promocaoId e dadosVinculoProduto
  // TODO: Verificar se promocaoId existe
  // TODO: Verificar se produto_id existe no schema do restaurante
  // TODO: Verificar se tipo_promocao é compatível
  // TODO: Inserir em "${nomeSchemaDbDoRestaurante}".promocao_produtos
  // TODO: Tratar erro de UNIQUE (promocao_id, produto_id)
  console.warn(`Service Promoções: A função vincularProdutoAPromocao ainda é um stub.`);
  const idPromo = parseInt(promocaoId, 10);
  if (!isNaN(idPromo) && idPromo > 0 && dadosVinculoProduto && dadosVinculoProduto.produto_id) {
      return { 
        id: Date.now(),
        promocao_id: idPromo,
        ...dadosVinculoProduto,
        message: `Produto ID '${dadosVinculoProduto.produto_id}' pronto para ser VINCULADO à Promoção ID '${idPromo}' (stub)` 
      };
  }
  const error = new Error(isNaN(idPromo) ? "ID da promoção inválido (stub)." : `Dados do produto para vínculo inválidos (stub).`);
  throw error; 
};

module.exports = {
  adicionarNovaPromocao,
  buscarPromocoesPorRestaurante,
  buscarPromocaoPorId,
  modificarPromocao,
  removerPromocao,
  vincularProdutoAPromocao,
};