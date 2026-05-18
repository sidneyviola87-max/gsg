import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Camera, Loader2 } from "lucide-react";

export default function EditProfilePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({
    username: "",
    full_name: "",
    bio: "",
    location: "",
    country: "",
    avatar_url: "",
  });

  useEffect(() => {
    if (!user) { setLocation("/auth"); return; }
    supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
      if (data) {
        setProfile(data);
        setForm({
          username: data.username || "",
          full_name: data.full_name || "",
          bio: data.bio || "",
          location: data.location || "",
          country: data.country || "",
          avatar_url: data.avatar_url || "",
        });
      }
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0] || !user) return;
    const file = e.target.files[0];
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      setForm(f => ({ ...f, avatar_url: publicUrl + '?t=' + Date.now() }));
      toast({ description: "Photo updated!" });
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({
        username: form.username,
        full_name: form.full_name,
        bio: form.bio,
        location: form.location,
        country: form.country,
        avatar_url: form.avatar_url,
      }).eq('id', user.id);
      if (error) throw error;
      toast({ description: "Profile updated successfully!" });
      setLocation("/profile/view");
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );

  return (
    <div className="pb-24 min-h-screen bg-background">
      <div className="bg-background border-b border-border p-4 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold flex-1">Edit Profile</h1>
        <Button onClick={handleSave} disabled={loading} size="sm" className="rounded-xl">
          {loading ? <Loader2 className="animate-spin" size={16} /> : "Save"}
        </Button>
      </div>

      <form onSubmit={handleSave} className="p-5 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-28 h-28 rounded-full bg-muted overflow-hidden border-4 border-background shadow-lg">
              {form.avatar_url
                ? <img src={form.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                : <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl font-bold">
                    {form.username?.[0]?.toUpperCase() || "?"}
                  </div>
              }
            </div>
            <label className="absolute bottom-0 right-0 w-9 h-9 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-primary/90 transition-colors">
              {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-sm text-muted-foreground">Tap camera icon to change photo</p>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Username</label>
            <Input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="h-12 rounded-xl" placeholder="@username" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="h-12 rounded-xl" placeholder="Your full name" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Bio</label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              className="rounded-xl resize-none" rows={3} placeholder="Tell buyers about yourself..." maxLength={200} />
            <p className="text-xs text-muted-foreground mt-1 text-right">{form.bio.length}/200</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">City / Location</label>
            <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="h-12 rounded-xl" placeholder="e.g. New York" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Country</label>
            <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
              className="h-12 rounded-xl" placeholder="e.g. United States" />
          </div>
        </div>

        <Button type="submit" className="w-full h-14 rounded-xl text-base font-semibold" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
