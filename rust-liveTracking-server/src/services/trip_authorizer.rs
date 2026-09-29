use std::collections::HashSet;

use async_trait::async_trait;

use crate::domain::ids::{TripId, UserId};
use crate::infra::redis::client::RedisClient;

#[async_trait]
pub trait TripAuthorizer: Send + Sync {
    async fn can_driver_publish(&self, trip_id: &TripId, user_id: &UserId) -> bool;
    async fn can_rider_join(&self, trip_id: &TripId, user_id: &UserId) -> bool;
}

#[derive(Clone)]
pub struct RedisTripAuthorizer {
    redis: RedisClient,
}

impl RedisTripAuthorizer {
    pub fn new(redis: RedisClient) -> Self {
        Self { redis }
    }
}

#[async_trait]
impl TripAuthorizer for RedisTripAuthorizer {
    async fn can_driver_publish(&self, trip_id: &TripId, user_id: &UserId) -> bool {
        let mut conn = match self.redis.client().get_multiplexed_async_connection().await {
            Ok(conn) => conn,
            Err(_) => return false,
        };
        let value: Option<String> = redis::cmd("GET")
            .arg(format!("trip:{}:driver", trip_id.as_str()))
            .query_async(&mut conn)
            .await
            .ok();
        value.as_deref() == Some(user_id.as_str())
    }

    async fn can_rider_join(&self, trip_id: &TripId, user_id: &UserId) -> bool {
        let mut conn = match self.redis.client().get_multiplexed_async_connection().await {
            Ok(conn) => conn,
            Err(_) => return false,
        };
        let member: bool = redis::cmd("SISMEMBER")
            .arg(format!("trip:{}:riders", trip_id.as_str()))
            .arg(user_id.as_str())
            .query_async(&mut conn)
            .await
            .unwrap_or(false);
        member
    }
}

#[derive(Clone, Default)]
pub struct MockTripAuthorizer {
    drivers: HashSet<(String, String)>,
    riders: HashSet<(String, String)>,
}

impl MockTripAuthorizer {
    pub fn add_driver(&mut self, trip_id: &str, user_id: &str) {
        self.drivers.insert((trip_id.to_string(), user_id.to_string()));
    }

    pub fn add_rider(&mut self, trip_id: &str, user_id: &str) {
        self.riders.insert((trip_id.to_string(), user_id.to_string()));
    }
}

#[async_trait]
impl TripAuthorizer for MockTripAuthorizer {
    async fn can_driver_publish(&self, trip_id: &TripId, user_id: &UserId) -> bool {
        self.drivers.contains(&(trip_id.as_str().to_string(), user_id.as_str().to_string()))
    }

    async fn can_rider_join(&self, trip_id: &TripId, user_id: &UserId) -> bool {
        self.riders.contains(&(trip_id.as_str().to_string(), user_id.as_str().to_string()))
    }
}
