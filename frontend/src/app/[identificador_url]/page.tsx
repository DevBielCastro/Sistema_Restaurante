// app/[identificador_url]/page.tsx
import Image from 'next/image';
import { notFound } from 'next/navigation';

// ... (Suas interfaces: RestauranteInfo, Produto, etc...)
interface RestauranteInfo { id: number; nome_fantasia: string; path_logo: string | null; endereco_completo: string | null; }
interface Produto { id: number; nome: string; descricao: string | null; preco: string; url_foto: string | null; }
interface CategoriaComProdutos { id: number; nome: string; produtos: Produto[]; }
interface CardapioData { restaurante: RestauranteInfo; menu: CategoriaComProdutos[]; }


async function getCardapio(identificador: string): Promise<CardapioData | null> {
  try {
    const res = await fetch(`http://localhost:3001/api/v1/public/cardapio/${identificador}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

export default async function CardapioPublicoPage({ params }: { params: { identificador_url: string } }) {
  
  const { identificador_url } = params;
  const data = await getCardapio(identificador_url);

  if (!data) {
    notFound();
  }

  const { restaurante, menu } = data;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto max-w-4xl">
        <header className="bg-white rounded-b-lg shadow-md p-6 text-center">
          {restaurante.path_logo && (
            <div className="relative w-42 h-42 mx-auto mb-4">
              <Image
                src={`http://localhost:3001${restaurante.path_logo}`}
                alt={`Logo de ${restaurante.nome_fantasia}`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="rounded-full object-cover border-4 border-white shadow-lg"
              />
            </div>
          )}
          <h1 className="text-4xl font-bold text-gray-800">{restaurante.nome_fantasia}</h1>
          {restaurante.endereco_completo && (
              <p className="text-md text-gray-500 mt-2">{restaurante.endereco_completo}</p>
          )}
        </header>

        <main className="p-4 md:p-8">
          {menu.map((categoria) => (
            categoria.produtos.length > 0 && (
              <section key={categoria.id} id={`categoria-${categoria.id}`} className="mb-12">
                <h2 className="text-3xl font-bold text-gray-700 border-b-2 border-orange-500 pb-2 mb-6">
                  {categoria.nome}
                </h2>
                <div className="space-y-4">
                  {categoria.produtos.map((produto) => (
                    // <<< LAYOUT CORRIGIDO: Imagem à esquerda, texto à direita
                    <div key={produto.id} className="bg-white rounded-lg shadow-md overflow-hidden flex flex-row items-center transition-all duration-300 hover:shadow-xl">
                      {/* Coluna da Esquerda: Imagem */}
                      <div className="w-32 h-32 md:w-40 md:h-40 relative flex-shrink-0">
                        {produto.url_foto ? (
                           <Image
                              src={`http://localhost:3001${produto.url_foto}`}
                              alt={`Foto de ${produto.nome}`}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              className="object-cover"
                           />
                        ) : (
                           <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                              <span className="text-gray-400 text-xs text-center">Sem imagem</span>
                           </div>
                        )}
                      </div>
                      {/* Coluna da Direita: Textos */}
                      <div className="p-4 flex-grow">
                        <h3 className="text-xl font-semibold text-gray-800">{produto.nome}</h3>
                        <p className="text-gray-600 text-sm mt-1">{produto.descricao}</p>
                        <p className="text-2xl font-bold text-green-600 mt-4">
                          R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )
          ))}
        </main>
      </div>
    </div>
  );
}