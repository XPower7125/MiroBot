import { UTApi } from "uploadthing/server";

const api = new UTApi();
export async function uploadUrl(url: string) {
  const upload = await api.uploadFilesFromUrl(url);
  return upload.data?.ufsUrl;
}
