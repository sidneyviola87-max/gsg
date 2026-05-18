import { Link } from "wouter";
import { Heart } from "lucide-react";

interface ProductImage {
  url: string;
}

interface Profile {
  username: string;
  avatar_url?: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
  currency?: string;
  product_images?: ProductImage[];
  profiles?: Profile;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.product_images?.[0]?.url;
  const currency = product.currency || "USD";

  return (
    <Link href={`/product/${product.id}`} className="block">
      <div className="bg-card rounded-2xl border border-border overflow-hidden group hover:shadow-md transition-shadow">
        {/* Image */}
        <div className="aspect-[3/4] bg-muted relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <button
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <Heart size={14} className="text-foreground" />
          </button>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-sm font-medium text-foreground line-clamp-2 leading-tight mb-1">{product.title}</p>
          <p className="text-sm font-bold text-primary">
            {currency === "USD" ? "$" : currency}{" "}
            {typeof product.price === "number" ? product.price.toFixed(2) : product.price}
          </p>
          {product.profiles?.username && (
            <p className="text-xs text-muted-foreground mt-1 truncate">@{product.profiles.username}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
