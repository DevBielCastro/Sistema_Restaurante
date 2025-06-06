// frontend/src/components/admin/cardapio/AddProductForm.tsx
"use client";

import { useState, FormEvent } from 'react';

// Tipagem para a lista de categorias que o formulário receberá
interface Categoria {
  id: number;
  nome: string;
}

interface AddProductFormProps {
  restauranteId: number;
  token: string;
  categorias: Categoria[]; // Recebe as categorias para o <select>
  onProductAdded: () => void; // Função para atualizar a lista na página principal
}

export default function AddProductForm({ restauranteId, token, categorias, onProductAdded }: AddProductFormProps) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validação frontend antes de enviar
    if (!nome.trim() || !preco.trim() || !categoriaId) {
      setError("Nome, Preço e Categoria são obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    const produtoData = {
      nome: nome.trim(),
      descricao: descricao.trim() === '' ? null : descricao.trim(),
      preco: parseFloat(preco),
      categoria_id: parseInt(categoriaId, 10),
    };

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/produtos`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(produtoData),
        }
      );

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.details || `Erro HTTP: ${response.status}`);
      }
      
      // Limpa o formulário
      setNome('');
      setDescricao('');
      setPreco('');
      setCategoriaId('');

      // Chama a função da página pai para recarregar os dados
      onProductAdded();

    } catch (err: any) {
      console.error("Falha ao adicionar produto:", err);
      setError(err.message || "Não foi possível adicionar o produto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gray-700 p-4 rounded-md mb-8">
      <h3 className="text-xl font-semibold mb-3 text-gray-200">Adicionar Novo Produto</h3>
      <div>
        <label htmlFor="nomeProduto" className="block text-sm font-medium text-gray-300 mb-1">
          Nome do Produto <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="nomeProduto"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        />
      </div>

      <div>
        <label htmlFor="categoriaProduto" className="block text-sm font-medium text-gray-300 mb-1">
          Categoria <span className="text-red-500">*</span>
        </label>
        <select
          id="categoriaProduto"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        >
          <option value="">Selecione uma categoria</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="precoProduto" className="block text-sm font-medium text-gray-300 mb-1">
          Preço (ex: 19.99) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          id="precoProduto"
          value={preco}
          onChange={(e) => setPreco(e.target.value)}
          step="0.01"
          placeholder="0.00"
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        />
      </div>

       <div>
        <label htmlFor="descricaoProduto" className="block text-sm font-medium text-gray-300 mb-1">
          Descrição (Opcional)
        </label>
        <textarea
          id="descricaoProduto"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
        />
      </div>
      
      <button
        type="submit"
        disabled={isSubmitting || !nome.trim() || !preco.trim() || !categoriaId}
        className="w-full bg-[#20c2ef] hover:bg-[#1aa8d1] text-[#030607] font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Adicionando...' : 'Adicionar Produto'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}