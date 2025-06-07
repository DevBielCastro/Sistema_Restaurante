// frontend/src/components/admin/cardapio/GerenciarProdutosPromocaoModal.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';

// Interfaces para os dados que o modal irá manipular
interface Promocao {
  id: number;
  nome_promocao: string;
}
interface Produto {
  id: number;
  nome: string;
}
interface ProdutoVinculado extends Produto {
  vinculo_id: number; // ID da tabela promocao_produtos
  quantidade_no_combo: number;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  promocao: Promocao | null;
  todosOsProdutos: Produto[]; // Lista de todos os produtos do restaurante
  restauranteId: number;
  token: string;
}

export default function GerenciarProdutosPromocaoModal({
  isOpen,
  onClose,
  promocao,
  todosOsProdutos,
  restauranteId,
  token,
}: ModalProps) {
  const [produtosVinculados, setProdutosVinculados] = useState<ProdutoVinculado[]>([]);
  const [produtoParaAdicionar, setProdutoParaAdicionar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar os produtos já vinculados a esta promoção
  const fetchProdutosVinculados = async () => {
    if (!promocao) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/promocoes/${promocao.id}/produtos`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("Falha ao buscar produtos da promoção.");
      const data = await response.json();
      setProdutosVinculados(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Efeito que busca os dados sempre que o modal é aberto para uma nova promoção
  useEffect(() => {
    if (isOpen && promocao) {
      fetchProdutosVinculados();
    }
  }, [isOpen, promocao]);

  // Handler para adicionar (vincular) um produto
  const handleAdicionarProduto = async (e: FormEvent) => {
    e.preventDefault();
    if (!produtoParaAdicionar || !promocao) return;

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/promocoes/${promocao.id}/produtos`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ produto_id: parseInt(produtoParaAdicionar) })
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao adicionar produto.");
      }
      setProdutoParaAdicionar(''); // Limpa o select
      fetchProdutosVinculados(); // Atualiza a lista
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handler para remover (desvincular) um produto
  const handleRemoverProduto = async (produtoId: number) => {
    if (!promocao) return;
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/promocoes/${promocao.id}/produtos/${produtoId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (!response.ok) throw new Error("Falha ao remover produto.");
      fetchProdutosVinculados(); // Atualiza a lista
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;

  // Filtra para mostrar no dropdown apenas produtos que ainda não estão na promoção
  const produtosDisponiveis = todosOsProdutos.filter(
    p => !produtosVinculados.some(pv => pv.id === p.id)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      <div className="bg-[#171717] p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-[#20c2ef]">
            Gerenciar Produtos: <span className="font-bold">{promocao?.nome_promocao}</span>
          </h2>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-white">&times;</button>
        </div>

        {error && <p className="bg-red-900 text-red-300 p-2 rounded mb-4">{error}</p>}
        
        {/* Formulário para Adicionar Produtos */}
        <form onSubmit={handleAdicionarProduto} className="flex gap-2 mb-6 pb-6 border-b border-gray-700">
          <select 
            value={produtoParaAdicionar}
            onChange={e => setProdutoParaAdicionar(e.target.value)}
            className="flex-grow p-2 rounded bg-[#030607] border border-gray-600 outline-none"
          >
            <option value="">Selecione um produto para adicionar...</option>
            {produtosDisponiveis.map(p => (
              <option key={p.id} value={p.id}>{p.nome}</option>
            ))}
          </select>
          <button type="submit" disabled={!produtoParaAdicionar} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50">
            Adicionar
          </button>
        </form>

        {/* Lista de Produtos Vinculados */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-200">Produtos na Promoção</h3>
          {loading ? (
            <p>Carregando...</p>
          ) : produtosVinculados.length > 0 ? (
            <div className="space-y-2">
              {produtosVinculados.map(p => (
                <div key={p.vinculo_id} className="bg-[#030607] p-3 rounded flex justify-between items-center">
                  <span>{p.nome}</span>
                  <button onClick={() => handleRemoverProduto(p.id)} className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">
                    Desvincular
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 italic">Nenhum produto vinculado a esta promoção.</p>
          )}
        </div>
      </div>
    </div>
  );
}