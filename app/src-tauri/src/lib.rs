use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Default)]
struct AppState {
    vault_path: Mutex<Option<PathBuf>>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct VaultEntry {
    name: String,
    path: String,
    is_directory: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct NoteContent {
    path: String,
    content: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    vault_path: String,
}

fn current_vault(state: &State<'_, AppState>) -> Result<PathBuf, String> {
    state
        .vault_path
        .lock()
        .map_err(|_| "Could not access the current vault".to_string())?
        .clone()
        .ok_or_else(|| "Choose a vault folder first".to_string())
}

fn state_file(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("state.json"))
}

fn relative_path(path: &str) -> Result<PathBuf, String> {
    let candidate = Path::new(path);
    if candidate.as_os_str().is_empty()
        || candidate.is_absolute()
        || candidate
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
    {
        return Err("Invalid vault-relative path".to_string());
    }
    Ok(candidate.to_path_buf())
}

fn existing_note_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = relative_path(relative)?;
    if relative.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Only Markdown notes can be opened".to_string());
    }
    let path = root.join(relative);
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    if !canonical.starts_with(root) || !canonical.is_file() {
        return Err("The note must be a file inside the active vault".to_string());
    }
    Ok(canonical)
}

fn existing_folder_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = relative_path(relative)?;
    let path = root.join(relative);
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    if !canonical.starts_with(root) || !canonical.is_dir() || canonical == root {
        return Err("The folder must be inside the active vault".to_string());
    }
    Ok(canonical)
}

fn existing_entry_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = relative_path(relative)?;
    let path = root.join(relative);
    let metadata = fs::symlink_metadata(&path).map_err(|error| error.to_string())?;
    if metadata.file_type().is_symlink() {
        return Err("Symbolic links cannot be moved".to_string());
    }
    let canonical = path.canonicalize().map_err(|error| error.to_string())?;
    if !canonical.starts_with(root)
        || (!canonical.is_dir() && canonical.extension().and_then(|ext| ext.to_str()) != Some("md"))
    {
        return Err("Only vault folders and Markdown notes can be moved".to_string());
    }
    Ok(canonical)
}

fn new_note_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    let relative = relative_path(relative)?;
    if relative.extension().and_then(|ext| ext.to_str()) != Some("md") {
        return Err("Notes must use the .md extension".to_string());
    }
    let parent = relative.parent().unwrap_or_else(|| Path::new(""));
    let canonical_parent = root
        .join(parent)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !canonical_parent.starts_with(root) {
        return Err("The note must be inside the active vault".to_string());
    }
    let path = canonical_parent.join(relative.file_name().ok_or("Invalid note name")?);
    if path.exists() {
        return Err("A note with that name already exists".to_string());
    }
    Ok(path)
}

fn safe_name(name: &str) -> Result<String, String> {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed == "."
        || trimmed == ".."
        || trimmed.contains('/')
        || trimmed.contains('\\')
    {
        return Err("Enter a simple name without slashes".to_string());
    }
    Ok(trimmed.to_string())
}

