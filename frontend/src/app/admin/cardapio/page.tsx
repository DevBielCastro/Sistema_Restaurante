// frontend/src/app/admin/cardapio/page.tsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AddCategoryForm from '@/components/admin/cardapio/AddCategoryForm';
import EditCategoryForm from '@/components/admin/cardapio/EditCategoryForm';
import AddProductForm from '@/components/admin/cardapio/AddProductForm';
import EditProductForm from '@/components/admin/cardapio/EditProductForm';
import AddPromotionForm from '@/components/admin/cardapio/AddPromotionForm';
import EditPromotionForm from '@/components/admin/cardapio/EditPromotionForm';
import GerenciarProdutosPromocaoModal from '@/components/admin/cardapio/GerenciarProdutosPromocaoModal';

// Interfaces
interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  ordem_exibicao?: number | null;
  ativo?: boolean | null;
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
interface FeedbackMessage {
  type: 'success' | 'error';
  text: string;
}

export default function CardapioAdminPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [promocoes, setPromocoes] = useState<Promocao[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [categoriaParaEditar, setCategoriaParaEditar] = useState<Categoria | null>(null);
  const [produtoParaEditar, setProdutoParaEditar] = useState<Produto | null>(null);
  const [promocaoParaEditar, setPromocaoParaEditar] = useState<Promocao | null>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);

  const [isModalGerenciarProdutosOpen, setIsModalGerenciarProdutosOpen] = useState(false);
  const [promocaoSelecionada, setPromocaoSelecionada] = useState<Promocao | null>(null);

  const TEMPORARY_RESTAURANTE_ID = 7;
  const TEMPORARY_JWT_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyZXN0YXVyYW50ZUlkIjo3LCJlbWFpbCI6ImNoZWZlQGNhbnRpbmFkb3ZhbGUuY29tIiwibm9tZVNjaGVtYURiIjoiY2FudGluYV92YWxlX2ZlbGl6X3NjaGVtYSIsImlhdCI6MTc0OTMwNjI1NSwiZXhwIjoxNzQ5OTExMDU1fQ.eg4Mm5qcysddwWNyPgox8R1RcgjkGzh_OujWzvkWafA";
  const fetchData = async () => {
    if (!TEMPORARY_JWT_TOKEN || !TEMPORARY_RESTAURANTE_ID) {
      setApiError("ID do restaurante ou Token JWT de teste não configurado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setApiError(null);
    try {
      const headers = { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}`, 'Content-Type': 'application/json' };
      const [categoriasResponse, produtosResponse, promocoesResponse] = await Promise.all([
        fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias`, { headers }),
        fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/produtos`, { headers }),
        fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/promocoes`, { headers })
      ]);

      if (!categoriasResponse.ok) {
        const errorData = await categoriasResponse.json();
        throw new Error(errorData.message || `Erro ao buscar categorias: ${categoriasResponse.status}`);
      }
      if (!produtosResponse.ok) {
        const errorData = await produtosResponse.json();
        throw new Error(errorData.message || `Erro ao buscar produtos: ${produtosResponse.status}`);
      }
      if (!promocoesResponse.ok) {
        const errorData = await promocoesResponse.json();
        throw new Error(errorData.message || `Erro ao buscar promoções: ${promocoesResponse.status}`);
      }

      const categoriasData: Categoria[] = await categoriasResponse.json();
      const produtosDataRaw = await produtosResponse.json();
      const promocoesData = await promocoesResponse.json();

      const produtosData: Produto[] = produtosDataRaw.map((prod: any) => ({ ...prod, preco: Number(prod.preco) }));

      setCategorias(categoriasData);
      setProdutos(produtosData);
      setPromocoes(promocoesData);

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
    setCategoriaParaEditar(null);
    setProdutoParaEditar(null);
    setPromocaoParaEditar(null);
    fetchData();
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleStartEditCategory = (categoria: Categoria) => {
    setFeedbackMessage(null);
    setProdutoParaEditar(null);
    setPromocaoParaEditar(null);
    setCategoriaParaEditar(categoria);
  };

  const handleStartEditProduct = (produto: Produto) => {
    setFeedbackMessage(null);
    setCategoriaParaEditar(null);
    setPromocaoParaEditar(null);
    setProdutoParaEditar(produto);
  };

  const handleStartEditPromotion = (promocao: Promocao) => {
    setFeedbackMessage(null);
    setCategoriaParaEditar(null);
    setProdutoParaEditar(null);
    setPromocaoParaEditar(promocao);
  };

  const handleCancelEdit = () => {
    setCategoriaParaEditar(null);
    setProdutoParaEditar(null);
    setPromocaoParaEditar(null);
    setFeedbackMessage(null);
  };

  const handleDeleteCategory = async (categoriaId: number, categoriaNome: string) => {
    if (!window.confirm(`Tem certeza que deseja deletar a categoria "${categoriaNome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(`http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/categorias/${categoriaId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` } });
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

  const handleDeleteProduct = async (produtoId: number, produtoNome: string) => {
    if (!window.confirm(`Tem certeza que deseja deletar o produto "${produtoNome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/produtos/${produtoId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` }
        }
      );
      if (response.status === 409) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Este produto não pode ser deletado pois está em uma promoção.");
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      handleCrudSuccess(`Produto "${produtoNome}" deletado com sucesso!`);
    } catch (err: any) {
      console.error("Falha ao deletar produto:", err);
      setFeedbackMessage({ type: 'error', text: err.message || "Não foi possível deletar o produto." });
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleDeletePromotion = async (promocaoId: number, promocaoNome: string) => {
    if (!window.confirm(`Tem certeza que deseja deletar a promoção "${promocaoNome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      const response = await fetch(
        `http://localhost:3001/api/v1/restaurantes/${TEMPORARY_RESTAURANTE_ID}/promocoes/${promocaoId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${TEMPORARY_JWT_TOKEN}` }
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Erro HTTP: ${response.status}` }));
        throw new Error(errorData.message || `Erro HTTP: ${response.status}`);
      }
      handleCrudSuccess(`Promoção "${promocaoNome}" deletada com sucesso!`);
    } catch (err: any) {
      console.error("Falha ao deletar promoção:", err);
      setFeedbackMessage({ type: 'error', text: err.message || "Não foi possível deletar a promoção." });
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  const handleOpenGerenciarProdutosModal = (promocao: Promocao) => {
    setPromocaoSelecionada(promocao);
    setIsModalGerenciarProdutosOpen(true);
  };

  const handleCloseGerenciarProdutosModal = () => {
    setIsModalGerenciarProdutosOpen(false);
    setPromocaoSelecionada(null);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'indefinido';
    return new Date(dateString).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };


  return (
    <div className="min-h-screen bg-[#030607] text-white p-8">
      <header className="mb-10 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-[#20c2ef]">Gerenciamento do Cardápio</h1>
          <p className="text-lg text-gray-300 mt-2">Adicione, edite ou remova categorias, produtos e promoções do seu cardápio.</p>
        </div>
        <Link href="/admin/configuracoes" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded whitespace-nowrap">
          Ir para Configurações
        </Link>
      </header>

      {feedbackMessage && (
        <div className={`p-4 mb-4 rounded-md ${feedbackMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {feedbackMessage.text}
        </div>
      )}

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">Categorias</h2>

          {categoriaParaEditar ? (
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
            {loading && <p className="text-gray-400">Carregando...</p>}
            {!loading && !apiError && categorias.map(cat => (
              <div key={cat.id} className="bg-[#030607] p-3 rounded flex justify-between items-center mt-2">
                <div>
                  <span className="font-semibold">{cat.nome}</span>
                  {cat.descricao && <p className="text-sm text-gray-400">{cat.descricao}</p>}
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleStartEditCategory(cat as Categoria)} className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded">Editar</button>
                  <button onClick={() => handleDeleteCategory(cat.id, cat.nome)} className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">Deletar</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#171717] p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">Produtos</h2>

          {produtoParaEditar ? (
            <EditProductForm
              restauranteId={TEMPORARY_RESTAURANTE_ID}
              token={TEMPORARY_JWT_TOKEN}
              produto={produtoParaEditar}
              categorias={categorias}
              onProductUpdated={handleCrudSuccess}
              onCancelEdit={handleCancelEdit}
            />
          ) : (
            <AddProductForm
              restauranteId={TEMPORARY_RESTAURANTE_ID}
              token={TEMPORARY_JWT_TOKEN}
              categorias={categorias}
              onProductAdded={() => handleCrudSuccess("Novo produto adicionado com sucesso!")}
            />
          )}

          <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3 text-gray-200">Produtos Existentes</h3>
            {loading && <p className="text-gray-400">Carregando...</p>}
            {!loading && !apiError && categorias.map(cat => (
              <div key={`cat-prod-${cat.id}`} className="mt-4">
                <h4 className="text-lg font-medium text-gray-300 border-b border-gray-700 pb-1 mb-3">{cat.nome}</h4>
                {produtos.filter(p => p.categoria_id === cat.id).map(prod => (
                  <div key={prod.id} className="bg-[#030607] p-3 mb-2 rounded flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-semibold">{prod.nome}</p>
                      {prod.descricao && <p className="text-sm text-gray-400">{prod.descricao}</p>}
                      <p className="text-sm text-green-400 mt-1">R$ {prod.preco.toFixed(2).replace('.', ',')}</p>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button onClick={() => handleStartEditProduct(prod as Produto)} className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded">Editar</button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id, prod.nome)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
                {produtos.filter(p => p.categoria_id === cat.id).length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nenhum produto nesta categoria.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="mt-10 bg-[#171717] p-6 rounded-lg shadow-lg col-span-1 md:col-span-2">
        <h2 className="text-2xl font-semibold mb-4 text-[#20c2ef]">Promoções</h2>

        {promocaoParaEditar ? (
          <EditPromotionForm
            restauranteId={TEMPORARY_RESTAURANTE_ID}
            token={TEMPORARY_JWT_TOKEN}
            promocao={promocaoParaEditar}
            onPromotionUpdated={handleCrudSuccess}
            onCancelEdit={handleCancelEdit}
          />
        ) : (
          <AddPromotionForm
            restauranteId={TEMPORARY_RESTAURANTE_ID}
            token={TEMPORARY_JWT_TOKEN}
            onPromotionAdded={() => handleCrudSuccess("Nova promoção adicionada com sucesso!")}
          />
        )}

        <div>
          <h3 className="text-xl font-semibold mb-3 text-gray-200">Promoções Ativas e Agendadas</h3>
          {loading && <p className="text-gray-400">Carregando promoções...</p>}
          {apiError && !loading && <p className="text-red-500">{apiError}</p>}
          {!loading && !apiError && (
            promocoes.length > 0 ? (
              <div className="mt-4 space-y-3">
                {promocoes.map((promo) => (
                  <div key={promo.id} className="bg-[#030607] p-4 rounded flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{promo.nome_promocao}
                        <span className={`ml-3 text-xs font-bold px-2 py-1 rounded-full ${promo.ativo ? 'bg-green-500 text-white' : 'bg-gray-500 text-gray-200'}`}>
                          {promo.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </p>
                      <p className="text-sm text-gray-400">{promo.descricao_promocao}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        <p>Tipo: <span className="font-mono bg-gray-800 px-1 rounded">{promo.tipo_promocao}</span></p>
                        <p>Vigência: {formatDate(promo.data_inicio)} a {formatDate(promo.data_fim)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleOpenGerenciarProdutosModal(promo as Promocao)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-2 rounded">
                        Ver/Gerenciar Produtos
                      </button>
                      <button
                        onClick={() => handleStartEditPromotion(promo as Promocao)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-black text-xs py-1 px-2 rounded">
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeletePromotion(promo.id, promo.nome_promocao)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 px-2 rounded">
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Nenhuma promoção encontrada para este restaurante.</p>
            )
          )}
        </div>
      </section>

      <GerenciarProdutosPromocaoModal
        isOpen={isModalGerenciarProdutosOpen}
        onClose={handleCloseGerenciarProdutosModal}
        promocao={promocaoSelecionada}
        todosOsProdutos={produtos}
        restauranteId={TEMPORARY_RESTAURANTE_ID}
        token={TEMPORARY_JWT_TOKEN}
      />
    </div>
  );
}