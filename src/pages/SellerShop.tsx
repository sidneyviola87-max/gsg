import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { supabase } from "@/lib/supabase";
import ProductCard from "@/components/ProductCard";
import { Store, ChevronLeft } from "lucide-react";

export default function SellerShopPage() {
  const [, params] = useRoute("/seller/:id/shop");
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (!params?.id) return;
    
    supabase.from('profiles').select('*').eq('id', params.id).single().then(({ data }) => setProfile(data));
    supabase.from('products').select('*, profiles(*)').eq('seller_id', params.id).eq('status', 'active').then(({ data }) => setProducts(data || []));
  }, [params?.id]);

  if (!profile) return <div className="p-8 text-center">Loading shop...</div>;

  return (
    <div className="pb-24 bg-muted/20 min-h-screen">
      <div className="bg-background border-b border-border p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
              <Store size={16} />
            </div>
          )}
        </div>
        <h1 className="text-lg font-bold truncate">{profile.username}'s Shop</h1>
      </div>

      <div className="p-4">
        <div className="mb-6 flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">All Items</h2>
            <p className="text-muted-foreground text-sm">{products.length} active listings</p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Store size={48} className="mx-auto mb-4 opacity-20" />
            <p>This seller has no active listings.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
