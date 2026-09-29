use std::collections::HashSet;
use std::time::Duration;

use anyhow::Result;
use tokio::sync::mpsc;
use tokio::time::sleep;

use crate::domain::messages::ServerMsg;
use crate::rooms::manager::RoomManager;
use crate::rooms::sub_cmd::SubCmd;

use super::client::RedisClient;

pub struct RedisSubscriber {
    client: RedisClient,
    sub_rx: mpsc::UnboundedReceiver<SubCmd>,
    room_manager: RoomManager,
}

impl RedisSubscriber {
    pub fn new(client: RedisClient, sub_rx: mpsc::UnboundedReceiver<SubCmd>, room_manager: RoomManager) -> Self {
        Self {
            client,
            sub_rx,
            room_manager,
        }
    }

    pub async fn run(mut self) -> Result<()> {
        let mut active_channels: HashSet<String> = HashSet::new();
        let mut backoff = Duration::from_millis(250);

        loop {
            let mut pubsub = match self.client.get_pubsub().await {
                Ok(value) => value,
                Err(err) => {
                    tracing::warn!(error = %err, "redis pubsub reconnecting");
                    sleep(backoff).await;
                    backoff = backoff.saturating_mul(2).min(Duration::from_secs(5));
                    continue;
                }
            };

            while let Some(cmd) = self.sub_rx.recv().await {
                match cmd {
                    SubCmd::Subscribe(channel) => {
                        if active_channels.insert(channel.clone()) {
                            pubsub.subscribe(channel).await?;
                        }
                    }
                    SubCmd::Unsubscribe(channel) => {
                        if active_channels.remove(&channel) {
                            pubsub.unsubscribe(channel).await?;
                        }
                    }
                }
            }

            let _ = pubsub;
            break;
        }

        Ok(())
    }

    pub async fn handle_redis_message(&self, payload: &str) {
        if let Ok(msg) = serde_json::from_str::<ServerMsg>(payload) {
            if let Some(trip_id) = msg.trip_id() {
                self.room_manager.fanout(&crate::domain::ids::RoomId::new(format!("trip:{trip_id}")), msg);
            }
        }
    }
}
