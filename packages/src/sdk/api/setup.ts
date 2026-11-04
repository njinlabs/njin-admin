import type { AxiosInstance } from "axios";
import type { Row } from "./model";

// GET /api/setup/status. True until the first user exists.
export const getSetupStatus = async (
  client: AxiosInstance,
): Promise<{ needsSetup: boolean }> => {
  const { data } = await client.get<{ needsSetup: boolean }>(
    "/api/setup/status",
  );

  return data;
};

// POST /api/setup. Creates the first admin and signs the browser in (the cookie, as at login); the
// server refuses (403) once any user exists.
export const createFirstAdmin = async (
  client: AxiosInstance,
  input: { name: string; email: string; password: string },
): Promise<{ token: string; user: Row }> => {
  const { data } = await client.post<{ data: { token: string; user: Row } }>(
    "/api/setup",
    input,
  );

  return data.data;
};
