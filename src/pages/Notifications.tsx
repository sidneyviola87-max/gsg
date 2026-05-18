import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, Heart, MessageCircle, Package, Star, UserPlus, Tag } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    async function loadNotifs() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.is_read).length);
      }
      setLoading(false);
    }
    loadNotifs();

    // Real-time subscription for new notifications
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as any, ...prev]);
        setUnreadCount(c => c + 1);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(c => Math.max(0, c - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="text-primary fill-primary/20" size={20} />;
      case 'message': return <MessageCircle className="text-blue-500" size={20} />;
      case 'order': return <Package className="text-green-500" size={20} />;
      case 'review': return <Star className="text-yellow-500 fill-yellow-500/20" size={20} />;
      case 'follow': return <UserPlus className="text-purple-500" size={20} />;
      case 'offer': return <Tag className="text-orange-500" size={20} />;
      default: return <Bell className="text-muted-foreground" size={20} />;
    }
  };

  const getHref = (notif: any) => {
    if (!notif.data) return "#";
    switch (notif.type) {
      case 'message': return notif.data.chat_id ? `/chat/${notif.data.chat_id}` : "/chat";
      case 'follow': return notif.data.follower_id ? `/profile/${notif.data.follower_id}` : "/profile";
      case 'like': case 'review': return notif.data.product_id ? `/product/${notif.data.product_id}` : "#";
      default: return "#";
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString();
  };

  if (!user) return (
    <div className="p-8 text-center">
      <Bell size={48} className="mx-auto mb-4 opacity-20" />
      <p className="text-muted-foreground">Please sign in to view notifications.</p>
      <Link href="/auth"><Button className="mt-4 rounded-full">Sign In</Button></Link>
    </div>
  );

  return (
    <div className="pb-24 min-h-screen bg-background">
      <div className="bg-background border-b border-border p-4 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadCount > 0 && <p className="text-xs text-primary font-medium">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-primary font-medium text-sm">
            Mark all read
          </Button>
        )}
      </div>

      <div className="divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center">
            <Bell size={56} className="mb-4 opacity-10" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">When someone messages or follows you, it'll show here</p>
          </div>
        ) : (
          notifications.map(notif => (
            <Link
              key={notif.id}
              href={getHref(notif)}
              onClick={() => !notif.is_read && markRead(notif.id)}
              className={`flex gap-4 p-4 hover:bg-muted/30 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}
            >
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm leading-tight ${!notif.is_read ? 'font-bold' : 'font-medium'}`}>{notif.title}</h3>
                {notif.body && <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{notif.body}</p>}
                <span className="text-xs text-muted-foreground mt-1.5 block">{formatTime(notif.created_at)}</span>
              </div>
              {!notif.is_read && <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1.5" />}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
