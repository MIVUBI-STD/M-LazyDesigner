use std::{io::{BufRead, BufReader, Read}, process::{Command, ExitStatus, Output, Stdio}, sync::mpsc, thread, time::{Duration, Instant}};

pub fn run_output(command: &mut Command, timeout: Duration, label: &str) -> Result<Output, String> {
    run_output_with_stderr_lines(command, timeout, label, |_| {})
}

pub fn run_output_with_stderr_lines<F>(command: &mut Command, timeout: Duration, label: &str, mut on_stderr_line: F) -> Result<Output, String>
where F: FnMut(&str) {
    command.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = command.spawn().map_err(|error| format!("{label} could not start: {error}"))?;
    let mut stdout = child.stdout.take().ok_or_else(|| format!("{label} stdout is unavailable."))?;
    let stderr = child.stderr.take().ok_or_else(|| format!("{label} stderr is unavailable."))?;
    let stdout_reader = thread::spawn(move || { let mut bytes = Vec::new(); stdout.read_to_end(&mut bytes).map(|_| bytes) });
    let (line_tx, line_rx) = mpsc::channel::<String>();
    let stderr_reader = thread::spawn(move || {
        let mut bytes = Vec::new(); let mut reader = BufReader::new(stderr);
        loop { let mut line = String::new(); match reader.read_line(&mut line) {
            Ok(0) => break,
            Ok(_) => { bytes.extend_from_slice(line.as_bytes()); let _ = line_tx.send(line.trim_end_matches(&['\r', '\n'][..]).to_string()); },
            Err(error) => return Err(error),
        }}
        Ok(bytes)
    });
    let started = Instant::now();
    let status: ExitStatus = loop {
        while let Ok(line) = line_rx.try_recv() { on_stderr_line(&line); }
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() < timeout => thread::sleep(Duration::from_millis(50)),
            Ok(None) => { let _=child.kill(); let _=child.wait(); let _=stdout_reader.join(); let _=stderr_reader.join(); return Err(format!("{label} timed out after {} seconds.", timeout.as_secs())); },
            Err(error) => { let _=child.kill(); let _=child.wait(); let _=stdout_reader.join(); let _=stderr_reader.join(); return Err(format!("{label} process state could not be read: {error}")); }
        }
    };
    while let Ok(line) = line_rx.try_recv() { on_stderr_line(&line); }
    let stdout = stdout_reader.join().map_err(|_| format!("{label} stdout reader panicked."))?.map_err(|e| format!("{label} stdout could not be collected: {e}"))?;
    let stderr = stderr_reader.join().map_err(|_| format!("{label} stderr reader panicked."))?.map_err(|e| format!("{label} stderr could not be collected: {e}"))?;
    Ok(Output { status, stdout, stderr })
}
