pub mod redis_config;
pub mod socket_config;

use std::env;

pub use redis_config::RedisConfig;
pub use socket_config::SocketConfig;

#[derive(Clone, Debug)]
pub struct Settings {
    pub host: String,
    pub port: u16,
    pub redis: RedisConfig,
    pub socket: SocketConfig,
}

impl Settings {
    pub fn from_env() -> Self {
        Self {
            host: env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: env::var("PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(8080),
            redis: RedisConfig::from_env(),
            socket: SocketConfig::from_env(),
        }
    }
}
