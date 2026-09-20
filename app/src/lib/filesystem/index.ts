import { invoke } from "@tauri-apps/api/core";
import type { NoteContent, NoteState } from "@/components/shared/types";
import type { VaultEntry } from "@/lib/vault/types";

export function getVault() {
  return invoke<string | null>("get_vault");
}

export function openVault(path: string) {
  return invoke<string>("open_vault", { path });
}

export function listVault() {
  return invoke<VaultEntry[]>("list_vault");
}

export function readNote(path: string) {
  return invoke<NoteContent>("read_note", { path });
}

export function saveNote(note: NoteState) {
  return invoke("save_note", {
    path: note.path,
    content: note.content,
    expectedContent: note.savedContent,
  });
}

export function createNoteFile(title: string) {
  return invoke<string>("create_note", { title });
}

export function createFolder(name: string) {
  return invoke("create_folder", { name });
}

export function renameNote(path: string, newTitle: string) {
  return invoke<string>("rename_note", { path, newTitle });
}

export function renameFolder(path: string, newTitle: string) {
  return invoke<string>("rename_folder", { path, newTitle });
}

export function deleteNote(path: string) {
  return invoke("delete_note", { path });
}

export function revealVault() {
  return invoke("reveal_vault");
}
