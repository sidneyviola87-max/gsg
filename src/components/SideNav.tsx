import { Link, useLocation } from "wouter";
import { Home, MessageCircle, PlusCircle, User, Search, Bell, ShoppingBag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SideNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const { data: chats } = await supabase
        .from('chats').select('buyer_id, seller_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      if (chats) {
        let count = 0;
        chats.forEach((c: any) => {
          if (c.buyer_id === user.id) count += c.buyer_unread;
          if (c.seller_id === user.id) count += c.seller_unread;
        });
        setUnreadMessages(count);
      }
      const { count: notifCount } = await supabase
        .from('notifications').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('is_read', false);
      setUnreadNotifications(notifCount || 0);
    };
    fetchCounts();

    const msgChannel = supabase.channel('sidenav_msgs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchCounts)
      .subscribe();
    const notifChannel = supabase.channel('sidenav_notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setUnreadNotifications(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(msgChannel); supabase.removeChannel(notifChannel); };
  }, [user]);

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/chats", icon: MessageCircle, label: "Messages", badge: unreadMessages },
    { href: "/post", icon: PlusCircle, label: "Post Item" },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/notifications", icon: Bell, label: "Notifications", badge: unreadNotifications },
  ];

  return (
    <div className="flex flex-col h-screen sticky top-0 p-4">
      <Link href="/" className="flex items-center gap-2 px-3 py-4 mb-4">
        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-xl flex items-center justify-center">
          <ShoppingBag size={18} />
        </div>
        <span className="text-xl font-bold text-primary">Marketplace</span>
      </Link>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== '/' && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors relative ${isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'}`}>
              <div className="relative">
                <Icon size={20} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
