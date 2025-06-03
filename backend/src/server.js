// backend/src/server.js

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importo o módulo de conexão com o banco e nossas rotas
const db = require('./config/db');
const restauranteRoutes = require('./api/restaurantes.routes');
const authRoutes = require('./api/auth.routes'); // Importa as rotas de autenticação

const app = express();

// Middlewares essenciais
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Defino minhas rotas
app.get('/', (req, res) => { // Rota raiz para health check
  res.json({ message: 'API da Plataforma de Cardápios Online operacional!' });
});
app.use('/api/v1/restaurantes', restauranteRoutes); // Monto as rotas de restaurantes
app.use('/api/v1/auth', authRoutes); // Monto as rotas de autenticação

const PORT = process.env.PORT || 3001;

// Verifico a conexão com o banco antes de iniciar o servidor HTTP.
db.testConnection().then(isConnected => {
  if (isConnected) {
    app.listen(PORT, () => {
      console.log(`Servidor backend escutando na porta ${PORT} e conectado ao banco de dados.`);
    });
  } else {
    console.error('Falha crítica: Não foi possível conectar ao banco de dados. O servidor não será iniciado.');
    process.exit(1);
  }
}).catch(error => {
    console.error('Erro crítico inesperado ao tentar conectar ao banco de dados:', error);
    process.exit(1);
});