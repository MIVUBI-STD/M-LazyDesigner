use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct DesktopError {
    pub code: &'static str,
    pub message: String,
    pub recoverable: bool,
}

impl DesktopError {
    pub fn recoverable(code: &'static str, message: String) -> Self {
        Self { code, message, recoverable: true }
    }

    pub fn terminal(code: &'static str, message: impl Into<String>) -> Self {
        Self { code, message: message.into(), recoverable: false }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn command_error_contract_is_stable_json() {
        let value = serde_json::to_value(DesktopError::recoverable(
            "MANAGED_ACTION_FAILED",
            "failed".to_string(),
        )).unwrap();
        assert_eq!(value["code"], "MANAGED_ACTION_FAILED");
        assert_eq!(value["message"], "failed");
        assert_eq!(value["recoverable"], true);
    }
}
