use anyhow::{Context, Result};
use std::time::Duration;

#[derive(Clone, Debug)]
pub struct Config {
    pub redis_url: String,
    pub bind_addr: String,
    pub jwt_secret: String,
    pub heartbeat_interval: Duration,
    pub idle_timeout: Duration,
    pub env: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            redis_url: "redis://127.0.0.1:6379/0".to_string(),
            bind_addr: "0.0.0.0:8080".to_string(),
            jwt_secret: "development-jwt-secret".to_string(),
            heartbeat_interval: Duration::from_secs(15),
            idle_timeout: Duration::from_secs(30),
            env: "development".to_string(),
        }
    }
}

impl Config {
    pub fn from_env() -> Result<Self> {
        dotenvy::dotenv().ok();

        let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379/0".to_string());
        let bind_addr = std::env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".to_string());
        let jwt_secret = std::env::var("JWT_SECRET").context("JWT_SECRET must be set")?;
        let heartbeat_interval = std::env::var("HEARTBEAT_INTERVAL_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(15);
        let idle_timeout = std::env::var("IDLE_TIMEOUT_SECS")
            .ok()
            .and_then(|value| value.parse::<u64>().ok())
            .unwrap_or(30);
        let env = std::env::var("APP_ENV").unwrap_or_else(|_| "development".to_string());

        Ok(Self {
            redis_url,
            bind_addr,
            jwt_secret,
            heartbeat_interval: Duration::from_secs(heartbeat_interval),
            idle_timeout: Duration::from_secs(idle_timeout),
            env,
        })
    }
}
