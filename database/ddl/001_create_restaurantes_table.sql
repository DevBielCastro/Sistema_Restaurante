-- Arquivo: 001_create_restaurantes_table.sql
-- Descrição: Cria a tabela principal para gerenciar os restaurantes/tenants da plataforma.

CREATE TABLE public.restaurantes (
    id SERIAL PRIMARY KEY, -- Identificador único numérico do restaurante
    identificador_url TEXT UNIQUE NOT NULL, -- Usado para o subdomínio/URL (ex: "pizzariajoao")
    nome_fantasia TEXT NOT NULL, -- Nome público da lanchonete/restaurante
    razao_social TEXT, -- Razão social (opcional)
    cnpj TEXT UNIQUE, -- CNPJ (opcional, mas único se preenchido)
    endereco_completo TEXT, -- Endereço completo do estabelecimento
    telefone_contato TEXT, -- Telefone de contato principal da lanchonete
    path_logo TEXT, -- Caminho para o arquivo da logo (ex: 'logos/pizzariajoao.png')
    
    -- Configurações de personalização do cardápio
    -- Cores padrão do sistema (se NULL): Azul: #20c2ef e Preto: #030607
    cor_primaria_hex CHAR(7) DEFAULT NULL, -- Cor primária em hexadecimal (ex: '#RRGGBB'), NULL usa o padrão do sistema
    cor_secundaria_hex CHAR(7) DEFAULT NULL, -- Cor secundária em hexadecimal, NULL usa o padrão do sistema
    
    -- Informações de acesso e técnicas
    nome_schema_db TEXT UNIQUE NOT NULL, -- Nome do schema no banco de dados para este restaurante (ex: "pizzariajoao_schema")
    email_responsavel TEXT UNIQUE NOT NULL, -- Email para login do responsável da lanchonete no portal de admin
    hash_senha_responsavel TEXT NOT NULL, -- Senha criptografada para login do responsável
    
    -- Controle e Metadados
    ativo BOOLEAN DEFAULT TRUE, -- Indica se o restaurante está ativo na plataforma
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- Data e hora de criação do registro
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Data e hora da última atualização do registro
);

-- Trigger para atualizar 'data_atualizacao' automaticamente em cada UPDATE
CREATE OR REPLACE FUNCTION atualizar_data_atualizacao_restaurantes()
RETURNS TRIGGER AS $$
BEGIN
   NEW.data_atualizacao = NOW();
   RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_restaurantes_data_atualizacao
BEFORE UPDATE ON public.restaurantes
FOR EACH ROW
EXECUTE FUNCTION atualizar_data_atualizacao_restaurantes();

-- Índices que podem ser úteis (além dos criados por UNIQUE e PRIMARY KEY):
CREATE INDEX IF NOT EXISTS idx_restaurantes_ativo ON public.restaurantes(ativo);
CREATE INDEX IF NOT EXISTS idx_restaurantes_email_responsavel ON public.restaurantes(email_responsavel);

COMMENT ON COLUMN public.restaurantes.cor_primaria_hex IS 'Se NULL, a aplicação usará a cor primária padrão do sistema (#20c2ef).';
COMMENT ON COLUMN public.restaurantes.cor_secundaria_hex IS 'Se NULL, a aplicação usará a cor secundária padrão do sistema (#030607).';

-- Fim do script para 001_create_restaurantes_table.sql