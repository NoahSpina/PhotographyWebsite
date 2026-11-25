export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "client";
export type AlbumStatus = "draft" | "published" | "archived";
export type PhotoStatus = "uploading" | "processing" | "ready" | "failed";
export type OrderType = "booking" | "gallery_upgrade" | "extra_photos";
export type OrderStatus = "pending" | "paid" | "refunded";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<
  Row extends Record<string, unknown>,
  Insert extends Record<string, unknown>,
  Update extends Record<string, unknown>,
> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        },
        {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        }
      >;
      packages: Table<
        {
          id: string;
          name: string;
          description: string | null;
          price_cents: number;
          download_limit: number | null;
          includes_prints: boolean;
          extra_photo_price_cents: number;
          is_active: boolean;
          sort_order: number;
        },
        {
          id?: string;
          name: string;
          description?: string | null;
          price_cents: number;
          download_limit?: number | null;
          includes_prints?: boolean;
          extra_photo_price_cents?: number;
          is_active?: boolean;
          sort_order?: number;
        },
        {
          id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          download_limit?: number | null;
          includes_prints?: boolean;
          extra_photo_price_cents?: number;
          is_active?: boolean;
          sort_order?: number;
        }
      >;
      albums: Table<
        {
          id: string;
          title: string;
          slug: string;
          shoot_date: string | null;
          client_id: string | null;
          client_email: string | null;
          status: AlbumStatus;
          cover_photo_id: string | null;
          assigned_package_id: string | null;
          is_public_portfolio: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          title: string;
          slug: string;
          shoot_date?: string | null;
          client_id?: string | null;
          client_email?: string | null;
          status?: AlbumStatus;
          cover_photo_id?: string | null;
          assigned_package_id?: string | null;
          is_public_portfolio?: boolean;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          title?: string;
          slug?: string;
          shoot_date?: string | null;
          client_id?: string | null;
          client_email?: string | null;
          status?: AlbumStatus;
          cover_photo_id?: string | null;
          assigned_package_id?: string | null;
          is_public_portfolio?: boolean;
          created_at?: string;
          updated_at?: string;
        }
      >;
      photos: Table<
        {
          id: string;
          album_id: string;
          master_s3_key: string | null;
          proof_s3_key: string | null;
          thumb_s3_key: string | null;
          status: PhotoStatus;
          width: number | null;
          height: number | null;
          sort_order: number;
          exif: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          album_id: string;
          master_s3_key?: string | null;
          proof_s3_key?: string | null;
          thumb_s3_key?: string | null;
          status?: PhotoStatus;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          exif?: Json;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          album_id?: string;
          master_s3_key?: string | null;
          proof_s3_key?: string | null;
          thumb_s3_key?: string | null;
          status?: PhotoStatus;
          width?: number | null;
          height?: number | null;
          sort_order?: number;
          exif?: Json;
          created_at?: string;
          updated_at?: string;
        }
      >;
      selections: Table<
        {
          id: string;
          album_id: string;
          photo_id: string;
          client_id: string;
          notes: string | null;
          created_at: string;
        },
        {
          id?: string;
          album_id: string;
          photo_id: string;
          client_id: string;
          notes?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          album_id?: string;
          photo_id?: string;
          client_id?: string;
          notes?: string | null;
          created_at?: string;
        }
      >;
      orders: Table<
        {
          id: string;
          client_id: string;
          album_id: string | null;
          package_id: string;
          order_type: OrderType;
          status: OrderStatus;
          amount_cents: number;
          download_limit_granted: number | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          session_date: string | null;
          booking_notes: string | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          client_id: string;
          album_id?: string | null;
          package_id: string;
          order_type: OrderType;
          status?: OrderStatus;
          amount_cents: number;
          download_limit_granted?: number | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          session_date?: string | null;
          booking_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        },
        {
          id?: string;
          client_id?: string;
          album_id?: string | null;
          package_id?: string;
          order_type?: OrderType;
          status?: OrderStatus;
          amount_cents?: number;
          download_limit_granted?: number | null;
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
          session_date?: string | null;
          booking_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
