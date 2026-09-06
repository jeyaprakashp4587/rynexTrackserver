use crate::events::event_router;
use crate::state::app_state::AppState;
use anyhow::Result;
use redis::AsyncCommands;
use std::sync::Arc;

pub async fn publish(redis_url: &str, channel: &str, message: &str) -> Result<()> {
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_async_connection().await?;
    let _: () = conn.publish(channel, message).await?;
    Ok(())
}

pub async fn start_subscriber(state: Arc<AppState>, redis_url: &str) -> Result<()> {
    let client = redis::Client::open(redis_url)?;
    let mut conn = client.get_async_connection().await?;
    let mut pubsub = conn.into_pubsub();
    pubsub.subscribe("events:trip").await?;
    pubsub.subscribe("events:driver").await?;
    pubsub.subscribe("events:booking").await?;

    tokio::spawn(async move {
        loop {
            match pubsub.on_message().await {
                Ok(msg) => {
                    if let Ok(payload) = msg.get_payload::<String>() {
                        // route into app state
                        event_router::route_event(&state, &payload).await;
                    }
                }
                Err(err) => {
                    tracing::error!("redis:pubsub:error", ?err);
                    // short sleep to avoid tight loop on error
                    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                }
            }
        }
    });

    Ok(())
}
