// frontend/src/components/admin/cardapio/AddPromotionForm.tsx
"use client";

import { useState, FormEvent } from 'react';

interface AddPromotionFormProps {
  restauranteId: number;
  token: string;
  onPromotionAdded: () => void;
}

// Tipos de promoção que o backend aceita
const tiposDePromocao = [
  { value: 'DESCONTO_PERCENTUAL_PRODUTO', label: 'Desconto % em Produto' },
  { value: 'PRECO_FIXO_PRODUTO', label: 'Preço Fixo em Produto' },
  { value: 'COMBO_PRECO_FIXO', label: 'Combo por Preço Fixo' },
  { value: 'LEVE_X_PAGUE_Y_PRODUTO', label: 'Leve X Pague Y' },
];

export default function AddPromotionForm({ restauranteId, token, onPromotionAdded }: AddPromotionFormProps) {
  // Estados para cada campo do formulário
  const [nomePromocao, setNomePromocao] = useState('');
  const [descricaoPromocao, setDescricaoPromocao] = useState('');
  const [tipoPromocao, setTipoPromocao] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Campos condicionais
  const [valorDesconto, setValorDesconto] = useState('');
  const [precoCombo, setPrecoCombo] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validação básica no frontend
    if (!nomePromocao || !tipoPromocao || !dataInicio) {
      setError("Nome, Tipo e Data de Início são obrigatórios.");
      setIsSubmitting(false);
      return;
    }
    
    // Monta o objeto de dados para enviar ao backend
    const promocaoData: any = {
      nome_promocao: nomePromocao.trim(),
      descricao_promocao: descricaoPromocao.trim() || null,
      tipo_promocao: tipoPromocao,
      data_inicio: new Date(dataInicio).toISOString(),
      data_fim: dataFim ? new Date(dataFim).toISOString() : null,
    };

    // Adiciona os campos de valor condicionalmente, conforme o tipo
    if (tipoPromocao === 'DESCONTO_PERCENTUAL_PRODUTO') {
      promocaoData.valor_desconto_percentual = parseFloat(valorDesconto);
    }
    if (tipoPromocao === 'COMBO_PRECO_FIXO') {
      promocaoData.preco_promocional_combo = parseFloat(precoCombo);
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/promocoes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(promocaoData),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || responseData.details || `Erro HTTP: ${response.status}`);
      }
      
      // Limpa formulário e notifica a página pai
      setNomePromocao('');
      setDescricaoPromocao('');
      setTipoPromocao('');
      setDataInicio('');
      setDataFim('');
      setValorDesconto('');
      setPrecoCombo('');
      
      onPromotionAdded();

    } catch (err: any) {
      console.error("Falha ao adicionar promoção:", err);
      setError(err.message || "Não foi possível adicionar a promoção.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-gray-700 p-4 rounded-md mb-8">
      <h3 className="text-xl font-semibold mb-3 text-gray-200">Adicionar Nova Promoção</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="nomePromocao" className="block text-sm font-medium text-gray-300 mb-1">Nome da Promoção</label>
          <input type="text" id="nomePromocao" value={nomePromocao} onChange={(e) => setNomePromocao(e.target.value)} className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
        </div>
        <div>
          <label htmlFor="tipoPromocao" className="block text-sm font-medium text-gray-300 mb-1">Tipo de Promoção</label>
          <select id="tipoPromocao" value={tipoPromocao} onChange={(e) => setTipoPromocao(e.target.value)} className="w-full p-2 rounded bg-[#030607] border border-gray-600">
            <option value="">Selecione um tipo</option>
            {tiposDePromocao.map(tipo => (
              <option key={tipo.value} value={tipo.value}>{tipo.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Inputs Condicionais */}
      {tipoPromocao === 'DESCONTO_PERCENTUAL_PRODUTO' && (
        <div>
          <label htmlFor="valorDesconto" className="block text-sm font-medium text-gray-300 mb-1">Valor do Desconto (%)</label>
          <input type="number" id="valorDesconto" value={valorDesconto} onChange={(e) => setValorDesconto(e.target.value)} step="0.01" placeholder="Ex: 15" className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
        </div>
      )}
       {tipoPromocao === 'COMBO_PRECO_FIXO' && (
        <div>
          <label htmlFor="precoCombo" className="block text-sm font-medium text-gray-300 mb-1">Preço Fixo do Combo (R$)</label>
          <input type="number" id="precoCombo" value={precoCombo} onChange={(e) => setPrecoCombo(e.target.value)} step="0.01" placeholder="Ex: 29.90" className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
        </div>
      )}

      <div>
        <label htmlFor="descricaoPromocao" className="block text-sm font-medium text-gray-300 mb-1">Descrição</label>
        <textarea id="descricaoPromocao" value={descricaoPromocao} onChange={(e) => setDescricaoPromocao(e.target.value)} rows={2} className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-300 mb-1">Data de Início</label>
          <input type="datetime-local" id="dataInicio" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
        </div>
        <div>
          <label htmlFor="dataFim" className="block text-sm font-medium text-gray-300 mb-1">Data de Fim (Opcional)</label>
          <input type="datetime-local" id="dataFim" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full p-2 rounded bg-[#030607] border border-gray-600"/>
        </div>
      </div>
      
      <button type="submit" disabled={isSubmitting} className="w-full bg-[#20c2ef] hover:bg-[#1aa8d1] text-[#030607] font-semibold py-2 px-4 rounded disabled:opacity-50">
        {isSubmitting ? 'Adicionando...' : 'Adicionar Promoção'}
      </button>

      {error && <p className="text-red-500 mt-2">{error}</p>}
    </form>
  );
}