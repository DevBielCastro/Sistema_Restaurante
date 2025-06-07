// frontend/src/app/admin/configuracoes/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Interface para os dados do restaurante
interface Restaurante {
  id: number;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  endereco_completo: string | null;
  telefone_contato: string | null;
  email_responsavel: string;
  path_logo: string | null;
}

// Interface para as mensagens de feedback
interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export default function ConfiguracoesPage() {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Restaurante>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const TEMPORARY_RESTAURANTE_ID = 7;
  const TEMPORARY_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50ZUlkIjo3LCJlbWFpbCI6ImNoZWZlQGNhbnRpbmFkb3ZhbGUuY29tIiwibm9tZVNjaGVtYURiIjoiY2FudGluYV92YWxlX2ZlbGl6X3NjaGVtYSIsImlhdCI6MTc0OTMwNjI1NSwiZXhwIjoxNzQ5OTExMDU1fQ.eg4Mm5qcysddwWNyPgox8R1RcgjkGzh_OujWzvkWafA";

  const fetchRestauranteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}`,
        {
          headers: {
            'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`
          }
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao buscar dados do restaurante.");
      }
      const data: Restaurante = await response.json();
      setRestaurante(data);
      setFormData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestauranteData();
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSaveChanges = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setFeedbackMessage(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Falha ao salvar as alterações.");
      }
      
      fetchRestauranteData();
      setIsEditing(false);
      setFeedbackMessage({ type: 'success', text: 'Informações salvas com sucesso!' });

    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  // <<<--- NOVA FUNÇÃO PARA UPLOAD DE ARQUIVO
  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFeedbackMessage(null);

    const data = new FormData();
    data.append('logo', file);

    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/logo`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`,
          },
          body: data,
        }
      );

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || "Falha no upload da logo.");
      }

      // Atualiza o estado local para exibir a nova logo imediatamente
      setRestaurante(prev => prev ? { ...prev, path_logo: responseData.path_logo } : null);
      setFeedbackMessage({ type: 'success', text: responseData.message });

    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#030607] text-white p-8">
      <header className="mb-10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-[#20c2ef]">Configurações do Restaurante</h1>
          <p className="text-lg text-gray-300 mt-2">Veja e edite as informações do seu estabelecimento.</p>
        </div>
        <Link href="/admin/cardapio" className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded">
          Voltar para o Cardápio
        </Link>
      </header>

      {feedbackMessage && (
        <div className={`p-4 mb-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-600' : 'bg-red-500'}`}>
          {feedbackMessage.text}
        </div>
      )}
      
      <main className="bg-[#171717] p-6 rounded-lg shadow-lg">
        {loading && <p>Carregando...</p>}
        {error && !loading && <p className="text-red-500">Erro: {error}</p>}
        {restaurante && !loading && (
          isEditing ? (
            <form onSubmit={handleSaveChanges} className="space-y-4">
              <div>
                <label htmlFor="logoUpload" className="text-sm font-semibold text-gray-400">Alterar Logo</label>
                <input 
                  type="file" 
                  name="logo" 
                  id="logoUpload" 
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleLogoUpload}
                  className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                />
                <p className="text-xs text-gray-500 mt-1">Selecione um arquivo para fazer o upload e salvar automaticamente.</p>
              </div>

              <div className="pt-4 border-t border-gray-600">
                <label className="text-lg font-semibold text-gray-300">Editar outras informações</label>
              </div>

              <div>
                <label htmlFor="nome_fantasia" className="text-sm font-semibold text-gray-400">Nome Fantasia</label>
                <input type="text" name="nome_fantasia" id="nome_fantasia" value={formData.nome_fantasia || ''} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
              </div>
              <div>
                <label htmlFor="telefone_contato" className="text-sm font-semibold text-gray-400">Telefone de Contato</label>
                <input type="text" name="telefone_contato" id="telefone_contato" value={formData.telefone_contato || ''} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
              </div>
              <div>
                <label htmlFor="endereco_completo" className="text-sm font-semibold text-gray-400">Endereço Completo</label>
                <textarea name="endereco_completo" id="endereco_completo" value={formData.endereco_completo || ''} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600" rows={3}/>
              </div>
              
              <div className="pt-4 border-t border-gray-700 flex space-x-3">
                  <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">
                      {loading ? 'Salvando...' : 'Salvar Outras Alterações'}
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">
                      Voltar para Visualização
                  </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
                {restaurante.path_logo && (
                    <div className='mb-6'>
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Logo Atual</h3>
                        <Image 
                          key={restaurante.path_logo} 
                          src={`http://localhost:3001${restaurante.path_logo}`} 
                          alt={`Logo de ${restaurante.nome_fantasia}`} 
                          width={128} 
                          height={128} 
                          className="rounded-md bg-gray-800 object-contain"
                          unoptimized // Adicionado para desenvolvimento local com caminhos dinâmicos
                        />
                    </div>
                )}
              
              <div><h3 className="text-sm font-semibold text-gray-400">Nome Fantasia</h3><p className="text-lg">{restaurante.nome_fantasia}</p></div>
              <div><h3 className="text-sm font-semibold text-gray-400">Telefone de Contato</h3><p className="text-lg">{restaurante.telefone_contato || 'Não informado'}</p></div>
              <div><h3 className="text-sm font-semibold text-gray-400">Endereço Completo</h3><p className="text-lg">{restaurante.endereco_completo || 'Não informado'}</p></div>
              <div><h3 className="text-sm font-semibold text-gray-400">E-mail do Responsável</h3><p className="text-lg">{restaurante.email_responsavel}</p></div>

              <div className="pt-4 border-t border-gray-700">
                  <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded">
                      Editar Informações
                  </button>
              </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}