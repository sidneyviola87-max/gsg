import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select(`*, profiles(*), product_images(*)`)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20);
        
      if (data) setProducts(data);
      setLoading(false);
    }
    loadProducts();
  }, []);

  const categories = ["Popular", "Women", "Men", "Home", "Beauty", "Electronics", "All"];

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 pt-8 rounded-b-3xl shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        </div>
        
        {/* Search Bar */}
        <Link href="/search" className="flex items-center gap-2 bg-background/20 backdrop-blur-md px-4 py-3 rounded-xl border border-primary-foreground/20 text-primary-foreground mb-4">
          <Search size={20} className="opacity-70" />
          <span className="opacity-90">What are you looking for?</span>
        </Link>
      </div>

      {/* Categories */}
      <div className="mt-6 px-4">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat, i) => (
            <button key={i} className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors ${i === 0 ? 'bg-primary text-primary-foreground shadow-sm hover-elevate' : 'bg-card border border-border text-foreground hover:bg-accent hover:text-accent-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div className="mt-8 px-4">
        <h2 className="text-lg font-bold mb-4 text-foreground">Featured for You</h2>
        
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card rounded-2xl border border-border aspect-[3/4] animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
