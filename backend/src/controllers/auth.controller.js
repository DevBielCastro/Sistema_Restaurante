// backend/src/controllers/auth.controller.js
const authService = require('../services/auth.service'); // Importo nosso serviço de autenticação

const loginRestaurante = async (req, res) => {
  try {
    // Pego o email e a senha do corpo da requisição
    const { email_responsavel, senha_responsavel } = req.body;

    // Log para indicar que a tentativa de login chegou ao controller.
    // Em produção, eu usaria um logger mais configurável.
    console.log(`Controller: Tentativa de login recebida para o email: ${email_responsavel}`);

    // Chamo o serviço de autenticação para validar as credenciais e gerar o token
    const resultadoLogin = await authService.autenticarRestaurante(email_responsavel, senha_responsavel);

    // Se o serviço foi bem-sucedido, ele retorna o token e os dados do restaurante
    res.status(200).json(resultadoLogin);

  } catch (error) {
    // Log do erro no console do backend para debug
    console.error('Controller Auth Error:', error.message);

    // Verifico o tipo de erro para retornar a resposta HTTP apropriada
    if (error.isValidationError) { // Flag que definimos no service para erros de validação Zod
      res.status(400).json({ message: "Dados de login inválidos.", details: error.message });
    } else if (error.message.includes('Credenciais inválidas ou restaurante não ativo')) {
      // Erro específico lançado pelo service se o email não for encontrado ou a senha não bater
      res.status(401).json({ message: error.message }); // 401 Unauthorized
    } else if (error.message.includes('Erro de configuração interna do servidor')) {
      // Erro específico se o JWT_SECRET não estiver configurado
      res.status(500).json({ message: error.message });
    }
    else {
      // Para outros erros inesperados que possam vir do serviço
      res.status(500).json({ message: 'Ocorreu um erro interno no servidor ao tentar fazer login.' });
    }
  }
};

module.exports = {
  loginRestaurante,
};