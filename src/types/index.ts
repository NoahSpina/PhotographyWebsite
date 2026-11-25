import type { Database } from "@/types/database";

export type {
  AlbumStatus,
  Json,
  OrderStatus,
  OrderType,
  PhotoStatus,
  UserRole,
} from "@/types/database";

export type Role = Database["public"]["Tables"]["profiles"]["Row"]["role"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Package = Database["public"]["Tables"]["packages"]["Row"];
export type Album = Database["public"]["Tables"]["albums"]["Row"];
export type Photo = Database["public"]["Tables"]["photos"]["Row"];
export type Selection = Database["public"]["Tables"]["selections"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
