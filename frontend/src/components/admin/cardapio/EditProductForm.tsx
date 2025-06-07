// frontend/src/components/admin/cardapio/EditProductForm.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Image from 'next/image';

// ... (Interface Categoria e Produto)
interface Categoria { id: number; nome: string; }
interface Produto { id: number; nome: string; descricao?: string | null; preco: number; categoria_id: number; ativo: boolean; url_foto?: string | null; }


interface EditProductFormProps {
  restauranteId: number;
  token: string;
  produto: Produto;
  categorias: Categoria[];
  onProductUpdated: (message: string) => void;
  onCancelEdit: () => void;
}

export default function EditProductForm({
  restauranteId,
  token,
  produto,
  categorias,
  onProductUpdated,
  onCancelEdit,
}: EditProductFormProps) {

  const [formData, setFormData] = useState({
    nome: produto.nome,
    descricao: produto.descricao || '',
    preco: String(produto.preco),
    categoria_id: String(produto.categoria_id),
    ativo: produto.ativo,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData({
        nome: produto.nome,
        descricao: produto.descricao || '',
        preco: String(produto.preco),
        categoria_id: String(produto.categoria_id),
        ativo: produto.ativo,
    });
    setError(null);
  }, [produto]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    
    setFormData(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleTextChangesSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    const dadosUpdateProduto = {
        ...formData,
        preco: parseFloat(formData.preco),
        categoria_id: parseInt(formData.categoria_id, 10)
    };

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${restauranteId}/produtos/${produto.id}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(dadosUpdateProduto),
        }
      );
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || "Falha ao atualizar produto.");
      onProductUpdated(`Produto "${responseData.nome}" atualizado com sucesso!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // <<<--- NOVA FUNÇÃO PARA UPLOAD DA IMAGEM
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    const data = new FormData();
    data.append('imagem', file); // 'imagem' deve corresponder ao que o multer espera

    try {
        const response = await fetch(
            `http://localhost:3001/api/v1/restaurantes/${restauranteId}/produtos/${produto.id}/imagem`,
            {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: data,
            }
        );
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.message || "Falha no upload da imagem.");

        // Notifica a página pai para recarregar os dados e mostrar a nova imagem
        onProductUpdated(responseData.message);

    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
        {/* Seção de Upload de Imagem */}
        <div className="p-4 border border-gray-700 rounded-md">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Imagem do Produto</h3>
            {produto.url_foto && (
                <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-2">Imagem Atual:</p>
                    <Image src={`http://localhost:3001${produto.url_foto}`} alt={`Imagem de ${produto.nome}`} width={100} height={100} className="rounded object-cover"/>
                </div>
            )}
            <div>
                <label htmlFor="imagemProduto" className="block text-sm font-medium text-gray-300 mb-1">
                    {produto.url_foto ? 'Alterar Imagem' : 'Adicionar Imagem'}
                </label>
                <input
                    type="file"
                    id="imagemProduto"
                    name="imagem"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isSubmitting}
                    className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
            </div>
        </div>

        {/* Formulário para Edição de Outros Dados */}
        <form onSubmit={handleTextChangesSubmit} className="space-y-4 p-4 border border-yellow-500 rounded-md">
            <h3 className="text-lg font-semibold text-yellow-400 mb-3">Editar Detalhes do Produto</h3>
            
            {/* ... (inputs para nome, categoria, preco, descricao, ativo) ... */}
            <div>
              <label htmlFor="editNomeProduto" className="text-sm">Nome</label>
              <input type="text" name="nome" id="editNomeProduto" value={formData.nome} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
            </div>
            <div>
                <label htmlFor="editCategoriaProduto" className="text-sm">Categoria</label>
                <select name="categoria_id" id="editCategoriaProduto" value={formData.categoria_id} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600">
                    {categorias.map(cat => ( <option key={cat.id} value={cat.id}>{cat.nome}</option> ))}
                </select>
            </div>
            <div>
                <label htmlFor="editPrecoProduto" className="text-sm">Preço</label>
                <input type="number" name="preco" id="editPrecoProduto" value={formData.preco} onChange={handleInputChange} step="0.01" className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
            </div>
            <div>
                <label htmlFor="editDescricaoProduto" className="text-sm">Descrição</label>
                <textarea name="descricao" id="editDescricaoProduto" value={formData.descricao} onChange={handleInputChange} rows={2} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
            </div>
            <div className="flex items-center">
                <input type="checkbox" name="ativo" id="editAtivoProduto" checked={formData.ativo} onChange={handleInputChange} className="h-4 w-4 rounded mr-2"/>
                <label htmlFor="editAtivoProduto" className="text-sm">Ativo</label>
            </div>
            
            <div className="flex space-x-3 pt-4 border-t border-gray-700">
                <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50">
                    {isSubmitting ? 'Salvando...' : 'Salvar Detalhes'}
                </button>
                <button type="button" onClick={onCancelEdit} disabled={isSubmitting} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded disabled:opacity-50">
                    Cancelar Edição
                </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}
        </form>
    </div>
  );
}