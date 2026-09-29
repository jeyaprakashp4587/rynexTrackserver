use anyhow::Result;

use super::client::RedisClient;

#[derive(Clone)]
pub struct LocationCache {
    client: RedisClient,
}

impl LocationCache {
    pub fn new(client: RedisClient) -> Self {
        Self { client }
    }

    pub async fn get_last_location(&self, trip_id: &str) -> Result<Option<String>> {
        self.client.get_last_location(trip_id).await
    }

    pub async fn set_last_location(&self, trip_id: &str, payload: &str, ttl_secs: u64) -> Result<()> {
        self.client.set_last_location(trip_id, payload, ttl_secs).await
    }
}
