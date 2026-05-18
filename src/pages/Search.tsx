import { useState } from "react";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    
    const { data } = await supabase
      .from('products')
      .select('*, profiles(*), product_images(*)')
      .ilike('title', `%${query}%`)
      .eq('status', 'active');
      
    if (data) setResults(data);
    setLoading(false);
  };

  return (
    <div className="pb-24">
      <div className="p-4 bg-background sticky top-0 z-10 border-b border-border shadow-sm">
        <form onSubmit={handleSearch} className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <Input 
            value={query} 
            onChange={e => setQuery(e.target.value)} 
            placeholder="Search for items..." 
            className="w-full h-12 pl-12 rounded-full bg-muted border-none"
            autoFocus
          />
        </form>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Searching...</div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {results.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : query ? (
          <div className="text-center text-muted-foreground py-8">No results found for "{query}"</div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <SearchIcon size={48} className="mx-auto mb-4 opacity-20" />
            <p>Start searching for products</p>
          </div>
        )}
      </div>
    </div>
  );
}
