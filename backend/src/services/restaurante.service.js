// backend/src/services/restaurante.service.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { z } = require('zod');

// Schema Zod para a CRIAÇÃO de um restaurante
const restauranteCreateSchema = z.object({
  identificador_url: z.string().min(3).regex(/^[a-z0-9_]+$/),
  nome_fantasia: z.string().min(2),
  email_responsavel: z.string().email(),
  senha_responsavel: z.string().min(8),
  nome_schema_db: z.string().min(3).regex(/^[a-z0-9_]+$/),
  razao_social: z.string().min(2).optional().nullable(),
  cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "Formato de CNPJ inválido.").optional().nullable(),
  endereco_completo: z.string().min(5).optional().nullable(),
  telefone_contato: z.string().min(8).optional().nullable(),
  path_logo: z.string().url().optional().nullable(),
  cor_primaria_hex: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/).optional().nullable(),
  cor_secundaria_hex: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/).optional().nullable(),
});

// Schema Zod para ATUALIZAÇÃO dos dados do restaurante
const restauranteUpdateSchema = z.object({
  nome_fantasia: z.string().min(2),
  razao_social: z.string().min(2).optional().nullable(),
  cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, "Formato de CNPJ inválido.").optional().nullable(),
  endereco_completo: z.string().min(5).optional().nullable(),
  telefone_contato: z.string().min(8).optional().nullable(),
  path_logo: z.string().url().optional().nullable(),
  cor_primaria_hex: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/).optional().nullable(),
  cor_secundaria_hex: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/).optional().nullable(),
}).partial();


