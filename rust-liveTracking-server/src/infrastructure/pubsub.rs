// Legacy in-process pubsub kept for compatibility tests. Prefer Redis-backed `redis_pubsub`.
use crate::events::event_router;
use crate::state::app_state::AppState;
use tokio::sync::broadcast;

pub async fn publish(state: &AppState, _channel: &str, message: &str) {
    let _ = state.pubsub_tx.send(message.to_string());
}

pub async fn start_subscriber(state: AppState) {
    let mut rx = state.pubsub_tx.subscribe();
    let s = state.clone();
    tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            event_router::route_event(&s, &msg).await;
        }
    });
}
