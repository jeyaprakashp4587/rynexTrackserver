use std::sync::Arc;

use anyhow::Result;
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::config::Config;
use crate::infra::redis::{client::RedisClient, subscriber::RedisSubscriber};
use crate::rooms::manager::RoomManager;
use crate::rooms::registry::Registry;
use crate::rooms::sub_cmd::SubCmd;
use crate::services::trip_authorizer::{RedisTripAuthorizer, TripAuthorizer};

#[derive(Clone)]
pub struct AppState {
    pub config: Arc<Config>,
    pub registry: Arc<Registry>,
    pub room_manager: Arc<RoomManager>,
    pub redis: Arc<RedisClient>,
    pub authorizer: Arc<dyn TripAuthorizer>,
    pub shutdown: CancellationToken,
    pub sub_tx: mpsc::UnboundedSender<SubCmd>,
}

impl AppState {
    pub async fn new(config: Config, shutdown: CancellationToken) -> Result<Self> {
        let config = Arc::new(config);
        let redis = Arc::new(RedisClient::new(&config.redis_url).await?);
        let registry = Arc::new(Registry::new());
        let (sub_tx, sub_rx) = mpsc::unbounded_channel();
        let room_manager = Arc::new(RoomManager::new(registry.clone(), sub_tx.clone()));
        let authorizer: Arc<dyn TripAuthorizer> = Arc::new(RedisTripAuthorizer::new((*redis).clone()));
        let subscriber = RedisSubscriber::new((*redis).clone(), sub_rx, room_manager.as_ref().clone());
        tokio::spawn(async move {
            let _ = subscriber.run().await;
        });

        Ok(Self {
            config,
            registry,
            room_manager,
            redis,
            authorizer,
            shutdown,
            sub_tx,
        })
    }
}
