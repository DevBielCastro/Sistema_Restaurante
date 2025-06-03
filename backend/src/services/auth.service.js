// backend/src/services/auth.service.js
const db = require('../config/db'); // Nosso módulo de conexão com o banco
const bcrypt = require('bcryptjs'); // Para comparar senhas hasheadas
const jwt = require('jsonwebtoken'); // Para criar e gerenciar tokens JWT
const { z } = require('zod');     // Para validação de entrada
// Carrega as variáveis de ambiente. Como este arquivo pode ser chamado
// em contextos onde o server.js ainda não carregou o .env (ex: scripts),
// é uma boa prática garantir aqui também, especificando o caminho.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });


// Schema de validação para os dados de login
const loginSchema = z.object({
  email_responsavel: z.string().email({ message: "Formato de e-mail inválido." }),
  senha_responsavel: z.string().min(1, { message: "A senha é obrigatória." }), // Validação de tamanho mínimo já no schema de criação
});

const autenticarRestaurante = async (email, senha) => {
  // Log para início do processo de autenticação.
  console.log(`Service: Tentando autenticar restaurante com email: ${email}`);

  // 1. Valido os dados de entrada (email e senha)
  try {
    loginSchema.parse({ email_responsavel: email, senha_responsavel: senha });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      // Lanço um erro específico para o controller tratar como 400
      const validationError = new Error(`Dados de login inválidos: ${formattedErrors}`);
      validationError.isValidationError = true; // Flag para o controller
      throw validationError;
    }
    throw error; // Relanço outros erros inesperados da validação
  }

  try {
    // 2. Busco o restaurante no banco pelo 'email_responsavel'
    const queryText = `
      SELECT id, email_responsavel, hash_senha_responsavel, nome_fantasia, nome_schema_db, ativo 
      FROM public.restaurantes 
      WHERE email_responsavel = $1;
    `;
    const resultado = await db.query(queryText, [email]);
    const restaurante = resultado.rows[0];

    // 3. Se não encontrar o restaurante ou se ele não estiver ativo
    if (!restaurante || !restaurante.ativo) {
      throw new Error('Credenciais inválidas ou restaurante não ativo.');
    }

    // 4. Comparo a 'senha' fornecida com o 'hash_senha_responsavel' do banco
    const senhaCorreta = await bcrypt.compare(senha, restaurante.hash_senha_responsavel);

    // 5. Se a senha não bater
    if (!senhaCorreta) {
      throw new Error('Credenciais inválidas ou restaurante não ativo.'); // Mesma mensagem para não dar pistas a atacantes
    }

    // 6. Se a senha bater, gero um token JWT
    const tokenPayload = {
      restauranteId: restaurante.id,
      email: restaurante.email_responsavel,
      nomeSchemaDb: restaurante.nome_schema_db, // Incluo o schema no token para uso futuro
    };

    // Verifico se JWT_SECRET está carregado
    if (!process.env.JWT_SECRET) {
        console.error('Service Auth Error: JWT_SECRET não está definido no .env');
        throw new Error('Erro de configuração interna do servidor.'); // Não expor detalhes
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '7d' }); // Token expira em 7 dias

    // 7. Retorno o token e dados básicos do restaurante (sem a senha!)
    console.log(`Service: Restaurante ID ${restaurante.id} autenticado com sucesso.`);
    return {
      token,
      restaurante: {
        id: restaurante.id,
        nome_fantasia: restaurante.nome_fantasia,
        email: restaurante.email_responsavel,
        nome_schema_db: restaurante.nome_schema_db
      }
    };

  } catch (error) {
    // Log do erro no serviço.
    console.error('Service Auth Error:', error.message);
    // Relanço o erro para o controller tratar (se não for um erro já específico de validação).
    // O controller decidirá se será um 401, 400 ou 500.
    // Se o erro já tiver a flag 'isValidationError', o controller a usará.
    // Se for 'Credenciais inválidas...', o controller pode tratar como 401.
    throw error; 
  }
};

module.exports = {
  autenticarRestaurante,
};