//! Small Desktop-owned JSON only; never call for Blockbench/user assets.
use rand::RngCore;
use std::{fs::{self, OpenOptions}, io::{self, Write}, path::Path};

pub(crate) fn replace_metadata(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let parent = path.parent().filter(|p| p.is_dir())
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Metadata parent directory unavailable."))?;
    let name = path.file_name()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "Missing metadata filename."))?;
    match fs::symlink_metadata(path) {
        Ok(meta) if !meta.file_type().is_file() =>
            return Err(io::Error::new(io::ErrorKind::InvalidInput, "Metadata target must be a regular file.")),
        Err(err) if err.kind() == io::ErrorKind::NotFound => {}
        Err(err) => return Err(err),
        _ => {}
    }
    for _ in 0..8 {
        let mut nonce = [0u8; 8];
        rand::thread_rng().fill_bytes(&mut nonce);
        let temp = parent.join(format!(".{}.{}.tmp", name.to_string_lossy(), u64::from_le_bytes(nonce)));
        let mut file = match OpenOptions::new().write(true).create_new(true).open(&temp) {
            Ok(file) => file,
            Err(err) if err.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(err) => return Err(err),
        };
        let result = (|| -> io::Result<()> {
            file.write_all(bytes)?;
            file.sync_all()?;
            drop(file);
            // Same-directory rename replaces complete contents, never unlinking the old file first.
            fs::rename(&temp, path)
        })();
        if result.is_err() { let _ = fs::remove_file(&temp); }
        return result;
    }
    Err(io::Error::new(io::ErrorKind::AlreadyExists, "No unique metadata staging path available."))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("ld-metadata-{}-{}", std::process::id(), rand::random::<u64>()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }
    #[test]
    fn creates_and_replaces_whole_file_without_orphan_staging() {
        let dir = fixture(); let path = dir.join("preferences.json");
        replace_metadata(&path, b"old").unwrap();
        replace_metadata(&path, b"replacement").unwrap();
        assert_eq!(fs::read(path).unwrap(), b"replacement");
        assert_eq!(fs::read_dir(&dir).unwrap().count(), 1);
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn never_overwrites_directory_target() {
        let dir = fixture(); let path = dir.join("preferences.json");
        fs::create_dir(&path).unwrap();
        assert!(replace_metadata(&path, b"overwrite").is_err());
        assert!(path.is_dir());
        fs::remove_dir_all(dir).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn never_follows_existing_symlink_target() {
        let dir = fixture(); let original = dir.join("source"); let link = dir.join("preferences.json");
        fs::write(&original, b"source").unwrap();
        std::os::unix::fs::symlink(&original, &link).unwrap();
        assert!(replace_metadata(&link, b"overwrite").is_err());
        assert_eq!(fs::read(original).unwrap(), b"source");
        fs::remove_dir_all(dir).unwrap();
    }
}
