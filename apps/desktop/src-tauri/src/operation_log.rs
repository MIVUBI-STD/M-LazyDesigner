use std::{
    env,
    fs::{self, OpenOptions},
    io::Write,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

const MAX_LOG_BYTES: u64 = 512 * 1024;

fn log_dir() -> Option<PathBuf> {
    env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .map(|base| base.join("LazyDesigner").join("logs"))
}

fn clean_token(value: &str) -> String {
    value
        .chars()
        .take(64)
        .map(|ch| if ch.is_ascii_alphanumeric() || matches!(ch, '-' | '_' | '.' | ':') { ch } else { '_' })
        .collect()
}

pub fn record(event: &str, outcome: &str) {
    let Some(dir) = log_dir() else { return; };
    if fs::create_dir_all(&dir).is_err() { return; }

    let path = dir.join("desktop.log");
    if fs::metadata(&path).map(|meta| meta.len() >= MAX_LOG_BYTES).unwrap_or(false) {
        let rotated = dir.join("desktop.log.1");
        let _ = fs::remove_file(&rotated);
        let _ = fs::rename(&path, &rotated);
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(
            file,
            "{} {} {}",
            timestamp,
            clean_token(event),
            clean_token(outcome)
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn log_tokens_are_bounded_and_plain() {
        let value = clean_token("managed:update\nsecret=value");
        assert_eq!(value, "managed:update_secret_value");
        assert!(value.len() <= 64);
    }
}
