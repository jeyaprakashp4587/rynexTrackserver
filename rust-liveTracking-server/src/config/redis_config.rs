use std::env;

use redis::{aio::ConnectionManager, Client, RedisResult};

#[derive(Clone, Debug)]
pub struct RedisConfig {
    pub url: String,
    pub trip_channel_prefix: String,
    pub vehicle_channel_prefix: String,
    pub vehicle_key_prefix: String,
}

impl RedisConfig {
    pub fn from_env() -> Self {
        Self {
            url: env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1:6379".into()),
            trip_channel_prefix: env::var("TRIP_CHANNEL_PREFIX").unwrap_or_else(|_| "trip:".into()),
            vehicle_channel_prefix: env::var("VEHICLE_CHANNEL_PREFIX").unwrap_or_else(|_| "vehicle:".into()),
            vehicle_key_prefix: env::var("VEHICLE_KEY_PREFIX").unwrap_or_else(|_| "vehicle:".into()),
        }
    }

    pub fn client(&self) -> RedisResult<Client> {
        Client::open(self.url.as_str())
    }

    pub async fn manager(&self, client: &Client) -> RedisResult<ConnectionManager> {
        ConnectionManager::new(client.clone()).await
    }

    pub fn trip_channel(&self, trip_id: &str) -> String {
        format!("{}{}", self.trip_channel_prefix, trip_id)
    }

    pub fn trip_pattern(&self) -> String {
        format!("{}*", self.trip_channel_prefix)
    }

    pub fn vehicle_channel(&self, vehicle_id: &str) -> String {
        format!("{}{}", self.vehicle_channel_prefix, vehicle_id)
    }

    pub fn vehicle_pattern(&self) -> String {
        format!("{}*", self.vehicle_channel_prefix)
    }

    pub fn vehicle_key(&self, vehicle_id: &str) -> String {
        format!("{}{}", self.vehicle_key_prefix, vehicle_id)
    }
}
