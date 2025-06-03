// backend/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
// Carrega o JWT_SECRET do .env. É crucial que o .env principal do backend seja lido.
// Se server.js já faz require('dotenv').config(), e este middleware é chamado depois,
// process.env.JWT_SECRET já estará disponível. Mas para garantir, podemos chamar aqui também.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const protegerRota = (req, res, next) => {
  // Tento pegar o token do cabeçalho 'Authorization'
  // O formato esperado é "Bearer TOKEN_AQUI"
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Se não tem o cabeçalho ou não começa com "Bearer ", o token não foi enviado corretamente.
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido ou mal formatado.' });
  }

  // Pego apenas a parte do token, ignorando o "Bearer "
  const token = authHeader.split(' ')[1];

  if (!token) {
    // Se, por algum motivo, o token estiver vazio após o "Bearer "
    return res.status(401).json({ message: 'Acesso negado. Token não fornecido.' });
  }

  try {
    // Verifico se o token é válido usando o nosso JWT_SECRET
    // Se o token for inválido ou expirado, jwt.verify() lançará um erro.
    const decodedTokenPayload = jwt.verify(token, process.env.JWT_SECRET);

    // Se o token for válido, o payload decodificado (que contém restauranteId, email, nomeSchemaDb)
    // é adicionado ao objeto 'req' para que as próximas rotas/controllers possam usá-lo.
    // Eu chamo de 'restauranteAutenticado' para clareza.
    req.restauranteAutenticado = decodedTokenPayload;

    next(); // Chamo next() para passar a requisição para o próximo middleware ou para o controller da rota.
  } catch (error) {
    // Se jwt.verify() lançar um erro (token inválido, expirado, etc.)
    console.error('Middleware Auth Error: Falha na verificação do token:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado. Por favor, faça login novamente.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token inválido.' });
    }
    // Para outros erros inesperados na verificação
    return res.status(403).json({ message: 'Acesso proibido. Falha na autenticação do token.' });
  }
};

module.exports = {
  protegerRota,
};