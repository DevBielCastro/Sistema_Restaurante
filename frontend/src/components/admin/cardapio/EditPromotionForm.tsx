// frontend/src/components/admin/cardapio/EditPromotionForm.tsx
"use client";

import { useState, useEffect, FormEvent } from 'react';

interface Promocao {
  id: number;
  nome_promocao: string;
  descricao_promocao?: string | null;
  tipo_promocao: string;
  data_inicio: string;
  data_fim?: string | null;
  ativo: boolean;
  valor_desconto_percentual?: number | null;
  preco_promocional_combo?: number | null;
}

interface EditPromotionFormProps {
  restauranteId: number;
  token: string;
  promocao: Promocao;
  onPromotionUpdated: (message: string) => void;
  onCancelEdit: () => void;
}

const tiposDePromocao = [
  { value: 'DESCONTO_PERCENTUAL_PRODUTO', label: 'Desconto % em Produto' },
  { value: 'PRECO_FIXO_PRODUTO', label: 'Preço Fixo em Produto' },
  { value: 'COMBO_PRECO_FIXO', label: 'Combo por Preço Fixo' },
  { value: 'LEVE_X_PAGUE_Y_PRODUTO', label: 'Leve X Pague Y' },
];

const formatISOForInput = (isoString: string | null | undefined) => {
  if (!isoString) return '';
  return isoString.slice(0, 16);
};

export default function EditPromotionForm({
  restauranteId,
  token,
  promocao,
  onPromotionUpdated,
  onCancelEdit,
}: EditPromotionFormProps) {

  const [nomePromocao, setNomePromocao] = useState(promocao.nome_promocao);
  const [tipoPromocao, setTipoPromocao] = useState(promocao.tipo_promocao);
  const [ativo, setAtivo] = useState(promocao.ativo);
  // Adicione outros states para os campos que você quer editar
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNomePromocao(promocao.nome_promocao);
    setTipoPromocao(promocao.tipo_promocao);
    setAtivo(promocao.ativo);
    setError(null);
  }, [promocao]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const dadosUpdate: any = {};
    if (nomePromocao.trim() !== promocao.nome_promocao) dadosUpdate.nome_promocao = nomePromocao.trim();
    if (tipoPromocao !== promocao.tipo_promocao) dadosUpdate.tipo_promocao = tipoPromocao;
    if (ativo !== promocao.ativo) dadosUpdate.ativo = ativo;

    if (Object.keys(dadosUpdate).length === 0) {
      setError("Nenhuma alteração detectada.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/promocoes/${promocao.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dadosUpdate),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || `Erro HTTP: ${response.status}`);
      }
      
      onPromotionUpdated(`Promoção "${responseData.nome_promocao}" atualizada com sucesso!`);

    } catch (err: any) {
      setError(err.message || "Não foi possível atualizar a promoção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-yellow-500 p-4 rounded-md mb-8">
      <h3 className="text-xl font-semibold mb-3 text-yellow-400">Editando Promoção: {promocao.nome_promocao}</h3>
      
      <div>
        <label htmlFor="editNomePromocao" className="text-sm">Nome da Promoção</label>
        <input type="text" id="editNomePromocao" value={nomePromocao} onChange={e => setNomePromocao(e.target.value)} className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
      </div>

      <div className="flex items-center">
          <input type="checkbox" id="editAtivoPromocao" checked={ativo} onChange={e => setAtivo(e.target.checked)} className="h-4 w-4 rounded mr-2"/>
          <label htmlFor="editAtivoPromocao" className="text-sm">Ativa</label>
      </div>

      <div className="flex space-x-3 mt-4">
        <button type="submit" disabled={isSubmitting} className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 px-4 rounded disabled:opacity-50">
          {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
        </button>
        <button type="button" onClick={onCancelEdit} disabled={isSubmitting} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded disabled:opacity-50">
          Cancelar
        </button>
      </div>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}