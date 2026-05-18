import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImagePlus, X } from "lucide-react";

export default function PostPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 3);
      setImages(files);
      setPreviews(files.map(f => URL.createObjectURL(f)));
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !category) return;
    setLoading(true);

    try {
      // Create product
      const { data: product, error } = await supabase.from('products').insert({
        seller_id: user.id,
        title,
        price: parseFloat(price),
        currency,
        category,
        description,
        country: "USA", // Default for now
        status: "active"
      }).select().single();

      if (error) throw error;

      // Upload images
      if (images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, file);
            
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('product-images')
              .getPublicUrl(fileName);
              
            await supabase.from('product_images').insert({
              product_id: product.id,
              url: publicUrl,
              order: i
            });
          }
        }
      }

      toast({ description: "Product posted successfully!" });
      setLocation(`/product/${product.id}`);
    } catch (err: any) {
      toast({ description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24">
      <div className="bg-background border-b border-border p-4 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold">Post an Item</h1>
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>Cancel</Button>
      </div>

      <form onSubmit={handlePost} className="p-4 space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-2">Photos (Max 3)</label>
          <div className="flex gap-2 overflow-x-auto">
            {previews.map((src, i) => (
              <div key={i} className="w-24 h-24 shrink-0 rounded-xl overflow-hidden relative border border-border">
                <img src={src} className="w-full h-full object-cover" />
                <button type="button" onClick={() => {
                  const newImages = [...images]; newImages.splice(i, 1); setImages(newImages);
                  const newPreviews = [...previews]; newPreviews.splice(i, 1); setPreviews(newPreviews);
                }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1">
                  <X size={14} />
                </button>
              </div>
            ))}
            {previews.length < 3 && (
              <label className="w-24 h-24 shrink-0 rounded-xl border-2 border-dashed border-primary/50 flex flex-col items-center justify-center text-primary hover:bg-primary/5 cursor-pointer transition-colors">
                <ImagePlus size={24} />
                <span className="text-[10px] mt-1 font-medium">Add Photo</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageSelect} />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you selling?" className="h-12 rounded-xl" />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Price</label>
              <Input type="number" required value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="h-12 rounded-xl" />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1">Currency</label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="h-12 rounded-xl"><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Women">Women</SelectItem>
                <SelectItem value="Men">Men</SelectItem>
                <SelectItem value="Electronics">Electronics</SelectItem>
                <SelectItem value="Home">Home</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <Textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your item..." className="min-h-[120px] rounded-xl resize-none" />
          </div>
        </div>

        <Button type="submit" className="w-full h-14 rounded-xl text-base font-semibold shadow-md mt-4" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "Post Listing"}
        </Button>
      </form>
    </div>
  );
}
