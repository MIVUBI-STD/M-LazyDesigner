//! Explicit debug-only native IPC fault injection; never present in a release.
use std::{env, fs, path::Path};

fn enabled_at(path: &Path, expected: &str) -> bool {
    if !fs::metadata(path).is_ok_and(|meta| meta.is_file() && meta.len() <= 64) {
        return false;
    }
    fs::read_to_string(path).is_ok_and(|value| value.trim() == expected)
}

pub fn enabled(expected: &str) -> bool {
    env::var_os("LAZYDESIGNER_NATIVE_ACCEPTANCE_FILE")
        .is_some_and(|path| enabled_at(Path::new(&path), expected))
}

#[cfg(test)]
mod tests {
    #[test]
    fn only_the_current_exact_fixture_fault_is_enabled() {
        let path = std::env::temp_dir().join(format!("ld-native-acceptance-{}.txt", std::process::id()));
        std::fs::write(&path, "probe-error\n").unwrap();
        assert!(super::enabled_at(&path, "probe-error"));
        assert!(!super::enabled_at(&path, "full-error"));
        std::fs::write(&path, "").unwrap();
        assert!(!super::enabled_at(&path, "probe-error"));
        std::fs::write(&path, "x".repeat(65)).unwrap();
        assert!(!super::enabled_at(&path, "probe-error"));
        std::fs::remove_file(&path).unwrap();
        assert!(!super::enabled_at(&path, "probe-error"));
    }
}
