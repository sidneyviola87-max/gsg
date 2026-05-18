import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronLeft, UserCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FollowingPage() {
  const [, params] = useRoute("/following/:id");
  const { user } = useAuth();
  const [following, setFollowing] = useState<any[]>([]);
  const [myFollowing, setMyFollowing] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const userId = params?.id || user?.id;

  useEffect(() => {
    if (!userId) return;
    async function load() {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles!following_id(*)')
        .eq('follower_id', userId);
      if (data) setFollowing(data);

      if (user) {
        const { data: mf } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        if (mf) setMyFollowing(new Set(mf.map((f: any) => f.following_id)));
      }
      setLoading(false);
    }
    load();
  }, [userId, user]);

  const toggleFollow = async (targetId: string) => {
    if (!user) return;
    if (myFollowing.has(targetId)) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', targetId);
      setMyFollowing(prev => { const s = new Set(prev); s.delete(targetId); return s; });
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: targetId });
      setMyFollowing(prev => new Set([...prev, targetId]));
    }
  };

  return (
    <div className="pb-24 min-h-screen bg-background">
      <div className="bg-background border-b border-border p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Following</h1>
        <span className="text-muted-foreground text-sm ml-1">({following.length})</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading...</div>
      ) : following.length === 0 ? (
        <div className="p-12 text-center text-muted-foreground">Not following anyone yet.</div>
      ) : (
        <div className="divide-y divide-border">
          {following.map((f: any) => {
            const p = f.profiles;
            if (!p) return null;
            const isMe = user?.id === p.id;
            const isFollowing = myFollowing.has(p.id);
            return (
              <div key={f.following_id} className="flex items-center gap-3 p-4">
                <Link href={`/profile/${p.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
                    {p.avatar_url
                      ? <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.username} />
                      : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">{p.username?.[0]?.toUpperCase()}</div>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{p.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.full_name || p.location || ''}</p>
                  </div>
                </Link>
                {!isMe && user && (
                  <Button size="sm" variant={isFollowing ? "outline" : "default"}
                    className="rounded-full shrink-0" onClick={() => toggleFollow(p.id)}>
                    {isFollowing ? <><UserCheck size={14} className="mr-1" />Following</> : <><UserPlus size={14} className="mr-1" />Follow</>}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
