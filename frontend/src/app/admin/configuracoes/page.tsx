// frontend/src/app/admin/configuracoes/page.tsx
"use client";

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';

// --- Interfaces ---
interface DiasFuncionamento {
  dom: boolean; seg: boolean; ter: boolean; qua: boolean; qui: boolean; sex: boolean; sab: boolean;
}
interface Restaurante {
  id: number;
  nome_fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  endereco_completo: string | null;
  telefone_contato: string | null;
  email_responsavel: string;
  path_logo: string | null;
  // Campos adicionados
  cor_primaria_hex: string | null;
  cor_secundaria_hex: string | null;
  horario_abertura: string | null;
  horario_fechamento: string | null;
  dias_funcionamento: DiasFuncionamento | null;
}
interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

// Objeto para ajudar na renderização dos dias da semana
const DIAS_SEMANA_MAP = [
    { key: 'dom', label: 'Domingo' }, { key: 'seg', label: 'Segunda' }, { key: 'ter', label: 'Terça' },
    { key: 'qua', label: 'Quarta' }, { key: 'qui', label: 'Quinta' }, { key: 'sex', label: 'Sexta' },
    { key: 'sab', label: 'Sábado' },
];

export default function ConfiguracoesPage() {
  const [restaurante, setRestaurante] = useState<Restaurante | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Restaurante>>({});
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const TEMPORARY_RESTAURANTE_ID = 7;
  const TEMPORARY_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50ZUlkIjo3LCJlbWFpbCI6ImNoZWZlQGNhbnRpbmFkb3ZhbGUuY29tIiwibm9tZVNjaGVtYURiIjoiY2FudGluYV92YWxlX2ZlbGl6X3NjaGVtYSIsImlhdCI6MTc0OTMwNjI1NSwiZXhwIjoxNzQ5OTExMDU1fQ.eg4Mm5qcysddwWNyPgox8R1RcgjkGzh_OujWzvkWafA";

  const initializeFormData = (data: Restaurante) => {
    setFormData({
      ...data,
      dias_funcionamento: data.dias_funcionamento || { dom: false, seg: false, ter: false, qua: false, qui: false, sex: false, sab: false }
    });
  };

  const fetchRestauranteData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}`,
        { headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` } }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao buscar dados do restaurante.");
      }
      const data: Restaurante = await response.json();
      setRestaurante(data);
      initializeFormData(data);
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
    setFormData(prevData => ({ ...prevData, [name]: value }));
  };

  const handleDayChange = (dayKey: keyof DiasFuncionamento) => {
    setFormData(prevData => {
        const currentDays = prevData.dias_funcionamento as DiasFuncionamento;
        const newDias = { ...currentDays, [dayKey]: !currentDays[dayKey] };
        return { ...prevData, dias_funcionamento: newDias };
    });
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
      if (!response.ok) throw new Error(responseData.message || "Falha ao salvar as alterações.");
      
      await fetchRestauranteData();
      setIsEditing(false);
      setFeedbackMessage({ type: 'success', text: 'Informações salvas com sucesso!' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) { setSelectedFileName(null); return; }
    setSelectedFileName(file.name);
    setLoading(true);
    setFeedbackMessage(null);
    const data = new FormData();
    data.append('logo', file);
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/logo`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` },
          body: data,
        }
      );
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || "Falha no upload da logo.");
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
        <div className={`p-4 mb-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-500'}`}>
          {feedbackMessage.text}
        </div>
      )}
      
      <main className="bg-[#171717] p-6 rounded-lg shadow-lg">
        {loading && <p>Carregando...</p>}
        {error && !loading && <p className="text-red-500">Erro: {error}</p>}
        {restaurante && (
          isEditing ? (
            <form onSubmit={handleSaveChanges} className="space-y-6">
              {/* Upload de Logo */}
              <div>
                <label className="text-sm font-semibold text-gray-400">Alterar Logo</label>
                <div className="flex items-center gap-4 mt-1">
                  <label htmlFor="logoUpload" className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded whitespace-nowrap">Escolher Arquivo</label>
                  <input type="file" name="logo" id="logoUpload" accept="image/*" onChange={handleLogoUpload} className="hidden"/>
                  {selectedFileName && <span className="text-sm text-gray-400">{selectedFileName}</span>}
                </div>
                <p className="text-xs text-gray-500 mt-1">A imagem será salva automaticamente após a seleção.</p>
              </div>

              {/* Informações Gerais */}
              <div className="pt-4 border-t border-gray-600"><label className="text-lg font-semibold text-gray-300">Informações Gerais</label></div>
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

              {/* Horários e Cores */}
              <div className="pt-4 border-t border-gray-600"><label className="text-lg font-semibold text-gray-300">Horários e Aparência</label></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="horario_abertura" className="text-sm font-semibold text-gray-400">Horário de Abertura</label>
                  <input type="time" name="horario_abertura" id="horario_abertura" value={formData.horario_abertura || ''} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
                </div>
                <div>
                  <label htmlFor="horario_fechamento" className="text-sm font-semibold text-gray-400">Horário de Fechamento</label>
                  <input type="time" name="horario_fechamento" id="horario_fechamento" value={formData.horario_fechamento || ''} onChange={handleInputChange} className="w-full p-2 mt-1 rounded bg-[#030607] border border-gray-600"/>
                </div>
                <div>
                    <label htmlFor="cor_primaria_hex" className="text-sm font-semibold text-gray-400">Cor Primária</label>
                    <input type="color" name="cor_primaria_hex" id="cor_primaria_hex" value={formData.cor_primaria_hex || '#FFFFFF'} onChange={handleInputChange} className="w-full h-10 p-1 mt-1 rounded bg-[#030607] border border-gray-600"/>
                </div>
                 <div>
                    <label htmlFor="cor_secundaria_hex" className="text-sm font-semibold text-gray-400">Cor Secundária</label>
                    <input type="color" name="cor_secundaria_hex" id="cor_secundaria_hex" value={formData.cor_secundaria_hex || '#000000'} onChange={handleInputChange} className="w-full h-10 p-1 mt-1 rounded bg-[#030607] border border-gray-600"/>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-400">Dias de Funcionamento</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                    {DIAS_SEMANA_MAP.map(dia => (
                        <div key={dia.key} className="flex items-center">
                            <input type="checkbox" id={`dia-${dia.key}`} checked={formData.dias_funcionamento?.[dia.key as keyof DiasFuncionamento] || false} onChange={() => handleDayChange(dia.key as keyof DiasFuncionamento)} className="h-4 w-4 rounded border-gray-600 bg-[#030607] text-[#20c2ef] focus:ring-[#20c2ef]"/>
                            <label htmlFor={`dia-${dia.key}`} className="ml-2 text-sm text-gray-200">{dia.label}</label>
                        </div>
                    ))}
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-700 flex space-x-3">
                  <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50">{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
                  <button type="button" onClick={() => setIsEditing(false)} className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded">Voltar para Visualização</button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
                {restaurante.path_logo && (
                  <div className='mb-4'><h3 className="text-sm font-semibold text-gray-400 mb-2">Logo Atual</h3><Image key={restaurante.path_logo} src={`http://localhost:3001${restaurante.path_logo}`} alt={`Logo de ${restaurante.nome_fantasia}`} width={128} height={128} className="rounded-md bg-gray-800 object-contain" unoptimized/></div>
                )}
                <div><h3 className="text-sm font-semibold text-gray-400">Nome Fantasia</h3><p className="text-lg">{restaurante.nome_fantasia}</p></div>
                <div><h3 className="text-sm font-semibold text-gray-400">Telefone de Contato</h3><p className="text-lg">{restaurante.telefone_contato || 'Não informado'}</p></div>
                <div><h3 className="text-sm font-semibold text-gray-400">Endereço Completo</h3><p className="text-lg">{restaurante.endereco_completo || 'Não informado'}</p></div>
                <div><h3 className="text-sm font-semibold text-gray-400">E-mail do Responsável</h3><p className="text-lg">{restaurante.email_responsavel}</p></div>
                
                <div className="pt-4 border-t border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400">Horário de Funcionamento</h3>
                        <p className="text-lg">{restaurante.horario_abertura ? restaurante.horario_abertura.slice(0, 5) : '--:--'} às {restaurante.horario_fechamento ? restaurante.horario_fechamento.slice(0, 5) : '--:--'}</p>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400">Cor Primária</h3>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full border-2 border-gray-500" style={{ backgroundColor: restaurante.cor_primaria_hex || '#FFFFFF' }}></div>
                           <span className="font-mono text-sm">{restaurante.cor_primaria_hex || '#FFFFFF'}</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-gray-400">Cor Secundária</h3>
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 rounded-full border-2 border-gray-500" style={{ backgroundColor: restaurante.cor_secundaria_hex || '#000000' }}></div>
                           <span className="font-mono text-sm">{restaurante.cor_secundaria_hex || '#000000'}</span>
                        </div>
                    </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-400">Dias de Funcionamento</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                      {DIAS_SEMANA_MAP.map(dia => (<span key={dia.key} className={`px-3 py-1 text-xs rounded-full font-semibold ${restaurante.dias_funcionamento?.[dia.key as keyof DiasFuncionamento] ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}`}>{dia.label}</span>))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-700">
                    <button onClick={() => setIsEditing(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-4 rounded">Editar Informações</button>
                </div>
            </div>
          )
        )}
      </main>
    </div>
  );
}