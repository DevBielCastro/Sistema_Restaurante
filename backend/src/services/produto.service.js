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
  console.log(`Service Produto: Criando novo produto no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosProduto);
  try {
    const dadosProduto = produtoCreateSchema.parse(dadosBrutosProduto);
    console.log(`Service Produto: Dados validados (com defaults Zod):`, dadosProduto);
    const { nome, descricao, preco, categoria_id, url_foto, ordem_exibicao, ativo } = dadosProduto;
    const queryVerificaCategoria = `SELECT id FROM "${nomeSchemaDbDoRestaurante}".categorias WHERE id = $1;`;
    const resultadoCategoria = await db.query(queryVerificaCategoria, [categoria_id]);
    if (resultadoCategoria.rowCount === 0) {
      const error = new Error(`Categoria com ID '${categoria_id}' não encontrada no cardápio deste restaurante.`);
      error.isForeignKeyConstraint = true; throw error;
    }
    const queryInsertProduto = `
      INSERT INTO "${nomeSchemaDbDoRestaurante}".produtos 
        (nome, descricao, preco, categoria_id, url_foto, ativo, ordem_exibicao) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;`;
    const valuesInsertProduto = [nome, descricao, preco, categoria_id, url_foto, ativo, ordem_exibicao];
    const resultadoProduto = await db.query(queryInsertProduto, valuesInsertProduto);
    const produtoCriado = resultadoProduto.rows[0];
    if (!produtoCriado) { throw new Error('Falha ao criar o produto, nenhum dado retornado pelo banco.'); }
    console.log(`Service Produto: Produto ID ${produtoCriado.id} ('${produtoCriado.nome}') criado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoCriado;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Produto Validation Error (Criar):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para produto: ${formattedErrors}`);
      validationError.isZodError = true; validationError.issues = error.issues; throw validationError;
    }
    if (error.isForeignKeyConstraint) { throw error; }
    console.error(`Service Produto Error (Criar):`, error.message || error);
    throw new Error(`Erro no serviço ao adicionar produto: ${error.message}`);
  }
};

const buscarProdutosPorRestaurante = async (nomeSchemaDbDoRestaurante) => {
  console.log(`Service Produto: Buscando produtos no schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const queryText = `
      SELECT p.id, p.nome, p.descricao, p.preco, p.categoria_id, c.nome AS nome_categoria, 
             p.url_foto, p.ativo, p.ordem_exibicao, p.data_criacao, p.data_atualizacao 
      FROM "${nomeSchemaDbDoRestaurante}".produtos p
      LEFT JOIN "${nomeSchemaDbDoRestaurante}".categorias c ON p.categoria_id = c.id
      ORDER BY c.ordem_exibicao ASC, p.ordem_exibicao ASC, p.nome ASC;`;
    const resultado = await db.query(queryText);
    console.log(`Service Produto: ${resultado.rows.length} produtos encontrados para o schema '${nomeSchemaDbDoRestaurante}'.`);
    return resultado.rows;
  } catch (error) {
    console.error(`Service Produto Error (Buscar Lista): Falha ao buscar produtos no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar lista de produtos: ${error.message}`);
  }
};

const buscarProdutoPorId = async (nomeSchemaDbDoRestaurante, produtoId) => {
  console.log(`Service Produto: Buscando produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const idProdutoParaBuscar = parseInt(produtoId, 10);
    if (isNaN(idProdutoParaBuscar)) {
      const error = new Error("ID do produto inválido. Deve ser um número.");
      error.isValidationError = true; throw error;
    }
    const queryText = `
      SELECT p.id, p.nome, p.descricao, p.preco, p.categoria_id, c.nome AS nome_categoria, 
             p.url_foto, p.ativo, p.ordem_exibicao, p.data_criacao, p.data_atualizacao 
      FROM "${nomeSchemaDbDoRestaurante}".produtos p
      LEFT JOIN "${nomeSchemaDbDoRestaurante}".categorias c ON p.categoria_id = c.id
      WHERE p.id = $1;`;
    const values = [idProdutoParaBuscar];
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      console.log(`Service Produto: Produto ID '${idProdutoParaBuscar}' não encontrado no schema '${nomeSchemaDbDoRestaurante}'.`);
      return null;
    }
    const produtoEncontrado = resultado.rows[0];
    console.log(`Service Produto: Produto ID ${produtoEncontrado.id} ('${produtoEncontrado.nome}') encontrado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoEncontrado;
  } catch (error) {
    if (error.isValidationError) { throw error; }
    console.error(`Service Produto Error (Buscar por ID): Falha ao buscar produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}':`, error.message || error);
    throw new Error(`Erro no serviço ao buscar produto por ID: ${error.message}`);
  }
};

