// frontend/src/app/admin/cardapio/page.tsx
"use client";

import { useState, useEffect } from 'react';
import AddCategoryForm from '@/components/admin/cardapio/AddCategoryForm';
import EditCategoryForm from '@/components/admin/cardapio/EditCategoryForm';

interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  ordem_exibicao?: number | null;
  ativo?: boolean | null;
  data_criacao?: string;
  data_atualizacao?: string;
}

interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export default function CardapioAdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [categoriaParaEditar, setCategoriaParaEditar] = useState<Categoria | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const TEMPORARY_RESTAURANTE_ID = 5;
  const TEMPORARY_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50ZUlkIjo1LCJlbWFpbCI6ImNoZWZlQGNhbnRpbmFkb3ZhbGUuY29tIiwibm9tZVNjaGVtYURiIjoiY2FudGluYV92YWxlX2ZlbGl6X3NjaGVtYSIsImlhdCI6MTc0ODg5NzcwNywiZXhwIjoxNzQ5NTAyNTA3fQ.tTcgorQtNXoLObW3b-w0Y4ixPHaocDNCAKRlEvdnS8Y"; // Seu token válido

  const fetchCategorias = async () => {
    // ... (código da função fetchCategorias - sem alterações)
    if (!TEMPORARY_JWT_TOKEN) { 
      setApiError("Token JWT de teste não fornecido.");
      setLoading(false);
      return;
    }
    if (!TEMPORARY_RESTAURANTE_ID) {
      setApiError("ID do restaurante de teste não configurado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`, 'Content-Type': 'application/json' } }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      const data: Categoria[] = await response.json();
      setCategorias(data);
    } catch (err: any) {
      console.error("Erro ao buscar categorias:", err);
      setApiError(err.message || "Falha ao carregar categorias.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategorias();
  }, []);

  const handleCrudSuccess = (message: string) => {
    setFeedbackMessage({ type: 'success', text: message });
    setIsEditing(false);
    setCategoriaParaEditar(null);
    fetchCategorias();
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

  // Nova função para lidar com a deleção de categoria
  const handleDeleteCategory = async (categoriaId: number, categoriaNome: string) => {
    setFeedbackMessage(null); // Limpa feedback anterior

    // Confirmação do usuário
    if (!window.confirm(`Tem certeza que deseja deletar a categoria "${categoriaNome}"? Esta ação não pode ser desfeita.`)) {
      return; // Usuário cancelou
    }

    console.log(`Tentando deletar categoria ID: ${categoriaId} para restaurante ID: ${TEMPORARY_RESTAURANTE_ID}`);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias/${categoriaId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        // Se a resposta não for OK, tento ler o corpo JSON para a mensagem de erro do backend
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` })); // Fallback se não houver corpo JSON
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }

      // Se o status for 204 No Content (deleção bem-sucedida), response.json() daria erro.
      // Então, para 204, a mensagem de sucesso é definida diretamente.
      // Para outros status de sucesso (ex: 200 com corpo, embora 204 seja mais comum para DELETE),
      // poderíamos usar responseData.message.
      if (response.status === 204) {
        handleCrudSuccess(`Categoria "${categoriaNome}" deletada com sucesso!`);
      } else {
        // Caso a API retorne um corpo JSON com uma mensagem em um status 200 OK para delete
        const responseData = await response.json().catch(() => null);
        handleCrudSuccess(responseData?.message || `Categoria "${categoriaNome}" deletada com sucesso!`);
      }

    } catch (err: any) {
      console.error("Falha ao deletar categoria:", err);
      setFeedbackMessage({ type: 'error', text: err.message || "Não foi possível deletar a categoria." });
      setTimeout(() => setFeedbackMessage(null), 5000); // Mostra erro por mais tempo
    }
  };

  return (
    <div className="min-h-screen bg-[#030607] text-white p-8">
      <header className="mb-10">
        {/* ... (cabeçalho) ... */}
        <h1 className="text-4xl font-bold text-[#20c2ef]">
          Gerenciamento do Cardápio
        </h1>
        <p className="text-lg text-gray-300 mt-2">
          Adicione, edite ou remova categorias e produtos do seu cardápio.
        </p>
      </header>

      {feedbackMessage && (
        <div className={`p-4 mb-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {feedbackMessage.text}
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">
            Categorias
          </h2>
          
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
            {apiError && <p className="text-red-500">Erro ao carregar: {apiError}</p>}
            {!loading && !apiError && (
              categorias.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {categorias.map((cat) => (
                    <div key={cat.id} className="bg-[#030607] p-3 rounded flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{cat.nome}</span>
                        {cat.descricao && <p className="text-sm text-gray-400">{cat.descricao}</p>}
                        <span className="text-xs text-gray-500"> (ID: {cat.id}, Ordem: {cat.ordem_exibicao ?? 0}, Ativo: {typeof cat.ativo === 'boolean' ? (cat.ativo ? 'Sim' : 'Não') : 'N/A'})</span>
                      </div>
                      <div className="flex space-x-2"> {/* Envolve os botões para dar espaço */}
                        <button 
                          onClick={() => handleStartEditCategory(cat)}
                          className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id, cat.nome)} // <<<--- BOTÃO DE DELETAR
                          className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">Nenhuma categoria encontrada para este restaurante.</p>
              )
            )}
          </div>
        </section>

        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          {/* ... (seção de produtos) ... */}
           <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">
            Produtos
          </h2>
          {/* ... */}
        </section>
      </main>
    </div>
  );
}