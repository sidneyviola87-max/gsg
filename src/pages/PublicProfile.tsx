import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import ProductCard from "@/components/ProductCard";
import { ChevronLeft, MapPin, Calendar, Star, Share2, UserCheck, UserPlus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

type Tab = "Listings" | "Reviews";

export default function PublicProfilePage() {
  const [, params] = useRoute("/profile/:id");
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("Listings");

  const profileId = params?.id;

  useEffect(() => {
    if (!profileId) return;
    async function load() {
      const [{ data: p }, { data: prods }, { data: revs }, { data: ach }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('products').select('*, product_images(*)').eq('seller_id', profileId).eq('status', 'active').order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:profiles!reviewer_id(*)').eq('seller_id', profileId).order('created_at', { ascending: false }),
        supabase.from('achievements').select('*').eq('user_id', profileId),
      ]);
      if (p) setProfile(p);
      if (prods) setProducts(prods);
      if (revs) setReviews(revs);
      if (ach) setAchievements(ach);

      if (user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileId)
          .maybeSingle();
        setIsFollowing(!!followData);
      }
    }
    load();
  }, [profileId, user]);

  const handleFollow = async () => {
    if (!user) { toast({ description: "Please sign in to follow sellers" }); return; }
    if (user.id === profileId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId!);
        setIsFollowing(false);
        setProfile((p: any) => p ? { ...p, followers_count: Math.max(0, (p.followers_count || 0) - 1) } : p);
        toast({ description: `Unfollowed @${profile?.username}` });
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId });
        setIsFollowing(true);
        setProfile((p: any) => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p);
        // Send notification
        await supabase.from('notifications').insert({
          user_id: profileId,
          type: 'follow',
          title: 'New Follower',
          body: `@${(await supabase.from('profiles').select('username').eq('id', user.id).single()).data?.username} started following you`,
          data: { follower_id: user.id },
        });
        toast({ description: `Following @${profile?.username}` });
      }
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user) { toast({ description: "Please sign in to message" }); return; }
    if (user.id === profileId) return;
    const { data: existingChat } = await supabase
      .from('chats').select('id')
      .eq('buyer_id', user.id).eq('seller_id', profileId!).maybeSingle();
    if (existingChat) {
      window.location.href = `/chats/${existingChat.id}`;
    } else {
      const { data: newChat } = await supabase
        .from('chats').insert({ buyer_id: user.id, seller_id: profileId }).select().single();
      if (newChat) window.location.href = `/chats/${newChat.id}`;
    }
  };

  const getAchievementEmoji = (type: string) => {
    const map: Record<string, string> = { top_seller: '⭐', fast_responder: '⚡', hundred_sales: '💯', five_star: '🏆', first_sale: '🎉', verified: '✅', popular: '🔥' };
    return map[type] || '🏅';
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const isOwn = user?.id === profileId;

  return (
    <div className="pb-24 min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sticky top-0 bg-background/90 backdrop-blur-md z-10 border-b border-border">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">{profile.username}'s Profile</h1>
        <button className="p-2 rounded-full hover:bg-muted"><Share2 size={20} /></button>
      </div>

      {/* Profile Info */}
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
          <Link href={`/followers/${profileId}`} className="text-center hover:opacity-70">
            <p className="text-xl font-bold">{(profile.followers_count || 0) >= 1000 ? `${((profile.followers_count || 0) / 1000).toFixed(1)}K` : profile.followers_count || 0}</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </Link>
          <div className="w-px bg-border" />
          <Link href={`/following/${profileId}`} className="text-center hover:opacity-70">
            <p className="text-xl font-bold">{profile.following_count || 0}</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </Link>
        </div>

        {/* Action Buttons */}
        {!isOwn && (
          <div className="flex gap-3 mt-4">
            <Button variant={isFollowing ? "outline" : "default"} className="flex-1 rounded-full font-semibold"
              onClick={handleFollow} disabled={followLoading}>
              {isFollowing ? <><UserCheck size={16} className="mr-1.5" />Following</> : <><UserPlus size={16} className="mr-1.5" />Follow</>}
            </Button>
            <Button variant="outline" className="flex-1 rounded-full font-semibold" onClick={handleMessage}>
              <MessageCircle size={16} className="mr-1.5" />Message
            </Button>
          </div>
        )}
        {isOwn && (
          <Link href="/profile/edit">
            <Button variant="outline" className="w-full mt-4 rounded-full font-semibold border-primary text-primary">Edit Profile</Button>
          </Link>
        )}

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

      {/* Tabs */}
      <div className="flex border-b border-border">
        {(["Listings", "Reviews"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}>
            {t} {t === "Listings" ? `(${products.length})` : `(${reviews.length})`}
          </button>
        ))}
      </div>

      <div className="p-4">
        {tab === "Listings" && (
          products.length === 0
            ? <p className="text-center text-muted-foreground py-12">No listings yet.</p>
            : <div className="grid grid-cols-2 gap-4">
                {products.map(p => <ProductCard key={p.id} product={p} />)}
              </div>
        )}
        {tab === "Reviews" && (
          reviews.length === 0
            ? <p className="text-center text-muted-foreground py-12">No reviews yet.</p>
            : <div className="space-y-4">
                {reviews.map((r: any) => (
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
        )}
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="px-4 pb-6">
          <h3 className="font-bold text-base mb-3">Achievements</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {achievements.map((a: any) => (
              <div key={a.id} className="shrink-0 flex flex-col items-center gap-2 w-20">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-2xl">{getAchievementEmoji(a.type)}</div>
                <p className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
