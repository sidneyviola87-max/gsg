import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { filterMessage } from "@/lib/chatFilter";
import { ChevronLeft, Send, MoreVertical, AlertCircle, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ChatDetail() {
  const [, params] = useRoute("/chats/:id");
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [otherUser, setOtherUser] = useState<any>(null);
  const [chatData, setChatData] = useState<any>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!params?.id || !user) return;

    async function loadChat() {
      const { data: chat } = await supabase.from('chats')
        .select('buyer_id, seller_id').eq('id', params!.id).single();
      if (chat) {
        setChatData(chat);
        const otherId = chat.buyer_id === user!.id ? chat.seller_id : chat.buyer_id;
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', otherId).single();
        if (profile) setOtherUser(profile);
      }

      const { data: msgs } = await supabase.from('messages').select('*')
        .eq('chat_id', params!.id).order('created_at', { ascending: true });
      if (msgs) setMessages(msgs);

      // Mark messages as read
      await supabase.from('messages').update({ is_read: true })
        .eq('chat_id', params!.id).neq('sender_id', user!.id);
      // Reset unread count
      if (chat) {
        const isbuyer = chat.buyer_id === user!.id;
        await supabase.from('chats').update(
          isbuyer ? { buyer_unread: 0 } : { seller_unread: 0 }
        ).eq('id', params!.id);
      }

      setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
    }
    loadChat();

    const channel = supabase.channel(`chat:${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `chat_id=eq.${params.id}`
      }, (payload) => {
        setMessages(m => [...m, payload.new]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        // Mark read if not from me
        if (payload.new.sender_id !== user?.id) {
          supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params?.id, user]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user || !params?.id || sending) return;

    const result = filterMessage(content);
    if (result.blocked) {
      setWarning(result.warning);
      setTimeout(() => setWarning(null), 5000);
      return;
    }

    const newMsg = content.trim();
    setContent("");
    setSending(true);

    try {
      const { data: inserted } = await supabase.from('messages').insert({
        chat_id: params.id,
        sender_id: user.id,
        content: newMsg,
      }).select().single();

      // Update chat
      await supabase.from('chats').update({
        last_message: newMsg,
        last_message_at: new Date().toISOString(),
      }).eq('id', params.id);

      // Send notification to other user
      if (otherUser && inserted) {
        const myProfile = await supabase.from('profiles').select('username').eq('id', user.id).single();
        await supabase.from('notifications').insert({
          user_id: otherUser.id,
          type: 'message',
          title: 'New Message',
          body: `@${myProfile.data?.username}: ${newMsg.slice(0, 80)}`,
          data: { chat_id: params.id, sender_id: user.id },
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: string) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-card sticky top-0 z-10">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <Link href={otherUser ? `/profile/${otherUser.id}` : '#'} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 relative">
            {otherUser?.avatar_url
              ? <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt={otherUser.username} />
              : <UserCircle size={40} className="text-muted-foreground" />
            }
            {otherUser?.is_online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-card rounded-full" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold truncate">{otherUser?.username || 'User'}</h2>
            <p className="text-xs text-muted-foreground">
              {otherUser?.is_online ? <span className="text-green-500 font-medium">Online now</span> : 'View Profile'}
            </p>
          </div>
        </Link>
        <button className="p-2 -mr-2 rounded-full hover:bg-muted"><MoreVertical size={20} /></button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user?.id;
          const showTime = i === messages.length - 1 || messages[i + 1]?.sender_id !== msg.sender_id;
          return (
            <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%]">
                <div className={`rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
                {showTime && (
                  <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.created_at)}
                    {isMe && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {warning && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-sm font-medium flex items-center justify-center gap-2 border-t border-destructive/20">
          <AlertCircle size={16} /> {warning}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2 items-center pb-safe">
        <Input
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-full h-12 bg-muted border-none focus-visible:ring-1 focus-visible:ring-primary"
        />
        <button type="submit" disabled={!content.trim() || sending}
          className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity hover:bg-primary/90">
          <Send size={18} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
}
