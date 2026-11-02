import type { AxiosInstance } from "axios";
import type { Row } from "./model";

// POST /api/auth/login. The token is a session: send it as `Authorization: Bearer <token>`.
// A wrong email or password is a 401 and too many tries a 429; the server answers both the
// same whether or not the account exists.
export const login = async (
  client: AxiosInstance,
  input: { email: string; password: string },
): Promise<{ token: string; user: Row }> => {
  const { data } = await client.post<{ data: Row & { token: string } }>(
    "/api/auth/login",
    input,
  );
  const { token, ...user } = data.data;

  return { token, user };
};

// DELETE /api/auth/logout. Removes the session on the server.
export const logout = async (client: AxiosInstance) => {
  await client.delete("/api/auth/logout");
};

// GET /api/auth/check-token. The signed-in user; a 401 means the token is not (or no longer)
// good.
export const checkToken = async (client: AxiosInstance): Promise<Row> => {
  const { data } = await client.get<{ data: Row }>("/api/auth/check-token");

  return data.data;
};
