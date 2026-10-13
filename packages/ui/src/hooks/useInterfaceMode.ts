import { useLumosStoreWithDefault } from "@/store/StoreProvider.js";

export function useIsOfficeMode(): boolean {
  return useLumosStoreWithDefault((state) => state.interfaceMode === "office", false);
}