const modificarProduto = async (nomeSchemaDbDoRestaurante, produtoId, dadosBrutosUpdate) => {
  console.log(`Service Produto: Modificando produto ID '${produtoId}' no schema '${nomeSchemaDbDoRestaurante}' com dados brutos:`, dadosBrutosUpdate);
  const idProdutoParaModificar = parseInt(produtoId, 10);
  if (isNaN(idProdutoParaModificar)) {
    const error = new Error("ID do produto para atualização é inválido. Deve ser um número.");
    error.isValidationError = true; throw error;
  }
  try {
    const dadosUpdateValidados = produtoUpdateSchema.parse(dadosBrutosUpdate);
    const camposParaAtualizar = Object.keys(dadosUpdateValidados);
    if (camposParaAtualizar.length === 0) {
      const error = new Error('Nenhum dado válido fornecido para atualização do produto.');
      error.isZodError = true; throw error;
    }
    if (dadosUpdateValidados.categoria_id !== undefined) {
      const queryVerificaCategoria = `SELECT id FROM "${nomeSchemaDbDoRestaurante}".categorias WHERE id = $1;`;
      const resultadoCategoria = await db.query(queryVerificaCategoria, [dadosUpdateValidados.categoria_id]);
      if (resultadoCategoria.rowCount === 0) {
        const error = new Error(`Categoria com ID '${dadosUpdateValidados.categoria_id}' não encontrada para associar ao produto.`);
        error.isForeignKeyConstraint = true; throw error;
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
      WHERE id = $${paramIndex} RETURNING *;`;
    const resultado = await db.query(queryText, values);
    if (resultado.rowCount === 0) {
      const error = new Error(`Produto com ID '${idProdutoParaModificar}' não encontrado no schema '${nomeSchemaDbDoRestaurante}' para atualização.`);
      error.isNotFoundError = true; throw error;
    }
    const produtoAtualizado = resultado.rows[0];
    console.log(`Service Produto: Produto ID ${produtoAtualizado.id} ('${produtoAtualizado.nome}') atualizado com sucesso no schema '${nomeSchemaDbDoRestaurante}'.`);
    return produtoAtualizado;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Service Produto Validation Error (Modificar):', error.issues);
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      const validationError = new Error(`Erro de validação para atualização do produto: ${formattedErrors}`);
      validationError.isZodError = true; validationError.issues = error.issues; throw validationError;
    }
    if (error.isValidationError || error.isForeignKeyConstraint || error.isNotFoundError || error.isZodError) {
      console.error(`Service Produto Error (Modificar - Sinalizado):`, error.message);
      throw error;
    }
    console.error(`Service Produto Error (Modificar - Genérico): Falha ao modificar produto ID '${produtoId}':`, error.message || error);
    throw new Error(`Erro no serviço ao modificar produto: ${error.message}`);
  }
};

const removerProduto = async (nomeSchemaDbDoRestaurante, produtoId) => {
  console.log(`Service Produto: Removendo produto ID '${produtoId}' do schema '${nomeSchemaDbDoRestaurante}'`);
  try {
    const idProdutoParaDeletar = parseInt(produtoId, 10);
    if (isNaN(idProdutoParaDeletar)) {
      const error = new Error("ID do produto inválido para deleção. Deve ser um número.");
      error.isValidationError = true;
      throw error;
    }
    const queryVerificaPromocaoProdutos = `
      SELECT COUNT(*) AS count FROM "${nomeSchemaDbDoRestaurante}".promocao_produtos 
      WHERE produto_id = $1;
    `;
    const resultadoPromocaoProdutos = await db.query(queryVerificaPromocaoProdutos, [idProdutoParaDeletar]);
    if (parseInt(resultadoPromocaoProdutos.rows[0].count, 10) > 0) {
      const error = new Error('Este produto não pode ser deletado, pois está associado a uma ou mais promoções. Remova-o das promoções primeiro.');
      error.isForeignKeyViolation = true;
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
    if (error.isValidationError || error.isNotFoundError || error.isForeignKeyViolation) {
        throw error;
    }
    if (error.code === '23503') { 
      console.error(`Service Produto DB Error (Remover): Tentativa de deletar produto ID '${produtoId}' que possui outras dependências.`);
      const fkError = new Error('Este produto não pode ser deletado, pois é referenciado em outros lugares (ex: em itens de pedido).');
      fkError.isForeignKeyViolation = true; 
      throw fkError;
    }
    console.error(`Service Produto Error (Remover): Falha ao remover produto ID '${produtoId}':`, error.message || error);
    throw new Error(`Erro no serviço ao remover produto: ${error.message}`);
  }
};

// <<<--- NOVA FUNÇÃO PARA ATUALIZAR APENAS A FOTO DO PRODUTO
const atualizarUrlFotoProduto = async (nomeSchemaDb, produtoId, imageUrl) => {
    console.log(`Service: Atualizando url_foto para produto ID '${produtoId}' no schema '${nomeSchemaDb}'...`);
    try {
        const id = parseInt(produtoId, 10);
        if (isNaN(id)) {
            const error = new Error("ID do produto inválido.");
            error.isValidationError = true;
            throw error;
        }

        const queryText = `
            UPDATE "${nomeSchemaDb}".produtos
            SET url_foto = $1, data_atualizacao = NOW()
            WHERE id = $2
            RETURNING id, url_foto;
        `;
        const resultado = await db.query(queryText, [imageUrl, id]);

        if (resultado.rowCount === 0) {
            const error = new Error(`Produto com ID '${id}' não encontrado para atualizar a imagem.`);
            error.isNotFoundError = true;
            throw error;
        }
        return resultado.rows[0];
    } catch (error) {
        if (error.isValidationError || error.isNotFoundError) {
            throw error;
        }
        console.error(`Service Error (atualizarUrlFotoProduto):`, error.message);
        throw new Error('Erro no serviço ao atualizar a imagem do produto.');
    }
};

module.exports = {
  criarNovoProduto,
  buscarProdutosPorRestaurante,
  buscarProdutoPorId,
  modificarProduto,
  removerProduto,
  atualizarUrlFotoProduto,
};