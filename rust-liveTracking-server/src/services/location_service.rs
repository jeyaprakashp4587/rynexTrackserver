use crate::state::app_state::AppState;
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;

pub async fn update_driver_location(
    state: Arc<AppState>,
    redis_url: &str,
    driver_id: &str,
    trip_id: &str,
    latitude: f64,
    longitude: f64,
    timestamp: &str,
) -> Result<()> {
    let envelope = json!({
        "type": "trip.location.updated",
        "data": {
            "driverId": driver_id,
            "tripId": trip_id,
            "latitude": latitude,
            "longitude": longitude,
            "timestamp": timestamp
        }
    });

    let payload = serde_json::to_string(&envelope)?;
    // publish to Redis
    crate::infrastructure::redis_pubsub::publish(redis_url, "events:trip", &payload).await?;

    // also route locally so connected clients receive immediately
    state.send_to_room(&format!("trip:{}", trip_id), &payload).await;

    Ok(())
}
