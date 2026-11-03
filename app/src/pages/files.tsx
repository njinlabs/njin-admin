import { canList } from "@njinlabs/njin-admin/sdk";
import { FileManager } from "../components/file-manager";
import { useSession } from "../components/session";
import { NoAccess } from "./users/shared";

// /files
export const FilesPage = () => {
  const { permissions } = useSession();

  if (!canList(permissions, "file")) return <NoAccess what="Files" />;

  return <FileManager />;
};
