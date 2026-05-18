import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          location: string | null;
          country: string | null;
          is_verified: boolean;
          is_online: boolean;
          last_seen: string | null;
          followers_count: number;
          following_count: number;
          listings_count: number;
          total_sales: number;
          items_sold: number;
          response_time_hours: number | null;
          repeat_buyers_pct: number | null;
          success_rate: number | null;
          rating: number;
          reviews_count: number;
          joined_at: string;
          dark_mode: boolean;
        };
      };
      products: {
        Row: {
          id: string;
          seller_id: string;
          title: string;
          description: string | null;
          price: number;
          currency: string;
          country: string;
          location: string | null;
          shipping_info: string | null;
          category: string;
          status: "active" | "sold" | "draft";
          views: number;
          likes_count: number;
          created_at: string;
        };
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          order: number;
        };
      };
      saved_items: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
      };
      chats: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          product_id: string | null;
          last_message: string | null;
          last_message_at: string | null;
          buyer_unread: number;
          seller_unread: number;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          chat_id: string;
          sender_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string | null;
          reviewer_id: string;
          seller_id: string;
          rating: number;
          content: string | null;
          created_at: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          product_id: string | null;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string | null;
          data: Record<string, unknown> | null;
          is_read: boolean;
          created_at: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          label: string;
          earned_at: string;
        };
      };
      product_views: {
        Row: {
          id: string;
          product_id: string;
          viewer_id: string | null;
          viewed_at: string;
        };
      };
    };
  };
};
