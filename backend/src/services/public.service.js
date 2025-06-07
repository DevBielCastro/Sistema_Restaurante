// backend/src/services/public.service.js
const db = require('../config/db');

/**
 * Lógica para verificar se o restaurante está aberto no momento atual.
 * @param {object} restaurante - O objeto do restaurante contendo os horários.
 * @returns {object} - Um objeto com o status booleano e um texto descritivo.
 */
const isAbertoAgora = (restaurante) => {
  const { horario_abertura, horario_fechamento, dias_funcionamento } = restaurante;

  // Se não houver dados de horário, não podemos determinar o status.
  if (!horario_abertura || !horario_fechamento || !dias_funcionamento) {
    return { aberto: false, texto: 'Horário não informado' };
  }

  // Obtém a data e hora atual no fuso horário do Brasil (America/Sao_Paulo)
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const diaDaSemana = agora.getDay(); // 0 (Domingo) a 6 (Sábado)
  const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

  const diasMap = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const diaAtualKey = diasMap[diaDaSemana];

  // 1. Verifica se o restaurante funciona no dia de hoje
  if (!dias_funcionamento[diaAtualKey]) {
    return { aberto: false, texto: 'Fechado agora' };
  }

  // 2. Verifica o horário
  // Caso normal (ex: 09:00 - 18:00)
  if (horario_abertura < horario_fechamento) {
    if (horaAtual >= horario_abertura && horaAtual < horario_fechamento) {
      return { aberto: true, texto: 'Aberto agora' };
    }
  } 
  // Caso de horário que vira a noite (ex: 18:00 - 02:00)
  else {
    if (horaAtual >= horario_abertura || horaAtual < horario_fechamento) {
      return { aberto: true, texto: 'Aberto agora' };
    }
  }

  // Se não caiu em nenhuma das condições de aberto, está fechado.
  return { aberto: false, texto: 'Fechado agora' };
};


/**
 * Busca todos os dados públicos de um restaurante, incluindo seu cardápio,
 * para serem exibidos na página pública.
 */
const getPublicCardapio = async (identificador_url) => {
  console.log(`Service Público: Buscando cardápio para '${identificador_url}'...`);
  try {
    // 1. Encontra o restaurante e seu schema na tabela pública
    const restauranteQuery = `
      SELECT id, nome_fantasia, path_logo, endereco_completo, nome_schema_db,
             horario_abertura, horario_fechamento, dias_funcionamento,
             cor_primaria_hex, cor_secundaria_hex
      FROM public.restaurantes 
      WHERE identificador_url = $1 AND ativo = TRUE;
    `;
    const restauranteResult = await db.query(restauranteQuery, [identificador_url]);

    if (restauranteResult.rowCount === 0) {
      console.log(`Service Público: Restaurante com identificador '${identificador_url}' não encontrado ou inativo.`);
      return null;
    }

    const restauranteInfo = restauranteResult.rows[0];
    const { nome_schema_db } = restauranteInfo;

    // 2. Usando o schema do restaurante, busca todas as categorias e produtos ATIVOS
    const categoriasQuery = `SELECT id, nome, descricao FROM "${nome_schema_db}".categorias WHERE ativo = TRUE ORDER BY ordem_exibicao ASC;`;
    const produtosQuery = `SELECT id, nome, descricao, preco, url_foto, categoria_id FROM "${nome_schema_db}".produtos WHERE ativo = TRUE ORDER BY ordem_exibicao ASC;`;
    
    const [categoriasResult, produtosResult] = await Promise.all([
      db.query(categoriasQuery),
      db.query(produtosQuery)
    ]);

    const categorias = categoriasResult.rows;
    const produtos = produtosResult.rows;

    // 3. Estrutura o menu
    const menuEstruturado = categorias.map(categoria => ({
      ...categoria,
      produtos: produtos.filter(produto => produto.categoria_id === categoria.id)
    }));

    // 4. Calcula o status de funcionamento
    const statusAbertura = isAbertoAgora(restauranteInfo);

    // 5. Monta o payload final para enviar ao frontend
    const payloadFinal = {
      restaurante: {
        id: restauranteInfo.id,
        nome_fantasia: restauranteInfo.nome_fantasia,
        path_logo: restauranteInfo.path_logo,
        endereco_completo: restauranteInfo.endereco_completo,
        cor_primaria_hex: restauranteInfo.cor_primaria_hex,
        cor_secundaria_hex: restauranteInfo.cor_secundaria_hex,
        horario_abertura: restauranteInfo.horario_abertura,
        horario_fechamento: restauranteInfo.horario_fechamento,
        dias_funcionamento: restauranteInfo.dias_funcionamento,
        status_abertura: statusAbertura, // Envia o status calculado
      },
      menu: menuEstruturado,
    };

    return payloadFinal;

  } catch (error) {
    console.error(`Service Público Error (getPublicCardapio):`, error.message);
    throw new Error('Erro ao construir os dados do cardápio público.');
  }
};

module.exports = {
  getPublicCardapio,
};