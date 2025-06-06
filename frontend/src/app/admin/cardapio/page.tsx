// frontend/src/app/admin/cardapio/page.tsx
"use client";

import { useState, useEffect } from 'react';
import AddCategoryForm from '@/components/admin/cardapio/AddCategoryForm';
import EditCategoryForm from '@/components/admin/cardapio/EditCategoryForm';
import AddProductForm from '@/components/admin/cardapio/AddProductForm';

interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  ordem_exibicao?: number | null;
  ativo?: boolean | null;
  data_criacao?: string;
  data_atualizacao?: string;
}

interface Produto {
    id: number;
    nome: string;
    descricao?: string | null;
    preco: number;
    categoria_id: number;
    nome_categoria?: string;
    url_foto?: string | null;
    ativo: boolean;
    ordem_exibicao: number;
}

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export default function CardapioAdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState<Categoria | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const TEMPORARY_RESTAURANTE_ID = 5;
  const TEMPORARY_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50ZUlkIjo1LCJlbWFpbCI6ImNoZWZlQGNhbnRpbmFkb3ZhbGUuY29tIiwibm9tZVNjaGVtYURiIjoiY2FudGluYV92YWxlX2ZlbGl6X3NjaGVtYSIsImlhdCI6MTc0ODg5NzcwNywiZXhwIjoxNzQ5NTAyNTA3fQ.tTcgorQtNXoLObW3b-w0Y4ixPHaocDNCAKRlEvdnS8Y";

  const fetchData = async () => {
    if (!TEMPORARY_JWT_TOKEN || !TEMPORARY_RESTAURANTE_ID) {
      setApiError("ID do restaurante ou Token JWT de teste não configurado.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setApiError(null);

    try {
      const headers = { 
        'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`, 
        'Content-Type': 'application/json' 
      };

      const [categoriasResponse, produtosResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias`, { headers }),
        fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/produtos`, { headers })
      ]);

      if (!categoriasResponse.ok) {
        const errorData = await categoriasResponse.json();
        throw new Error(errorData.message || `Erro ao buscar categorias: ${categoriasResponse.status}`);
      }
      if (!produtosResponse.ok) {
        const errorData = await produtosResponse.json();
        throw new Error(errorData.message || `Erro ao buscar produtos: ${produtosResponse.status}`);
      }

      const categoriasData: Categoria[] = await categoriasResponse.json();
      const produtosDataRaw = await produtosResponse.json();

      const produtosData: Produto[] = produtosDataRaw.map((prod: any) => ({
        ...prod,
        preco: Number(prod.preco),
      }));

      setCategorias(categoriasData);
      setProdutos(produtosData);

    } catch (err: any) {
      console.error("Erro ao buscar dados do cardápio:", err);
      setApiError(err.message || "Falha ao carregar dados do cardápio.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCrudSuccess = (message: string) => {
    setFeedbackMessage({ type: 'success', text: message });
    setIsEditing(false);
    setCategoriaParaEditar(null);
    fetchData(); 
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleStartEditCategory = (categoria: Categoria) => {
    setFeedbackMessage(null);
    setCategoriaParaEditar(categoria);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setCategoriaParaEditar(null);
    setFeedbackMessage(null);
  };

  const handleDeleteCategory = async (categoriaId: number, categoriaNome: string) => {
    if (!window.confirm(`Tem certeza que deseja deletar a categoria "${categoriaNome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias/${categoriaId}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` } }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }

      handleCrudSuccess(`Categoria "${categoriaNome}" deletada com sucesso!`);

    } catch (err: any) {
      console.error("Falha ao deletar categoria:", err);
      setFeedbackMessage({ type: 'error', text: err.message || "Não foi possível deletar a categoria." });
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-[#030607] text-white p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#20c2ef]">Gerenciamento do Cardápio</h1>
        <p className="text-lg text-gray-300 mt-2">Adicione, edite ou remova categorias e produtos do seu cardápio.</p>
      </header>

      {feedbackMessage && (
        <div className={`p-4 mb-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {feedbackMessage.text}
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">Categorias</h2>
          
          {isEditing && categoriaParaEditar ? (
            <EditCategoryForm
              restauranteId={TEMPORARY_RESTAURANTE_ID}
              token={TEMPORARY_JWT_TOKEN}
              categoria={categoriaParaEditar}
              onCategoryUpdated={handleCrudSuccess}
              onCancelEdit={handleCancelEdit}
            />
          ) : (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-3 text-gray-200">Adicionar Nova Categoria</h3>
              <AddCategoryForm 
                restauranteId={TEMPORARY_RESTAURANTE_ID}
                token={TEMPORARY_JWT_TOKEN}
                onCategoryAdded={() => handleCrudSuccess("Nova categoria adicionada com sucesso!")}
              />
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-200">Categorias Existentes</h3>
            {loading && <p className="text-gray-400">Carregando categorias...</p>}
            {apiError && !loading && <p className="text-red-500">Erro ao carregar: {apiError}</p>}
            {!loading && !apiError && categorias.length > 0 && (
              <div className="mt-4 space-y-2">
                {categorias.map((cat) => (
                  <div key={cat.id} className="bg-[#030607] p-3 rounded flex justify-between items-center">
                    <div>
                      <span className="font-semibold">{cat.nome}</span>
                      {cat.descricao && <p className="text-sm text-gray-400">{cat.descricao}</p>}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleStartEditCategory(cat)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id, cat.nome)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!loading && !apiError && categorias.length === 0 && (
                 <p className="text-gray-400">Nenhuma categoria encontrada para este restaurante.</p>
            )}
          </div>
        </section>

        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">Produtos</h2>
          
          <AddProductForm
            restauranteId={TEMPORARY_RESTAURANTE_ID}
            token={TEMPORARY_JWT_TOKEN}
            categorias={categorias}
            onProductAdded={() => handleCrudSuccess("Novo produto adicionado com sucesso!")}
          />
          
          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-200">Produtos Existentes</h3>
            {loading && <p className="text-gray-400">Carregando produtos...</p>}
            {apiError && !loading && <p className="text-red-500">Erro ao carregar: {apiError}</p>}
            {!loading && !apiError && (
              categorias.length > 0 ? (
                <div className="space-y-6">
                  {categorias.map((cat) => (
                    <div key={`cat-prod-${cat.id}`}>
                      <h4 className="text-lg font-medium text-gray-300 border-b border-gray-700 pb-1 mb-3">{cat.nome}</h4>
                      {produtos.filter(p => p.categoria_id === cat.id).length > 0 ? (
                         produtos.filter(p => p.categoria_id === cat.id).map(prod => (
                           <div key={prod.id} className="bg-[#030607] p-3 mb-2 rounded flex justify-between items-start">
                             <div className="flex-1">
                               <p className="font-semibold">{prod.nome}</p>
                               <p className="text-sm text-gray-400">{prod.descricao}</p>
                               <p className="text-sm text-green-400 mt-1">R$ {prod.preco.toFixed(2).replace('.', ',')}</p>
                             </div>
                             <div className="flex flex-col space-y-2 ml-4">
                               <button className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded">Editar</button>
                               <button className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Deletar</button>
                             </div>
                           </div>
                         ))
                      ) : (
                        <p className="text-sm text-gray-500 italic">Nenhum produto nesta categoria.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Adicione categorias primeiro para poder listar produtos.</p>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}