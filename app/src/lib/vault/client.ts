import { invoke } from "@tauri-apps/api/core";
import type { VaultEntry } from "./types";

export function listVault() {
  return invoke<VaultEntry[]>("list_vault");
}
