import axios, { type AxiosInstance } from "axios";

export * from "./model";
export * from "./vars";

// The one axios instance for talking to the njin server. Same origin by default (the admin is
// served by njin); in dev Vite proxies /api to the server.
export const createClient = (baseURL = "") => axios.create({ baseURL });

// A plugin the server lists: where its script is, and the stylesheets built with it.
export type ManifestPlugin = {
  name: string;
  entry: string;
  styles?: string[];
};

export type Manifest = { plugins: ManifestPlugin[] };

// GET /api/admin/manifest
export const getManifest = async (client: AxiosInstance): Promise<Manifest> => {
  const { data } = await client.get<Manifest>("/api/admin/manifest");

  return data;
};
