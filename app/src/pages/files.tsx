import { canList, useSession } from "@njinlabs/njin-admin/sdk";
import { FileManager } from "../components/file-manager";
import { NoAccess } from "./users/shared";

// /files
export const FilesPage = () => {
  const { permissions } = useSession();

  if (!canList(permissions, "file")) return <NoAccess what="Files" />;

  return <FileManager />;
};
