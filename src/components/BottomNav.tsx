import { Link, useLocation } from "wouter";
import { Home, MessageCircle, PlusCircle, User, Search, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchCounts = async () => {
      const { data } = await supabase
        .from('chats').select('buyer_id, seller_id, buyer_unread, seller_unread')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);
      if (data) {
        let count = 0;
        data.forEach((c: any) => {
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

    const channel = supabase.channel('bottomnav_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchCounts)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => setUnreadNotifications(c => c + 1))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (location === "/auth") return null;

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/chats", icon: MessageCircle, label: "Chats", badge: unreadMessages },
    { href: "/post", icon: PlusCircle, label: "Post", isCenter: true },
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/search", icon: Search, label: "Search" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-2 py-2 flex justify-between items-center z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href || (item.href !== '/' && location.startsWith(`${item.href}`));

        if (item.isCenter) {
          return (
            <Link key={item.href} href={item.href} className="relative -top-5">
              <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-lg hover:scale-105 transition-transform">
                <Icon size={26} />
              </div>
            </Link>
          );
        }

        return (
          <Link key={item.href} href={item.href}
            className={`flex flex-col items-center p-2 flex-1 ${isActive ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`}>
            <div className="relative">
              <Icon size={22} />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
