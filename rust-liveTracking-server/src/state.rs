use std::sync::Arc;

use redis::{aio::ConnectionManager, Client, RedisResult};

use crate::config::Settings;
use crate::socket::rooms::RoomManager;

#[derive(Clone)]
pub struct AppState {
    pub settings: Arc<Settings>,
    pub rooms: Arc<RoomManager>,
    pub redis_client: Client,
    pub publisher: ConnectionManager,
}

impl AppState {
    pub async fn build(settings: Settings) -> RedisResult<Self> {
        let redis_client = settings.redis.client()?;
        let publisher = settings.redis.manager(&redis_client).await?;

        Ok(Self {
            settings: Arc::new(settings),
            rooms: Arc::new(RoomManager::new()),
            redis_client,
            publisher,
        })
    }
}