fn collect_entries(root: &Path, folder: &Path, entries: &mut Vec<VaultEntry>) -> Result<(), String> {
    let mut children = fs::read_dir(folder)
        .map_err(|error| error.to_string())?
        .filter_map(Result::ok)
        .collect::<Vec<_>>();
    children.sort_by_key(|entry| entry.file_name().to_string_lossy().to_lowercase());

    for child in children {
        let kind = child.file_type().map_err(|error| error.to_string())?;
        if kind.is_symlink() {
            continue;
        }
        let name = child.file_name().to_string_lossy().into_owned();
        if name.starts_with('.') {
            continue;
        }
        let path = child.path();
        let is_directory = kind.is_dir();
        if is_directory || path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            let relative = path
                .strip_prefix(root)
                .map_err(|error| error.to_string())?
                .to_string_lossy()
                .replace('\\', "/");
            entries.push(VaultEntry {
                name,
                path: relative,
                is_directory,
            });
            if is_directory {
                collect_entries(root, &path, entries)?;
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn get_vault(state: State<'_, AppState>) -> Result<Option<String>, String> {
    let path = state
        .vault_path
        .lock()
        .map_err(|_| "Could not access the current vault".to_string())?;
    Ok(path.as_ref().map(|value| value.to_string_lossy().into_owned()))
}

#[tauri::command]
fn open_vault(path: String, app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let canonical = PathBuf::from(path)
        .canonicalize()
        .map_err(|error| error.to_string())?;
    if !canonical.is_dir() {
        return Err("Choose a folder to use as a vault".to_string());
    }

    let serialized = serde_json::to_vec(&PersistedState {
        vault_path: canonical.to_string_lossy().into_owned(),
    })
    .map_err(|error| error.to_string())?;
    fs::write(state_file(&app)?, serialized).map_err(|error| error.to_string())?;
    *state
        .vault_path
        .lock()
        .map_err(|_| "Could not update the current vault".to_string())? = Some(canonical.clone());
    Ok(canonical.to_string_lossy().into_owned())
}

#[tauri::command]
fn list_vault(state: State<'_, AppState>) -> Result<Vec<VaultEntry>, String> {
    let root = current_vault(&state)?;
    let mut entries = Vec::new();
    collect_entries(&root, &root, &mut entries)?;
    entries.sort_by(|left, right| {
        left.path
            .to_lowercase()
            .cmp(&right.path.to_lowercase())
    });
    Ok(entries)
}

#[tauri::command]
fn read_note(path: String, state: State<'_, AppState>) -> Result<NoteContent, String> {
    let root = current_vault(&state)?;
    let note_path = existing_note_path(&root, &path)?;
    let content = fs::read_to_string(&note_path).map_err(|error| error.to_string())?;
    Ok(NoteContent { path, content })
}

#[tauri::command]
fn create_note(title: String, state: State<'_, AppState>) -> Result<String, String> {
    let root = current_vault(&state)?;
    let name = safe_name(&title)?;
    let filename = if name.to_lowercase().ends_with(".md") {
        name
    } else {
        format!("{name}.md")
    };
    let relative = filename;
    let path = new_note_path(&root, &relative)?;
    fs::write(&path, "").map_err(|error| error.to_string())?;
    Ok(relative)
}

#[tauri::command]
fn create_folder(name: String, state: State<'_, AppState>) -> Result<(), String> {
    let root = current_vault(&state)?;
    let name = safe_name(&name)?;
    fs::create_dir(root.join(name)).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_note(
    path: String,
    content: String,
    expected_content: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let root = current_vault(&state)?;
    let note_path = existing_note_path(&root, &path)?;
    let current = fs::read_to_string(&note_path).map_err(|error| error.to_string())?;
    if current != expected_content {
        return Err("NOTE_CHANGED_EXTERNALLY".to_string());
    }
    fs::write(note_path, content).map_err(|error| error.to_string())
}

#[tauri::command]
fn rename_note(path: String, new_title: String, state: State<'_, AppState>) -> Result<String, String> {
    let root = current_vault(&state)?;
    let source = existing_note_path(&root, &path)?;
    let name = safe_name(&new_title)?;
    let filename = if name.to_lowercase().ends_with(".md") {
        name
    } else {
        format!("{name}.md")
    };
    let destination = source.with_file_name(filename);
    if destination.exists() {
        return Err("A note with that name already exists".to_string());
    }
    fs::rename(&source, &destination).map_err(|error| error.to_string())?;
    Ok(destination
        .strip_prefix(&root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace('\\', "/"))
}

#[tauri::command]
fn rename_folder(path: String, new_title: String, state: State<'_, AppState>) -> Result<String, String> {
    let root = current_vault(&state)?;
    let source = existing_folder_path(&root, &path)?;
    let destination = source.with_file_name(safe_name(&new_title)?);
    if destination.exists() {
        return Err("A folder with that name already exists".to_string());
    }
    fs::rename(&source, &destination).map_err(|error| error.to_string())?;
    Ok(destination
        .strip_prefix(&root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace('\\', "/"))
}

#[tauri::command]
fn move_entry(path: String, target_folder: Option<String>, state: State<'_, AppState>) -> Result<String, String> {
    let root = current_vault(&state)?;
    let source = existing_entry_path(&root, &path)?;
    let target = match target_folder {
        Some(path) => existing_folder_path(&root, &path)?,
        None => root.clone(),
    };
    if source.is_dir() && target.starts_with(&source) {
        return Err("A folder cannot be moved into itself".to_string());
    }
    let destination = target.join(source.file_name().ok_or("Invalid vault entry")?);
    if destination.exists() {
        return Err("That folder already contains an item with this name".to_string());
    }
    fs::rename(&source, &destination).map_err(|error| error.to_string())?;
    Ok(destination
        .strip_prefix(&root)
        .map_err(|error| error.to_string())?
        .to_string_lossy()
        .replace('\\', "/"))
}

#[tauri::command]
fn delete_note(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let root = current_vault(&state)?;
    let note_path = existing_note_path(&root, &path)?;
    fs::remove_file(note_path).map_err(|error| error.to_string())
}

#[tauri::command]
fn search_notes(query: String, state: State<'_, AppState>) -> Result<Vec<VaultEntry>, String> {
    let root = current_vault(&state)?;
    let needle = query.trim().to_lowercase();
    if needle.is_empty() {
        return Ok(Vec::new());
    }
    let mut entries = Vec::new();
    collect_entries(&root, &root, &mut entries)?;
    Ok(entries
        .into_iter()
        .filter(|entry| !entry.is_directory)
        .filter(|entry| {
            entry.name.to_lowercase().contains(&needle)
                || fs::read_to_string(root.join(&entry.path))
                    .map(|text| text.to_lowercase().contains(&needle))
                    .unwrap_or(false)
        })
        .collect())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Ok(state_path) = state_file(&app.handle()) {
                if let Ok(data) = fs::read(state_path) {
                    if let Ok(saved) = serde_json::from_slice::<PersistedState>(&data) {
                        if let Ok(path) = PathBuf::from(saved.vault_path).canonicalize() {
                            if path.is_dir() {
                                if let Ok(mut current) = app.state::<AppState>().vault_path.lock() {
                                    *current = Some(path);
                                }
                            }
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_vault,
            open_vault,
            list_vault,
            read_note,
            create_note,
            create_folder,
            save_note,
            rename_note,
            rename_folder,
            move_entry,
            delete_note,
            search_notes
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hippo");
}
