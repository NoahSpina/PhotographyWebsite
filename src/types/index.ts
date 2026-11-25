export type Role = "photographer" | "client";

export type Album = {
  id: string;
  title: string;
};

export type Photo = {
  id: string;
  albumId: string;
  storageKey: string;
};

export type Order = {
  id: string;
  status: string;
};
