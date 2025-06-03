// backend/src/services/restaurante.service.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { z } = require('zod'); // Importo o Zod
// const format = require('pg-format'); // Considerar para formatação segura de identificadores em produção

// Defino o schema de validação para os dados de entrada de um novo restaurante
const restauranteSchema = z.object({
  identificador_url: z.string({
    required_error: "O identificador_url é obrigatório.",
    invalid_type_error: "O identificador_url deve ser um texto.",
  })
  .min(3, { message: "O identificador_url deve ter pelo menos 3 caracteres." })
  .regex(/^[a-z0-9_]+$/, { message: "O identificador_url deve conter apenas letras minúsculas, números e underscores ('_')." }),

  nome_fantasia: z.string({
    required_error: "O nome_fantasia é obrigatório.",
  })
  .min(2, { message: "O nome_fantasia deve ter pelo menos 2 caracteres." }),

  email_responsavel: z.string({
    required_error: "O email_responsavel é obrigatório.",
  })
  .email({ message: "Formato de e-mail inválido para email_responsavel." }),

  senha_responsavel: z.string({
    required_error: "A senha_responsavel é obrigatória.",
  })
  .min(8, { message: "A senha_responsavel deve ter pelo menos 8 caracteres." }),

  nome_schema_db: z.string({
    required_error: "O nome_schema_db é obrigatório.",
  })
  .min(3, { message: "O nome_schema_db deve ter pelo menos 3 caracteres." })
  .regex(/^[a-z0-9_]+$/, { message: "O nome_schema_db deve conter apenas letras minúsculas, números e underscores ('_')." }),

  razao_social: z.string().min(2, { message: "A razão social deve ter pelo menos 2 caracteres." }).optional(),
  cnpj: z.string()
    .regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, { message: "Formato de CNPJ inválido."})
    .optional()
    .nullable(),
  endereco_completo: z.string().min(5, { message: "O endereço completo deve ter pelo menos 5 caracteres."}).optional(),
  telefone_contato: z.string().min(8, { message: "O telefone de contato deve ter pelo menos 8 caracteres."}).optional(),
  path_logo: z.string().url({ message: "O caminho da logo deve ser uma URL válida." }).optional().nullable(),
  cor_primaria_hex: z.string()
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, { message: "Cor primária deve ser um código hexadecimal válido (ex: #RRGGBB ou #RGB)." })
    .optional()
    .nullable(),
  cor_secundaria_hex: z.string()
    .regex(/^#([0-9A-Fa-f]{3}){1,2}$/, { message: "Cor secundária deve ser um código hexadecimal válido (ex: #RRGGBB ou #RGB)." })
    .optional()
    .nullable(),
});


