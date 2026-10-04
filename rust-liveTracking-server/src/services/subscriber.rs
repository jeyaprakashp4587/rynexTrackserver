use std::{sync::Arc, time::Duration};

use futures_util::StreamExt;
use redis::{Client, RedisResult};

use crate::config::RedisConfig;
use crate::socket::rooms::RoomManager;

pub fn spawn(client: Client, rooms: Arc<RoomManager>, config: RedisConfig) {
    tokio::spawn(async move {
        loop {
            if let Err(err) = listen(&client, &rooms, &config).await {
                log::error!("redis subscriber error: {err}");
            }
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    });
}

async fn listen(client: &Client, rooms: &RoomManager, config: &RedisConfig) -> RedisResult<()> {
    let mut pubsub = client.get_async_pubsub().await?;
    pubsub.psubscribe(config.trip_pattern()).await?;
    log::info!("subscribed to {}", config.trip_pattern());

    let mut stream = pubsub.on_message();

    while let Some(msg) = stream.next().await {
        let channel = msg.get_channel_name().to_string();
        let payload: String = match msg.get_payload() {
            Ok(payload) => payload,
            Err(_) => continue,
        };

        if let Some(trip_id) = channel.strip_prefix(config.trip_channel_prefix.as_str()) {
            rooms.broadcast_trip(trip_id, &payload);
        }
    }

    Ok(())
}
