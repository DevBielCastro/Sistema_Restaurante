// backend/src/config/db.js

console.log('[db.js] Iniciando configuração do banco de dados...'); // Log 1
// Certifique-se que o dotenv está no topo para carregar as variáveis ANTES de usá-las
require('dotenv').config({ path: '../../.env' });

const { Pool } = require('pg');

console.log('[db.js] Variáveis de ambiente carregadas:'); // Log 2
console.log(`[db.js] DB_USER: ${process.env.DB_USER}`);
console.log(`[db.js] DB_HOST: ${process.env.DB_HOST}`);
console.log(`[db.js] DB_DATABASE: ${process.env.DB_DATABASE}`);
console.log(`[db.js] DB_PORT: ${process.env.DB_PORT}`);
// Não logue a senha!

let pool;
try {
  pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });
  console.log('[db.js] Pool do PostgreSQL criada com sucesso.'); // Log 3
} catch (error) {
  console.error('[db.js] ERRO AO CRIAR A POOL DO POSTGRESQL:', error); // Log 4
  // Se a pool não puder ser criada, o módulo não funcionará.
  // Lançar o erro pode ser uma opção, ou exportar um objeto que indique a falha.
  // Por agora, vamos apenas logar e o 'pool' ficará undefined, o que causará erro depois.
}


module.exports = {
  query: (text, params) => {
    if (!pool) {
      console.error("[db.js] Tentativa de query, mas a pool não foi inicializada.");
      return Promise.reject(new Error("Pool de conexão não inicializada."));
    }
    return pool.query(text, params);
  },
  testConnection: async () => {
    if (!pool) {
      console.error("[db.js] testConnection: Pool não inicializada.");
      return false;
    }
    console.log('[db.js] testConnection: Tentando conectar...'); // Log 5
    let client;
    try {
      client = await pool.connect();
      console.log('[db.js] testConnection: Conexão com o PostgreSQL estabelecida com sucesso!'); // Log 6
      return true;
    } catch (error) {
      console.error('[db.js] testConnection: Erro ao conectar com o PostgreSQL:', error.message || error); // Log 7
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  },
  // Exportar a pool pode ser útil para transações, como fizemos no service
  pool: pool
};