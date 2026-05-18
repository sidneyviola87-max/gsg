import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  Settings, Package, Heart, LogOut, ChevronRight, ShoppingBag,
  Star, Wallet, HelpCircle, UserPlus, Moon, Eye, Award,
  Tag, ShoppingCart, Gift, Trash2, CheckSquare, Sun
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Switch } from "@/components/ui/switch";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [profile, setProfile] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!user) { setLocation("/auth"); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setDarkMode(data.dark_mode || false);
        if (data.dark_mode) document.documentElement.classList.add('dark');
      }
    });
  }, [user]);

  const toggleDarkMode = async () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    if (user) await supabase.from('profiles').update({ dark_mode: next }).eq('id', user.id);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This cannot be undone.")) return;
    if (!confirm("Final confirmation: DELETE my account permanently?")) return;
    await supabase.from('profiles').delete().eq('id', user!.id);
    await signOut();
    setLocation("/");
  };

  if (!user || !profile) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const menuItems = [
    { icon: Eye, label: "View Full Profile", href: "/profile/view" },
    { icon: ShoppingBag, label: "My Shop", href: `/shop/${user.id}` },
    { icon: Package, label: "My Listings", href: "/profile/view", badge: profile.listings_count || 0 },
    { icon: CheckSquare, label: "Mark as Sold", href: "/my-listings" },
    { icon: Award, label: "Achievements", href: "/profile/view" },
    { icon: ShoppingCart, label: "Orders & Purchases", href: "/orders" },
    { icon: Heart, label: "Saved Items", href: "/saved" },
    { icon: Tag, label: "Offers & Coupons", href: "/offers" },
    { icon: Star, label: "My Reviews", href: "/profile/view" },
    { icon: Wallet, label: "Wallet", href: "/wallet" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
    { icon: Gift, label: "Invite & Earn", href: "/invite" },
  ];

  return (
    <div className="pb-24 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="bg-primary text-primary-foreground pt-12 pb-6 px-6 rounded-b-3xl shadow-md">
        <Link href="/profile/view" className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-background/20 border-2 border-primary-foreground/50 overflow-hidden shrink-0 shadow-lg">
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile.username} />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-foreground">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </div>
            }
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{profile.full_name || profile.username}</h1>
              {profile.is_verified && (
                <div className="w-5 h-5 bg-primary-foreground rounded-full flex items-center justify-center">
                  <span className="text-primary text-xs font-bold">✓</span>
                </div>
              )}
            </div>
            <p className="opacity-80 text-sm">@{profile.username}</p>
            <div className="flex gap-4 mt-2 text-sm font-medium">
              <Link href={`/followers/${user.id}`} className="hover:underline">
                <span className="font-bold">{profile.followers_count || 0}</span> Followers
              </Link>
              <Link href={`/following/${user.id}`} className="hover:underline">
                <span className="font-bold">{profile.following_count || 0}</span> Following
              </Link>
            </div>
          </div>
        </Link>
        <Link href="/profile/edit">
          <Button variant="secondary" size="sm" className="mt-4 w-full rounded-full font-semibold bg-primary-foreground/20 border border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/30">
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Menu Items */}
      <div className="p-4 mt-4 space-y-3">
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {menuItems.map((item, i) => (
            <Link
              key={i}
              href={item.href}
              className={`flex items-center justify-between p-4 ${i !== menuItems.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/50 cursor-pointer transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <item.icon size={20} />
                </div>
                <span className="font-medium">{item.label}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                )}
                <ChevronRight size={18} />
              </div>
            </Link>
          ))}
        </div>

        {/* Dark Mode Toggle */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <span className="font-medium">Dark Mode</span>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
        </div>

        {/* Sign Out */}
        <Button variant="outline" className="w-full h-14 rounded-2xl text-base font-semibold shadow-sm border-border"
          onClick={() => { signOut(); setLocation("/"); }}>
          <LogOut className="mr-2" size={20} /> Sign Out
        </Button>

        {/* Delete Account */}
        <button onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-2 text-destructive text-sm font-medium py-3 hover:underline">
          <Trash2 size={16} /> Delete Account
        </button>
      </div>
    </div>
  );
}
