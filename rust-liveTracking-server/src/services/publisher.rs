use redis::AsyncCommands;

use crate::errors::AppError;
use crate::models::{LocationUpdate, ServerEvent};
use crate::state::AppState;

pub async fn publish_location(state: &AppState, update: &LocationUpdate) -> Result<i64, AppError> {
    let channel = state.settings.redis.trip_channel(&update.trip_id);
    let payload = ServerEvent::VehicleLocation(update).to_json();

    let mut conn = state.publisher.clone();
    let receivers: i64 = conn.publish(channel, payload).await?;

    Ok(receivers)
}
