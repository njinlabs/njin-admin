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
// (HTML, JavaScript, XML) with a 422. `onProgress` gets 0 to 100 while the bytes go up.
export const uploadFile = async (
  client: AxiosInstance,
  file: File | Blob,
  onProgress?: (percent: number) => void,
): Promise<FileRow> => {
  const body = new FormData();
  body.append("file", file);

  // The server answers with a one-element array, not the record itself.
  const { data } = await client.post<{ data: FileRow[] }>("/api/file", body, {
    onUploadProgress: ({ loaded, total }) =>
      total && onProgress?.(Math.round((loaded * 100) / total)),
  });

  return data.data[0] as FileRow;
};

export const uploadFileMutation = (
  client: AxiosInstance,
  queryClient: QueryClient,
) =>
  mutationOptions({
    mutationFn: ({
      file,
      onProgress,
    }: {
      file: File | Blob;
      onProgress?: (percent: number) => void;
    }) => uploadFile(client, file, onProgress),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["model", "file"] }),
  });
