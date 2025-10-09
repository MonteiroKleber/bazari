import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getPublicJSON } from '@/lib/api';

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const q = searchParams.get('q') || '';

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await getPublicJSON<any>(
          `/marketplace/search?${searchParams.toString()}`
        );
        setResults(data.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Marketplace</h1>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Buscar produtos..."
          value={q}
          onChange={(e) => {
            searchParams.set('q', e.target.value);
            setSearchParams(searchParams);
          }}
        />
        <Button>Buscar</Button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {results.map((item) => (
            <Link
              key={item.id}
              to={`/loja/${item.slug}`}
              className="border rounded p-4 hover:shadow-lg transition-shadow"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.description}</p>
              <p className="text-lg font-bold mt-2">
                {item.price.amount} {item.price.currency}
              </p>
              {item.slug && (
                <p className="text-xs text-gray-500 mt-1">Loja: {item.slug}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