const criarNovoRestaurante = async (dadosBrutosRestaurante) => {
  console.log('Service: Tentando criar restaurante com dados brutos:', dadosBrutosRestaurante);

  try {
    // 1. Validar os dados de entrada usando o schema Zod.
    //    Se a validação falhar, o Zod lançará um erro que será capturado pelo catch mais abaixo.
    const dadosRestaurante = restauranteSchema.parse(dadosBrutosRestaurante);
    console.log('Service: Dados validados pelo Zod:', dadosRestaurante);

    // Desestruturo os dados validados para uso
    const {
      identificador_url,
      nome_fantasia,
      email_responsavel,
      senha_responsavel, // Senha em texto puro, validada
      nome_schema_db,
      razao_social,
      cnpj,
      endereco_completo,
      telefone_contato,
      path_logo,
      cor_primaria_hex,
      cor_secundaria_hex,
    } = dadosRestaurante;

    const client = await db.pool.connect(); // Pego um cliente da pool para a transação

    try {
      await client.query('BEGIN'); // Inicio a transação

      // 2. Hashear a senha do responsável
      const saltRounds = 10;
      const hash_senha_responsavel = await bcrypt.hash(senha_responsavel, saltRounds);

      // 3. Inserir os dados do restaurante na tabela 'public.restaurantes'
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
        throw new Error('Falha ao inserir os dados do restaurante na tabela principal, nenhum dado retornado.');
      }

      // 4. Criar o schema específico para este restaurante
      const queryCreateSchema = `CREATE SCHEMA IF NOT EXISTS "${nome_schema_db}";`;
      await client.query(queryCreateSchema);

      // 5. Criar tabelas e funções dentro do novo schema
      await client.query(`SET search_path TO "${nome_schema_db}", public;`);

      const ddlTriggerFunction = `
        CREATE OR REPLACE FUNCTION atualizar_data_atualizacao_tenant_tables()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.data_atualizacao = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE 'plpgsql';
      `;
      await client.query(ddlTriggerFunction);

      const ddlCategorias = `
        CREATE TABLE categorias (
            id SERIAL PRIMARY KEY,
            nome TEXT NOT NULL UNIQUE,
            descricao TEXT,
            ordem_exibicao INTEGER DEFAULT 0,
            ativo BOOLEAN DEFAULT TRUE,
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        COMMENT ON TABLE categorias IS 'Categorias dos produtos do cardápio de um restaurante específico.';
      `;
      await client.query(ddlCategorias);

      const ddlTriggerCategorias = `
        CREATE TRIGGER trg_categorias_data_atualizacao
        BEFORE UPDATE ON categorias
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_data_atualizacao_tenant_tables();
      `;
      await client.query(ddlTriggerCategorias);

      const ddlProdutos = `
        CREATE TABLE produtos (
            id SERIAL PRIMARY KEY,
            categoria_id INTEGER NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            preco NUMERIC(10, 2) NOT NULL,
            url_foto TEXT,
            ativo BOOLEAN DEFAULT TRUE,
            ordem_exibicao INTEGER DEFAULT 0,
            data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_categoria
                FOREIGN KEY(categoria_id) 
                REFERENCES categorias(id)
                ON DELETE RESTRICT 
        );
        COMMENT ON TABLE produtos IS 'Produtos do cardápio de um restaurante específico, vinculados a uma categoria.';
        CREATE INDEX IF NOT EXISTS idx_produtos_categoria_id ON produtos(categoria_id);
        CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
      `;
      await client.query(ddlProdutos);

      const ddlTriggerProdutos = `
        CREATE TRIGGER trg_produtos_data_atualizacao
        BEFORE UPDATE ON produtos
        FOR EACH ROW
        EXECUTE FUNCTION atualizar_data_atualizacao_tenant_tables();
      `;
      await client.query(ddlTriggerProdutos);

      await client.query(`SET search_path TO public;`); // Restauro o search_path

      await client.query('COMMIT'); // Confirmo todas as operações da transação

      console.log(`Service: Restaurante ID ${novoRestaurante.id}, Schema '${nome_schema_db}', e tabelas de cardápio criados com sucesso.`);
      return novoRestaurante; // Retorno os dados básicos do restaurante criado.

    } catch (dbError) { // Catch para erros da transação com o banco
      if (client) {
        await client.query('ROLLBACK'); // Desfaço as alterações se algo deu errado na transação
      }
      console.error('Service DB Error: Falha na transação (revertida):', dbError.message || dbError);
      if (dbError.code === '23505') { // Violação de constraint UNIQUE do PostgreSQL
        throw new Error(`Já existe um registro com algum dos valores únicos fornecidos. Detalhe: ${dbError.detail || dbError.message}`);
      }
      throw new Error(`Erro no banco de dados ao criar restaurante: ${dbError.message}`);
    } finally {
      if (client) {
        client.release(); // Libero o cliente de volta para a pool, crucial
      }
    }
  } catch (validationError) { // Catch para erros de validação do Zod ou outros erros pré-transação
    if (validationError instanceof z.ZodError) {
      console.error('Service Validation Error:', validationError.issues);
      // Formato os erros do Zod para serem mais amigáveis para o controller
      const formattedErrors = validationError.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const error = new Error(`Erro de validação: ${formattedErrors}`);
      error.isZodError = true; // Adiciono uma flag para o controller identificar
      error.issues = validationError.issues; // Disponibilizo as issues originais se necessário
      throw error;
    }
    // Para outros tipos de erro que podem ocorrer antes de iniciar a transação
    console.error('Service Error (pré-transação):', validationError.message || validationError);
    throw new Error(`Erro no serviço ao processar dados do restaurante: ${validationError.message}`);
  }
};

module.exports = {
  criarNovoRestaurante,
  // TODO: Adicionar aqui os outros serviços relacionados a restaurantes.
};