const criarNovoRestaurante = async (dadosBrutosRestaurante) => {
  console.log('Service Restaurante: Tentando criar restaurante com dados brutos:', dadosBrutosRestaurante);

  try {
    const dadosRestaurante = restauranteCreateSchema.parse(dadosBrutosRestaurante);
    console.log('Service Restaurante: Dados validados pelo Zod:', dadosRestaurante);

    const {
      identificador_url, nome_fantasia, email_responsavel, senha_responsavel,
      nome_schema_db, razao_social, cnpj, endereco_completo, telefone_contato,
      path_logo, cor_primaria_hex, cor_secundaria_hex,
    } = dadosRestaurante;

    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const saltRounds = 10;
      const hash_senha_responsavel = await bcrypt.hash(senha_responsavel, saltRounds);

      const queryInsertRestaurante = `
        INSERT INTO public.restaurantes (
          identificador_url, nome_fantasia, razao_social, cnpj,
          endereco_completo, telefone_contato, path_logo, cor_primaria_hex,
          cor_secundaria_hex, nome_schema_db, email_responsavel, hash_senha_responsavel
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, identificador_url, nome_fantasia, email_responsavel, nome_schema_db, ativo, data_criacao;
      `;
      const valuesInsertRestaurante = [
        identificador_url, nome_fantasia, razao_social, cnpj,
        endereco_completo, telefone_contato, path_logo, cor_primaria_hex,
        cor_secundaria_hex, nome_schema_db, email_responsavel, hash_senha_responsavel,
      ];
      const resultadoRestaurante = await client.query(queryInsertRestaurante, valuesInsertRestaurante);
      const novoRestaurante = resultadoRestaurante.rows[0];

      if (!novoRestaurante) {
        throw new Error('Falha ao inserir os dados do restaurante na tabela principal.');
      }

      const queryCreateSchema = `CREATE SCHEMA IF NOT EXISTS "${nome_schema_db}";`;
      await client.query(queryCreateSchema);

      await client.query(`SET search_path TO "${nome_schema_db}", public;`);

      const ddlTriggerFunction = `
        CREATE OR REPLACE FUNCTION atualizar_data_atualizacao_tenant_tables()
        RETURNS TRIGGER AS $$
        BEGIN NEW.data_atualizacao = NOW(); RETURN NEW; END;
        $$ LANGUAGE 'plpgsql';
      `;
      await client.query(ddlTriggerFunction);

      const ddlCategorias = `
        CREATE TABLE categorias (
            id SERIAL PRIMARY KEY, nome TEXT NOT NULL UNIQUE, descricao TEXT,
            ordem_exibicao INTEGER DEFAULT 0, ativo BOOLEAN DEFAULT TRUE,
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE categorias IS 'Categorias dos produtos do cardápio de um restaurante específico.';
      `;
      await client.query(ddlCategorias);
      const ddlTriggerCategorias = `
        CREATE TRIGGER trg_categorias_data_atualizacao
        BEFORE UPDATE ON categorias FOR EACH ROW
        EXECUTE FUNCTION atualizar_data_atualizacao_tenant_tables();
      `;
      await client.query(ddlTriggerCategorias);

      const ddlProdutos = `
        CREATE TABLE produtos (
            id SERIAL PRIMARY KEY, categoria_id INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
            nome TEXT NOT NULL, descricao TEXT, preco NUMERIC(10, 2) NOT NULL,
            url_foto TEXT, ativo BOOLEAN DEFAULT TRUE, ordem_exibicao INTEGER DEFAULT 0,
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE produtos IS 'Produtos do cardápio, vinculados a uma categoria.';
        CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
        CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
      `;
      await client.query(ddlProdutos);
      const ddlTriggerProdutos = `
        CREATE TRIGGER trg_produtos_data_atualizacao
        BEFORE UPDATE ON produtos FOR EACH ROW
        EXECUTE FUNCTION atualizar_data_atualizacao_tenant_tables();
      `;
      await client.query(ddlTriggerProdutos);

      const ddlPromocoes = `
        CREATE TABLE promocoes (
            id SERIAL PRIMARY KEY,
            nome_promocao TEXT NOT NULL,
            descricao_promocao TEXT,
            tipo_promocao TEXT NOT NULL CHECK (tipo_promocao IN ('DESCONTO_PERCENTUAL_PRODUTO', 'PRECO_FIXO_PRODUTO', 'COMBO_PRECO_FIXO', 'LEVE_X_PAGUE_Y_PRODUTO')),
            valor_desconto_percentual NUMERIC(5, 2) CHECK (valor_desconto_percentual IS NULL OR (valor_desconto_percentual > 0 AND valor_desconto_percentual <= 100)),
            preco_promocional_combo NUMERIC(10, 2) CHECK (preco_promocional_combo IS NULL OR preco_promocional_combo > 0),
            data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            data_fim TIMESTAMP WITH TIME ZONE,
            ativo BOOLEAN DEFAULT TRUE,
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE promocoes IS 'Armazena as promoções oferecidas pelo restaurante.';
        COMMENT ON COLUMN promocoes.tipo_promocao IS 'Tipo da promoção: DESCONTO_PERCENTUAL_PRODUTO, PRECO_FIXO_PRODUTO, COMBO_PRECO_FIXO, LEVE_X_PAGUE_Y_PRODUTO.';
      `;
      await client.query(ddlPromocoes);

      const ddlTriggerPromocoes = `
        CREATE TRIGGER trg_promocoes_data_atualizacao
        BEFORE UPDATE ON promocoes FOR EACH ROW
        EXECUTE FUNCTION atualizar_data_atualizacao_tenant_tables();
      `;
      await client.query(ddlTriggerPromocoes);

      const ddlPromocaoProdutos = `
        CREATE TABLE promocao_produtos (
            id SERIAL PRIMARY KEY,
            promocao_id INTEGER NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
            produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
            quantidade_no_combo INTEGER DEFAULT 1 CHECK (quantidade_no_combo > 0),
            preco_promocional_produto_individual NUMERIC(10, 2) CHECK (preco_promocional_produto_individual IS NULL OR preco_promocional_produto_individual >= 0),
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE (promocao_id, produto_id)
        );
        COMMENT ON TABLE promocao_produtos IS 'Associa produtos a promoções específicas.';
      `;
      await client.query(ddlPromocaoProdutos);
      
      await client.query(`SET search_path TO public;`);
      await client.query('COMMIT');

      console.log(`Service Restaurante: Restaurante ID ${novoRestaurante.id}, Schema '${nome_schema_db}', e todas as tabelas (incluindo promoções) criados com sucesso.`);
      return novoRestaurante;

    } catch (dbError) {
      if (client) {
        await client.query('ROLLBACK');
      }
      console.error('Service Restaurante DB Error: Falha na transação (revertida):', dbError.message || dbError);
      if (dbError.code === '23505') {
        throw new Error(`Já existe um registro com algum dos valores únicos fornecidos. Detalhe: ${dbError.detail || dbError.message}`);
      }
      throw new Error(`Erro no banco de dados ao criar restaurante: ${dbError.message}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      console.error('Service Restaurante Validation Error:', validationError.issues);
      const formattedErrors = validationError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const error = new Error(`Erro de validação para restaurante: ${formattedErrors}`);
      error.isZodError = true;
      error.issues = validationError.issues;
      throw error;
    }
    console.error('Service Restaurante Error (pré-validação ou inesperado):', validationError.message || validationError);
    throw new Error(`Erro no serviço ao processar dados do restaurante: ${validationError.message}`);
  }
};

const buscarRestaurantePorId = async (restauranteId) => {
  console.log(`Service: Buscando restaurante ID '${restauranteId}'...`);
  try {
    const id = parseInt(restauranteId, 10);
    const queryText = `
      SELECT id, identificador_url, nome_fantasia, razao_social, cnpj, endereco_completo, 
             telefone_contato, path_logo, cor_primaria_hex, cor_secundaria_hex, 
             email_responsavel, nome_schema_db, ativo, data_criacao, data_atualizacao 
      FROM public.restaurantes WHERE id = $1;
    `;
    const resultado = await db.query(queryText, [id]);

    if (resultado.rowCount === 0) {
      return null;
    }
    return resultado.rows[0];
  } catch (error) {
    console.error(`Service Error (buscarRestaurantePorId):`, error.message);
    throw new Error('Erro no serviço ao buscar dados do restaurante.');
  }
};

const modificarRestaurante = async (restauranteId, dadosBrutosUpdate) => {
  console.log(`Service: Modificando restaurante ID '${restauranteId}'...`);
  try {
    const dadosUpdate = restauranteUpdateSchema.parse(dadosBrutosUpdate);
    const camposParaAtualizar = Object.keys(dadosUpdate);

    if (camposParaAtualizar.length === 0) {
      const error = new Error('Nenhum dado válido fornecido para atualização.');
      error.isZodError = true;
      throw error;
    }

    const setClauses = camposParaAtualizar.map((key, index) => `${key} = $${index + 1}`);
    const values = camposParaAtualizar.map(key => dadosUpdate[key]);
    
    const id = parseInt(restauranteId, 10);
    values.push(id);

    const queryText = `
      UPDATE public.restaurantes 
      SET ${setClauses.join(', ')}, data_atualizacao = NOW() 
      WHERE id = $${values.length}
      RETURNING *;
    `;

    const resultado = await db.query(queryText, values);

    if (resultado.rowCount === 0) {
      const error = new Error(`Restaurante com ID '${restauranteId}' não encontrado.`);
      error.isNotFoundError = true;
      throw error;
    }
    
    const restauranteAtualizado = resultado.rows[0];
    delete restauranteAtualizado.hash_senha_responsavel;

    return restauranteAtualizado;
  } catch (error) {
    if (error instanceof z.ZodError || error.isZodError) {
      const formattedErrors = error.issues ? error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ') : error.message;
      const validationError = new Error(`Erro de validação: ${formattedErrors}`);
      validationError.isZodError = true;
      throw validationError;
    }
    if (error.isNotFoundError) throw error;
    
    console.error(`Service Error (modificarRestaurante):`, error.message);
    throw new Error('Erro no serviço ao atualizar dados do restaurante.');
  }
};

// <<<--- NOVA FUNÇÃO PARA ATUALIZAR APENAS A LOGO
const atualizarPathLogo = async (restauranteId, logoUrl) => {
  console.log(`Service: Atualizando path_logo para restaurante ID '${restauranteId}'...`);
  try {
    const id = parseInt(restauranteId, 10);
    const queryText = `
      UPDATE public.restaurantes 
      SET path_logo = $1, data_atualizacao = NOW() 
      WHERE id = $2
      RETURNING path_logo;
    `;
    const resultado = await db.query(queryText, [logoUrl, id]);

    if (resultado.rowCount === 0) {
      const error = new Error(`Restaurante com ID '${restauranteId}' não encontrado para atualizar a logo.`);
      error.isNotFoundError = true;
      throw error;
    }
    return resultado.rows[0];
  } catch (error) {
    console.error(`Service Error (atualizarPathLogo):`, error.message);
    throw new Error('Erro no serviço ao atualizar a logo do restaurante.');
  }
};


module.exports = {
  criarNovoRestaurante,
  buscarRestaurantePorId,
  modificarRestaurante,
  atualizarPathLogo,
};