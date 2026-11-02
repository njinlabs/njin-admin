import axios from "axios";

export * from "./model";
export * from "./vars";

// The one axios instance for talking to the njin server. Same origin by default (the admin is
// served by njin); in dev Vite proxies /api to the server.
export const createClient = (baseURL = "") => axios.create({ baseURL });
