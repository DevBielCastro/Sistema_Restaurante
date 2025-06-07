const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define o diretório de destino para os uploads de produtos
const uploadDir = path.join(__dirname, '../../public/uploads/produtos');

// Garante que o diretório de upload exista
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Salva os arquivos na pasta /produtos
  },
  filename: (req, file, cb) => {
    // Cria um nome de arquivo único para o produto
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'produto-' + uniqueSuffix + extension);
  }
});

// Filtro de arquivo para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado! Apenas imagens são permitidas.'), false);
  }
};

const uploadProduto = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Limite de 5MB
  }
});

module.exports = uploadProduto;