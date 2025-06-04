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

const promocaoCreateSchema = z.object({
  nome_promocao: z.string({
    required_error: "O nome da promoção é obrigatório.",
  }).min(3, { message: "O nome da promoção deve ter pelo menos 3 caracteres." }),
  descricao_promocao: z.string().min(3, { message: "A descrição da promoção deve ter pelo menos 3 caracteres, se fornecida."}).optional().nullable(),
  tipo_promocao: TiposPromocaoEnum,
  valor_desconto_percentual: z.number().positive().max(100).multipleOf(0.01, {message: "O valor de desconto percentual deve ter no máximo duas casas decimais."}).optional().nullable(),
  preco_promocional_combo: z.number().positive().multipleOf(0.01, {message: "O preço promocional do combo deve ter no máximo duas casas decimais."}).optional().nullable(),
  data_inicio: z.string({ required_error: "A data de início é obrigatória."})
                  .refine((val) => !isNaN(Date.parse(val)), { message: "Data de início inválida (use formato ISO como YYYY-MM-DDTHH:MM:SSZ)."}),
  data_fim: z.string()
                .refine((val) => !isNaN(Date.parse(val)), { message: "Data de fim inválida (use formato ISO como YYYY-MM-DDTHH:MM:SSZ)." })
                .optional()
                .nullable(),
  ativo: z.boolean().optional().default(true),
})
.refine(data => {
    if (data.tipo_promocao === 'DESCONTO_PERCENTUAL_PRODUTO' && (data.valor_desconto_percentual == null)) {
      return false;
    }
    if (data.tipo_promocao === 'COMBO_PRECO_FIXO' && (data.preco_promocional_combo == null)) {
      return false;
    }
    return true;
  }, {
    message: "Campos de valor da promoção (desconto ou preço do combo) são obrigatórios e devem ser consistentes com o tipo_promocao. Para DESCONTO_PERCENTUAL_PRODUTO, 'valor_desconto_percentual' é obrigatório. Para COMBO_PRECO_FIXO, 'preco_promocional_combo' é obrigatório.",
    path: ['tipo_promocao'], 
  });


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
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *; 
    `;
    const values = [
      nome_promocao,
      descricao_promocao,
      tipo_promocao,
      valor_desconto_percentual,
      preco_promocional_combo,
      data_inicio, 
      data_fim,    
      ativo,
    ];

    const resultado = await db.query(queryText, values);
    const promocaoCriada = resultado.rows[0];

    if (!promocaoCriada) {
      throw new Error('Falha ao criar a promoção, nenhum dado retornado pelo banco.');
    }

    console.log(`Service Promoções: Promoção ID ${promocaoCriada.id} ('${promocaoCriada.nome_promocao}') criada com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return promocaoCriada;

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Promoções Validation Error:', error.issues);
      const formattedErrors = error.issues.map(issue => {
        if (issue.code === 'custom' && (issue.path === undefined || issue.path.length === 0)) {
            return issue.message;
        }
        return `${issue.path.join('.') || 'dados da promoção'}: ${issue.message}`;
      }).join('; ');
      const validationError = new Error(`Erro de validação para promoção: ${formattedErrors}`);
      validationError.isZodError = true;
      validationError.issues = error.issues;
      throw validationError;
    }
    // TODO: Adicionar tratamento para UNIQUE constraint no nome_promocao se necessário
    
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
    console.log(`Service Promoções: ${resultado.rows.length} promoções encontradas para o schema '${nomeSchemaDbDoRestaurante}'.`);
    return resultado.rows;
  } catch (error) {
    console.error(`Service Promoções Error (Buscar Lista): Falha ao buscar promoções no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar lista de promoções: ${error.message}`);
  }
};

// Função para buscar uma promoção específica por ID (AGORA IMPLEMENTADA)
const buscarPromocaoPorId = async (nomeSchemaDbDoRestaurante, promocaoId) => {
  // Log para desenvolvimento.
  console.log(`Service Promoções: Buscando promoção ID '${promocaoId}' no schema '${nomeSchemaDbDoRestaurante}'`);

  try {
    // Converto promocaoId para inteiro para garantir.
    const idPromocaoParaBuscar = parseInt(promocaoId, 10);
    if (isNaN(idPromocaoParaBuscar)) {
      const error = new Error("ID da promoção inválido. Deve ser um número.");
      error.isValidationError = true; // Trato como erro de validação para o controller
      throw error;
    }

    // Construo a query SQL para selecionar a promoção específica.
    const queryText = `
      SELECT * FROM "${nomeSchemaDbDoRestaurante}".promocoes 
      WHERE id = $1; 
    `;
    // Não estamos fazendo JOIN com promocao_produtos aqui ainda.
    // Isso pode ser uma melhoria futura se quisermos retornar os produtos do combo junto.
    const values = [idPromocaoParaBuscar];

    // Executo a query
    const resultado = await db.query(queryText, values);

    // Verifico se a promoção foi encontrada
    if (resultado.rowCount === 0) {
      // Se nenhuma linha foi retornada, a promoção com o ID fornecido não existe.
      console.log(`Service Promoções: Promoção ID '${idPromocaoParaBuscar}' não encontrada no schema '${nomeSchemaDbDoRestaurante}'.`);
      return null; // Retorno null para o controller tratar como 404.
    }
    
    const promocaoEncontrada = resultado.rows[0];
    console.log(`Service Promoções: Promoção ID ${promocaoEncontrada.id} ('${promocaoEncontrada.nome_promocao}') encontrada com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return promocaoEncontrada; // Retorno a promoção encontrada

  } catch (error) {
    // Se o erro já é uma validação que fizemos (ID inválido)
    if (error.isValidationError) {
        throw error;
    }
    // Para outros erros do banco ou inesperados
    console.error(`Service Promoções Error (Buscar por ID): Falha ao buscar promoção ID '${promocaoId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar promoção por ID: ${error.message}`);
  }
};

module.exports = {
  adicionarNovaPromocao,
  buscarPromocoesPorRestaurante,
  buscarPromocaoPorId, // Função agora implementada e exportada
  // TODO: Adicionar outros serviços para promoções (atualizar, deletar, associar produtos)
};