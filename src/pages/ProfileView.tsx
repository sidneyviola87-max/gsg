import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Link, useLocation } from "wouter";
import { ChevronLeft, MapPin, Calendar, Star, Share2, MoreVertical, ShoppingBag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";

type Tab = "Listings" | "Sold" | "Saved" | "Reviews" | "Likes";

export default function ProfileViewPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [soldProducts, setSoldProducts] = useState<any[]>([]);
  const [savedProducts, setSavedProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [tab, setTab] = useState<Tab>("Listings");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLocation("/auth"); return; }
    async function load() {
      const [{ data: p }, { data: prods }, { data: sold }, { data: revs }, { data: ach }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('products').select('*, product_images(*)').eq('seller_id', user!.id).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('products').select('*, product_images(*)').eq('seller_id', user!.id).eq('status', 'sold').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:profiles!reviewer_id(*)').eq('seller_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('achievements').select('*').eq('user_id', user!.id),
      ]);
      if (p) setProfile(p);
      if (prods) setProducts(prods);
      if (sold) setSoldProducts(sold);
      if (revs) setReviews(revs);
      if (ach) setAchievements(ach);

      // Load saved items
      const { data: saved } = await supabase
        .from('saved_items')
        .select('products(*, product_images(*))')
        .eq('user_id', user!.id);
      if (saved) setSavedProducts(saved.map((s: any) => s.products).filter(Boolean));

      setLoading(false);
    }
    load();
  }, [user]);

  const getAchievementEmoji = (type: string) => {
    const map: Record<string, string> = {
      top_seller: '⭐', fast_responder: '⚡', hundred_sales: '💯', five_star: '🏆',
      first_sale: '🎉', verified: '✅', popular: '🔥',
    };
    return map[type] || '🏅';
  };

  if (!user) return null;
  if (loading || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const tabs: Tab[] = ["Listings", "Sold", "Saved", "Reviews", "Likes"];
  const tabContent: Record<Tab, any[]> = {
    Listings: products,
    Sold: soldProducts,
    Saved: savedProducts,
    Reviews: reviews,
    Likes: [],
  };

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-border">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">My Profile</h1>
        <div className="flex gap-1">
          <button className="p-2 rounded-full hover:bg-muted"><Share2 size={20} /></button>
          <button className="p-2 rounded-full hover:bg-muted"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-5 pt-4 pb-5 bg-card border-b border-border">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
              : <div className="w-full h-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {profile.username?.[0]?.toUpperCase()}
                </div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-xl font-bold">{profile.full_name || profile.username}</h2>
              {profile.is_verified && (
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-[10px] font-bold">✓</span>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm">@{profile.username}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={14} className="fill-yellow-400 text-yellow-400" />
              <span className="text-sm font-semibold">{(profile.rating || 0).toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({profile.reviews_count || 0} Reviews)</span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex justify-around mt-5 py-3 bg-muted/50 rounded-2xl">
          <div className="text-center">
            <p className="text-xl font-bold">{profile.listings_count || products.length}</p>
            <p className="text-xs text-muted-foreground">Listings</p>
          </div>
          <div className="w-px bg-border" />
          <Link href={`/followers/${user.id}`} className="text-center hover:opacity-70 transition-opacity">
            <p className="text-xl font-bold">{(profile.followers_count || 0) >= 1000 ? `${((profile.followers_count || 0) / 1000).toFixed(1)}K` : profile.followers_count || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </Link>
          <div className="w-px bg-border" />
          <Link href={`/following/${user.id}`} className="text-center hover:opacity-70 transition-opacity">
            <p className="text-xl font-bold">{profile.following_count || 0}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </Link>
        </div>

        {/* Edit Button */}
        <Link href="/profile/edit">
          <Button variant="outline" className="w-full mt-4 rounded-full font-semibold border-primary text-primary hover:bg-primary/5">
            Edit Profile
          </Button>
        </Link>

        {/* Bio & Info */}
        {profile.bio && <p className="text-sm mt-4 text-foreground leading-relaxed">{profile.bio}</p>}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
          {(profile.location || profile.country) && (
            <div className="flex items-center gap-1">
              <MapPin size={12} />
              <span>{[profile.location, profile.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          {profile.joined_at && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>Joined {new Date(profile.joined_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
          )}
        </div>
      </div>

      {/* My Shop Preview */}
      {products.length > 0 && (
        <div className="px-4 pt-5">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base flex items-center gap-2"><ShoppingBag size={16} className="text-primary" /> My Shop</h3>
            <Link href={`/seller/${user.id}/shop`} className="text-primary text-sm font-medium hover:underline">See Shop</Link>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {products.slice(0, 5).map(p => {
              const img = p.product_images?.[0]?.url;
              return (
                <Link key={p.id} href={`/product/${p.id}`}
                  className="w-20 h-20 rounded-xl bg-muted overflow-hidden shrink-0 border border-border hover:scale-105 transition-transform">
                  {img ? <img src={img} className="w-full h-full object-cover" alt={p.title} /> : <div className="w-full h-full bg-primary/10" />}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* My Stats */}
      <div className="px-4 pt-5">
        <h3 className="font-bold text-base mb-3">My Stats</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Sales', value: `$${(profile.total_sales || 0).toLocaleString()}`, sub: '+18% this month', color: 'text-primary' },
            { label: 'Items Sold', value: profile.items_sold || 0, sub: '+24% this month', color: 'text-primary' },
            { label: 'Success Rate', value: `${profile.success_rate || 98}%`, sub: 'Excellent ⭐', color: 'text-green-500' },
            { label: 'Response Time', value: `${profile.response_time_hours || 2}h`, sub: 'Very Fast', color: 'text-primary' },
            { label: 'Repeat Buyers', value: `${profile.repeat_buyers_pct || 85}%`, sub: 'Great', color: 'text-primary' },
            { label: 'Positive Reviews', value: profile.reviews_count || 0, sub: `${(profile.rating || 4.8).toFixed(1)} Rating ⭐`, color: 'text-primary' },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-3">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <div className="flex border-b border-border overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="p-4">
          {tab === "Reviews" ? (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No reviews yet.</p>
              ) : reviews.map((r: any) => (
                <div key={r.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-muted overflow-hidden">
                      {r.reviewer?.avatar_url && <img src={r.reviewer.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{r.reviewer?.username}</p>
                      <div className="flex gap-0.5">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={12} className="fill-yellow-400 text-yellow-400" />)}</div>
                    </div>
                  </div>
                  {r.content && <p className="text-sm text-muted-foreground">{r.content}</p>}
                </div>
              ))}
            </div>
          ) : tabContent[tab].length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nothing here yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {tabContent[tab].map((p: any) => p && <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="px-4 pt-2 pb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-base">Achievements</h3>
            <span className="text-primary text-sm font-medium">See All</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {achievements.map((a: any) => (
              <div key={a.id} className="shrink-0 flex flex-col items-center gap-2 w-20">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
                  {getAchievementEmoji(a.type)}
                </div>
                <p className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
