import { useEffect, useState } from "react";
import { Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatsPage() {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    
    async function loadChats() {
      // Need a proper query to get chat details and other user's profile
      const { data } = await supabase
        .from('chats')
        .select(`*, buyer:profiles!buyer_id(*), seller:profiles!seller_id(*)`)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order('last_message_at', { ascending: false });
        
      if (data) setChats(data);
    }
    loadChats();
  }, [user]);

  if (!user) return <div className="p-8 text-center">Please sign in to view chats.</div>;

  return (
    <div className="pb-24">
      <div className="bg-primary text-primary-foreground p-4 sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>
      
      <div className="divide-y divide-border">
        {chats.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No messages yet.</div>
        ) : (
          chats.map(chat => {
            const isBuyer = chat.buyer_id === user.id;
            const otherUser = isBuyer ? chat.seller : chat.buyer;
            const unread = isBuyer ? chat.buyer_unread : chat.seller_unread;
            
            return (
              <Link key={chat.id} href={`/chats/${chat.id}`} className="block hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4 p-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-muted overflow-hidden shrink-0">
                      {otherUser?.avatar_url && <img src={otherUser.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    {otherUser?.is_online && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full"></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-foreground truncate">{otherUser?.username || 'User'}</h3>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {chat.last_message_at ? new Date(chat.last_message_at).toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {chat.last_message || 'Start a conversation...'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {unread}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
