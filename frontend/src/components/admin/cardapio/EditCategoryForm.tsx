// frontend/src/components/admin/cardapio/EditCategoryForm.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';

interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  ordem_exibicao?: number | null;
  ativo?: boolean | null;
}

interface EditCategoryFormProps {
  restauranteId: number;
  token: string;
  categoria: Categoria;
  onCategoryUpdated: (message: string) => void; // Agora espera uma mensagem de sucesso
  onCancelEdit: () => void;
}

export default function EditCategoryForm({
  restauranteId,
  token,
  categoria,
  onCategoryUpdated,
  onCancelEdit,
}: EditCategoryFormProps) {
  const [nome, setNome] = useState(categoria.nome);
  const [descricao, setDescricao] = useState(categoria.descricao || '');
  const [ordemExibicao, setOrdemExibicao] = useState(categoria.ordem_exibicao ?? 0);
  const [ativo, setAtivo] = useState(categoria.ativo ?? true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [successMessage, setSuccessMessage] = useState<string | null>(null); // Removido daqui

  useEffect(() => {
    setNome(categoria.nome);
    setDescricao(categoria.descricao || '');
    setOrdemExibicao(categoria.ordem_exibicao ?? 0);
    setAtivo(categoria.ativo ?? true);
    setError(null); // Limpa erros ao carregar nova categoria para edição
  }, [categoria]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    // setSuccessMessage(null); // Removido

    const dadosUpdateCategoria: Partial<Omit<Categoria, 'id'>> = {};
    if (nome.trim() !== categoria.nome) dadosUpdateCategoria.nome = nome.trim();
    if (descricao.trim() !== (categoria.descricao || '')) {
      dadosUpdateCategoria.descricao = descricao.trim() === '' ? null : descricao.trim();
    } else if (descricao.trim() === '' && categoria.descricao) {
      dadosUpdateCategoria.descricao = null;
    }
    if (ordemExibicao !== (categoria.ordem_exibicao ?? 0)) dadosUpdateCategoria.ordem_exibicao = ordemExibicao;
    if (ativo !== (categoria.ativo ?? true)) dadosUpdateCategoria.ativo = ativo;

    if (Object.keys(dadosUpdateCategoria).length === 0) {
      setError("Nenhuma alteração detectada para atualizar.");
      setIsSubmitting(false);
      return;
    }
    if (dadosUpdateCategoria.nome !== undefined && !dadosUpdateCategoria.nome.trim()) {
        setError("O nome da categoria não pode ser vazio se estiver sendo alterado.");
        setIsSubmitting(false);
        return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/categorias/${categoria.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dadosUpdateCategoria),
        }
      );
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.details || `Erro HTTP: ${response.status}`);
      }
      
      // Chamo onCategoryUpdated com a mensagem de sucesso
      onCategoryUpdated(`Categoria "${responseData.nome}" atualizada com sucesso!`);
      // Não precisamos mais chamar onCancelEdit aqui, a página pai cuidará de fechar se necessário

    } catch (err: any) {
      console.error("Falha ao atualizar categoria:", err);
      setError(err.message || "Não foi possível atualizar a categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-yellow-500 p-4 rounded-md">
      {/* ... campos do formulário (nome, descricao, ordem, ativo) ... */}
       <div>
            <label htmlFor={`editNomeCategoria-${categoria.id}`} className="block text-sm font-medium text-gray-300 mb-1">
              Nome da Categoria <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id={`editNomeCategoria-${categoria.id}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
            />
          </div>
          <div>
            <label htmlFor={`editDescricaoCategoria-${categoria.id}`} className="block text-sm font-medium text-gray-300 mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              id={`editDescricaoCategoria-${categoria.id}`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
            />
          </div>
          <div>
            <label htmlFor={`editOrdemCategoria-${categoria.id}`} className="block text-sm font-medium text-gray-300 mb-1">
              Ordem de Exibição
            </label>
            <input
              type="number"
              id={`editOrdemCategoria-${categoria.id}`}
              value={ordemExibicao}
              onChange={(e) => setOrdemExibicao(parseInt(e.target.value, 10) || 0)}
              className="w-full p-2 rounded bg-[#030607] border border-gray-600 focus:border-[#20c2ef] focus:ring-[#20c2ef] outline-none"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`editAtivoCategoria-${categoria.id}`}
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-[#030607] text-[#20c2ef] focus:ring-[#20c2ef] mr-2"
            />
            <label htmlFor={`editAtivoCategoria-${categoria.id}`} className="text-sm font-medium text-gray-300">
              Ativa
            </label>
          </div>
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        <button
          type="button"
          onClick={onCancelEdit}
          disabled={isSubmitting}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
      {/* O estado successMessage foi removido daqui */}
      {error && <p className="text-red-500 mt-2 p-2 bg-red-900 bg-opacity-50 rounded">{error}</p>}
    </form>
  );
}