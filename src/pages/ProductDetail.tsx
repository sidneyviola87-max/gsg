import { useEffect, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, Heart, MessageCircle, AlertTriangle, Share, UserCheck, UserPlus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    if (!params?.id) return;
    async function loadProduct() {
      const { data } = await supabase
        .from('products').select(`*, profiles(*), product_images(*)`)
        .eq('id', params!.id).single();
      if (data) {
        setProduct(data);
        if (user) {
          supabase.from('product_views').insert({ product_id: data.id, viewer_id: user.id }).then();
          supabase.from('saved_items').select('id').eq('user_id', user.id).eq('product_id', data.id).maybeSingle()
            .then(({ data: s }) => setIsSaved(!!s));
          if (data.seller_id && data.seller_id !== user.id) {
            supabase.from('follows').select('id').eq('follower_id', user.id).eq('following_id', data.seller_id).maybeSingle()
              .then(({ data: f }) => setIsFollowing(!!f));
          }
        }
      }
    }
    loadProduct();
  }, [params?.id, user]);

  const toggleSave = async () => {
    if (!user) { toast({ description: "Please sign in to save items" }); setLocation("/auth"); return; }
    if (isSaved) {
      await supabase.from('saved_items').delete().eq('user_id', user.id).eq('product_id', product.id);
      setIsSaved(false);
      toast({ description: "Removed from saved items" });
    } else {
      await supabase.from('saved_items').insert({ user_id: user.id, product_id: product.id });
      setIsSaved(true);
      toast({ description: "Saved to your list!" });
    }
  };

  const toggleFollow = async () => {
    if (!user) { toast({ description: "Please sign in to follow sellers" }); return; }
    if (user.id === product.seller_id) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', product.seller_id);
        setIsFollowing(false);
        toast({ description: `Unfollowed @${product.profiles?.username}` });
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: product.seller_id });
        setIsFollowing(true);
        // Send notification
        const { data: myProfile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
        await supabase.from('notifications').insert({
          user_id: product.seller_id,
          type: 'follow',
          title: 'New Follower',
          body: `@${myProfile?.username} started following you`,
          data: { follower_id: user.id },
        });
        toast({ description: `Now following @${product.profiles?.username}` });
      }
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user) { toast({ description: "Please sign in to message sellers" }); setLocation("/auth"); return; }
    if (user.id === product.seller_id) { toast({ description: "This is your own listing" }); return; }
    const { data: existingChat } = await supabase.from('chats').select('id')
      .eq('buyer_id', user.id).eq('seller_id', product.seller_id).maybeSingle();
    if (existingChat) {
      setLocation(`/chat/${existingChat.id}`);
    } else {
      const { data: newChat } = await supabase.from('chats')
        .insert({ buyer_id: user.id, seller_id: product.seller_id, product_id: product.id })
        .select().single();
      if (newChat) setLocation(`/chat/${newChat.id}`);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.title, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({ description: "Link copied!" });
    }
  };

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const images = product.product_images || [];

  return (
    <div className="pb-28 bg-background min-h-screen">
      {/* Top Nav Overlay */}
      <div className="fixed top-0 left-0 right-0 max-w-[430px] md:max-w-none mx-auto z-50 flex justify-between p-4 bg-gradient-to-b from-black/40 to-transparent text-white pointer-events-none">
        <button onClick={() => window.history.back()}
          className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center pointer-events-auto hover:bg-black/50 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={handleShare} className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
            <Share size={18} />
          </button>
          <button onClick={toggleSave} className="w-10 h-10 bg-black/30 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/50 transition-colors">
            <Heart size={18} className={isSaved ? "fill-primary text-primary" : ""} />
          </button>
        </div>
      </div>

      {/* Image Carousel */}
      <div className="aspect-square bg-muted w-full relative overflow-hidden">
        {images.length > 0 ? (
          <>
            <img src={images[currentImage]?.url} alt={product.title} className="w-full h-full object-cover" />
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.map((_: any, i: number) => (
                  <button key={i} onClick={() => setCurrentImage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? 'bg-white w-4' : 'bg-white/60'}`} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No Image</div>
        )}
      </div>

      {/* Content Card */}
      <div className="p-5 -mt-6 bg-background rounded-t-3xl relative z-10">
        <div className="flex justify-between items-start mb-1">
          <h1 className="text-2xl font-bold leading-tight flex-1 pr-2">{product.title}</h1>
          <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full shrink-0">
            <Star size={12} className="fill-yellow-400 text-yellow-400" />
            <span className="text-xs font-semibold">{(product.profiles?.rating || 0).toFixed(1)}</span>
          </div>
        </div>
        <p className="text-3xl font-bold text-primary mb-5 mt-2">{product.currency} {Number(product.price).toLocaleString()}</p>

        {/* Seller Card */}
        <Link href={`/profile/${product.seller_id}`}>
          <div className="flex items-center gap-3 p-4 bg-card border border-border rounded-2xl mb-5 hover:bg-muted/30 transition-colors">
            <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0">
              {product.profiles?.avatar_url
                ? <img src={product.profiles.avatar_url} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">{product.profiles?.username?.[0]?.toUpperCase()}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h3 className="font-semibold">{product.profiles?.username}</h3>
                {product.profiles?.is_verified && (
                  <div className="w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-primary-foreground text-[8px] font-bold">✓</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {[product.profiles?.location, product.profiles?.country].filter(Boolean).join(' • ') || 'Seller'}
              </p>
            </div>
            {user && user.id !== product.seller_id && (
              <Button variant={isFollowing ? "outline" : "default"} size="sm"
                className="rounded-full shrink-0 font-semibold" onClick={e => { e.preventDefault(); toggleFollow(); }}
                disabled={followLoading}>
                {isFollowing ? <><UserCheck size={14} className="mr-1" />Following</> : <><UserPlus size={14} className="mr-1" />Follow</>}
              </Button>
            )}
          </div>
        </Link>

        {/* Description */}
        <div className="mb-5">
          <h3 className="font-semibold text-base mb-2">Description</h3>
          <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{product.description}</p>
        </div>

        {/* Details */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {[
            { label: 'Category', value: product.category },
            { label: 'Location', value: product.location || product.country || 'Not specified' },
            { label: 'Status', value: product.status?.charAt(0).toUpperCase() + product.status?.slice(1) },
            { label: 'Views', value: product.views || 0 },
            { label: 'Likes', value: product.likes_count || 0 },
          ].map((item, i, arr) => (
            <div key={i} className={`flex justify-between py-3 px-4 ${i !== arr.length - 1 ? 'border-b border-border' : ''}`}>
              <span className="text-muted-foreground text-sm">{item.label}</span>
              <span className="font-medium text-sm">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
            <AlertTriangle size={15} /> Report this listing
          </button>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[430px] md:max-w-none mx-auto bg-background border-t border-border p-4 pb-safe z-50 flex gap-3">
        <Button variant="outline" className="flex-1 h-14 rounded-xl text-base font-semibold" onClick={handleMessage}>
          <MessageCircle className="mr-2" size={20} /> Message
        </Button>
        <Button className="flex-1 h-14 rounded-xl text-base font-semibold shadow-md">Buy Now</Button>
      </div>
    </div>
  );
}
