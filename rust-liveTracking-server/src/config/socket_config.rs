use std::{env, time::Duration};

#[derive(Clone, Debug)]
pub struct SocketConfig {
    pub heartbeat_interval: Duration,
    pub client_timeout: Duration,
}

impl SocketConfig {
    pub fn from_env() -> Self {
        let secs = |key: &str, default: u64| {
            env::var(key)
                .ok()
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(default)
        };

        Self {
            heartbeat_interval: Duration::from_secs(secs("WS_HEARTBEAT_SECS", 5)),
            client_timeout: Duration::from_secs(secs("WS_CLIENT_TIMEOUT_SECS", 15)),
        }
    }
}
