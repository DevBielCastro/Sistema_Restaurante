// frontend/src/components/admin/cardapio/AddCategoryForm.tsx
"use client";

import { useState, FormEvent } from 'react';

interface AddCategoryFormProps {
  restauranteId: number;
  token: string;
  onCategoryAdded: () => void; // Função para atualizar a lista na página principal
}

export default function AddCategoryForm({ restauranteId, token, onCategoryAdded }: AddCategoryFormProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  // Campos opcionais como ordem_exibicao e ativo usarão os defaults do Zod/banco se não enviados.
  // Se quiser inputs para eles no formulário, adicione os states e inclua-os em 'categoriaData'.

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Previne o recarregamento da página
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    // Preparamos os dados da categoria para enviar.
    // O Zod no backend espera 'nome' e pode receber 'descricao', 'ordem_exibicao', 'ativo'.
    // Se 'descricao' for uma string vazia, enviamos null para o Zod/backend tratar.
    const categoriaData: { nome: string; descricao?: string | null } = {
      nome: nome.trim(), // Envio o nome sem espaços extras no início/fim
      descricao: descricao.trim() === '' ? null : descricao.trim(),
      // Para enviar valores default do Zod do backend para ordem_exibicao e ativo,
      // simplesmente não os inclua no objeto categoriaData se não houver inputs para eles.
      // Se você adicionar inputs para eles, inclua-os aqui:
      // ordem_exibicao: valorDoInputOrdem,
      // ativo: valorDoInputAtivo,
    };

    // Validação rápida no frontend antes de enviar
    if (!categoriaData.nome) {
      setError("O nome da categoria é obrigatório.");
      setIsSubmitting(false);
      return;
    }

    console.log('Enviando dados da categoria para o backend:', categoriaData);
    console.log('Usando Restaurante ID:', restauranteId);
    // Não logar o token inteiro no console do navegador em produção.
    // console.log('Usando Token:', token ? 'Token presente' : 'Token AUSENTE');

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/categorias`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`, // Envio o token JWT para autenticação
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(categoriaData), // Envio os dados da categoria no corpo da requisição
        }
      );

      const responseData = await response.json(); // Tento ler o corpo da resposta, mesmo se for erro

      if (!response.ok) {
        // Se a resposta não for OK (ex: 400, 401, 403, 500)
        // A nossa API backend já retorna uma propriedade 'message' e às vezes 'details'
        console.error('Erro da API ao adicionar categoria:', responseData);
        throw new Error(responseData.message || responseData.details || `Erro HTTP: ${response.status}`);
      }

      // Se chegou aqui, a categoria foi criada com sucesso no backend!
      setSuccessMessage(`Categoria "${responseData.nome}" adicionada com sucesso!`);
      setNome(''); // Limpo o campo nome do formulário
      setDescricao(''); // Limpo o campo descrição do formulário

      // Chamo a função passada por props para notificar a página pai que uma nova categoria foi adicionada,
      // para que ela possa atualizar a lista de categorias exibida.
      onCategoryAdded();

    } catch (err: any) {
      console.error("Falha ao adicionar categoria (catch no handleSubmit):", err);
      setError(err.message || "Não foi possível adicionar a categoria. Verifique os dados e tente novamente.");
    } finally {
      setIsSubmitting(false); // Garanto que o botão de submit seja reabilitado
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="nomeCategoria" className="block text-sm font-medium text-gray-300 mb-1">
          Nome da Categoria <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="nomeCategoria"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          // O 'required' HTML é uma boa primeira barreira, mas a validação Zod no backend é a principal.
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        />
      </div>
      <div>
        <label htmlFor="descricaoCategoria" className="block text-sm font-medium text-gray-300 mb-1">
          Descrição (Opcional)
        </label>
        <textarea
          id="descricaoCategoria"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={3}
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting || !nome.trim()} // Desabilito se estiver submetendo ou se o nome for vazio
        className="w-full bg-[#20c2ef] hover:bg-[#1aa8d1] text-[#030607] font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adicionando...' : 'Adicionar Categoria'}
      </button>

      {/* Exibição de mensagens de sucesso ou erro */}
      {successMessage && <p className="text-green-500 mt-2 p-2 bg-green-900 bg-opacity-50 rounded">{successMessage}</p>}
      {error && <p className="text-red-500 mt-2 p-2 bg-red-900 bg-opacity-50 rounded">{error}</p>}
    </form>
  );
}