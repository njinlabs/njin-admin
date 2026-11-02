import { mutationOptions, type QueryClient } from "@tanstack/react-query";
import type { AxiosInstance } from "axios";
import type { Row } from "./model";

// A file record. List and delete them like any model: modelApi<FileRow>(client, "file").
export type FileRow = Row & {
  name: string;
  size: number;
  type: string;
  url: string;
  createdAt: string;
  updatedAt: string;
};

// POST /api/file, as multipart. The server refuses types that would run on the site's origin
// (HTML, JavaScript, XML) with a 422.
export const uploadFile = async (
  client: AxiosInstance,
  file: File | Blob,
): Promise<FileRow> => {
  const body = new FormData();
  body.append("file", file);

  const { data } = await client.post<{ data: FileRow }>("/api/file", body);

  return data.data;
};

export const uploadFileMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: (file: File | Blob) => uploadFile(client, file),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["model", "file"] }),
  });
