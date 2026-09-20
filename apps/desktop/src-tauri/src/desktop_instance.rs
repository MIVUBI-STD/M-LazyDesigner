#[cfg(windows)]
mod platform {
    use std::{
        ffi::c_void,
        io,
        ptr,
    };

    type Handle = *mut c_void;
    type Hwnd = *mut c_void;

    const ERROR_ALREADY_EXISTS: u32 = 183;
    const SW_RESTORE: i32 = 9;
    const INSTANCE_MUTEX_NAME: &str = "Local\\com.halokaryamedia.lazydesigner.desktop";
    const MAIN_WINDOW_TITLE: &str = "LazyDesigner";

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn CreateMutexW(
            mutex_attributes: *const c_void,
            initial_owner: i32,
            name: *const u16,
        ) -> Handle;
        fn ReleaseMutex(mutex: Handle) -> i32;
        fn CloseHandle(object: Handle) -> i32;
        fn GetLastError() -> u32;
    }

    #[link(name = "user32")]
    unsafe extern "system" {
        fn FindWindowW(class_name: *const u16, window_name: *const u16) -> Hwnd;
        fn ShowWindowAsync(window: Hwnd, command: i32) -> i32;
        fn SetForegroundWindow(window: Hwnd) -> i32;
    }

    pub enum InstanceAcquire {
        Primary(InstanceGuard),
        Secondary,
    }

    pub struct InstanceGuard {
        mutex: Handle,
    }

    fn wide(value: &str) -> Vec<u16> {
        value.encode_utf16().chain(std::iter::once(0)).collect()
    }

    fn focus_existing_window() {
        let title = wide(MAIN_WINDOW_TITLE);
        unsafe {
            let window = FindWindowW(ptr::null(), title.as_ptr());
            if !window.is_null() {
                let _ = ShowWindowAsync(window, SW_RESTORE);
                let _ = SetForegroundWindow(window);
            }
        }
    }

    pub fn acquire() -> Result<InstanceAcquire, String> {
        let name = wide(INSTANCE_MUTEX_NAME);
        unsafe {
            let mutex = CreateMutexW(ptr::null(), 1, name.as_ptr());
            if mutex.is_null() {
                return Err(format!(
                    "Unable to establish Desktop instance mutex: {}",
                    io::Error::last_os_error()
                ));
            }

            if GetLastError() == ERROR_ALREADY_EXISTS {
                focus_existing_window();
                let _ = CloseHandle(mutex);
                return Ok(InstanceAcquire::Secondary);
            }

            Ok(InstanceAcquire::Primary(InstanceGuard { mutex }))
        }
    }

    impl Drop for InstanceGuard {
        fn drop(&mut self) {
            unsafe {
                let _ = ReleaseMutex(self.mutex);
                let _ = CloseHandle(self.mutex);
            }
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn mutex_identity_is_stable_and_session_local() {
            assert!(INSTANCE_MUTEX_NAME.starts_with("Local\\"));
            assert!(INSTANCE_MUTEX_NAME.contains("com.halokaryamedia.lazydesigner"));
            let encoded = wide(INSTANCE_MUTEX_NAME);
            assert_eq!(encoded.last(), Some(&0));
            assert_eq!(encoded.iter().filter(|value| **value == 0).count(), 1);
        }

        #[test]
        fn focus_target_matches_canonical_main_window_title() {
            assert_eq!(MAIN_WINDOW_TITLE, "LazyDesigner");
            let encoded = wide(MAIN_WINDOW_TITLE);
            assert_eq!(encoded.last(), Some(&0));
        }
    }
}

#[cfg(not(windows))]
mod platform {
    pub enum InstanceAcquire {
        Primary(InstanceGuard),
        Secondary,
    }

    pub struct InstanceGuard;

    pub fn acquire() -> Result<InstanceAcquire, String> {
        Ok(InstanceAcquire::Primary(InstanceGuard))
    }
}

pub use platform::{acquire, InstanceAcquire};
