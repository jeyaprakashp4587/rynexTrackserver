use anyhow::Result;
use tokio::sync::mpsc;

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
        Self { client, sub_rx, room_manager }
    }

    /// Run a simple loop: subscribe/unsubscribe as requested and forward messages to room manager.
    pub async fn run(mut self) -> Result<()> {
        let mut pubsub = self.client.get_pubsub().await?;

        // spawn a task to read redis messages and fanout to rooms
        let reader = {
            let room_manager = self.room_manager.clone();
            tokio::spawn(async move {
                let mut on_message = pubsub.on_message();
                while let Some(msg) = on_message.next().await {
                    if let Ok(payload) = msg.get_payload::<String>() {
                        if let Ok(server_msg) = serde_json::from_str::<ServerMsg>(&payload) {
                            if let Some(trip_id) = server_msg.trip_id() {
                                room_manager.fanout(&crate::domain::ids::RoomId::new(format!("trip:{trip_id}")), server_msg);
                            }
                        }
                    }
                }
            })
        };

        // handle subscribe/unsubscribe commands
        while let Some(cmd) = self.sub_rx.recv().await {
            match cmd {
                SubCmd::Subscribe(channel) => { let _ = pubsub.subscribe(channel).await; }
                SubCmd::Unsubscribe(channel) => { let _ = pubsub.unsubscribe(channel).await; }
            }
        }

        let _ = reader.await;
        Ok(())
    }
}
