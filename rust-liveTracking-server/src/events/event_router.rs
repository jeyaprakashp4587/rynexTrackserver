use crate::state::app_state::AppState;
use serde_json::Value;

pub fn trip_room(trip_id: &str) -> String {
    format!("trip:{}", trip_id)
}

pub fn user_room(user_id: &str) -> String {
    format!("user:{}", user_id)
}

pub async fn route_event(state: &AppState, envelope: &str) {
    if let Ok(v) = serde_json::from_str::<Value>(envelope) {
        if let Some(t) = v.get("type").and_then(|s| s.as_str()) {
            if t.starts_with("trip.") {
                let trip_id = v.get("data").and_then(|d| d.get("tripId")).and_then(|s| s.as_str());
                let driver_id = v.get("data").and_then(|d| d.get("driverId")).and_then(|s| s.as_str());
                if let Some(trip) = trip_id {
                    let room = trip_room(trip);
                    state.send_to_room(&room, envelope).await;
                }
                if let Some(driver) = driver_id {
                    let room = user_room(driver);
                    state.send_to_room(&room, envelope).await;
                }
                return;
            }

            if t.starts_with("driver.") {
                if let Some(driver_id) = v.get("data").and_then(|d| d.get("driverId")).and_then(|s| s.as_str()) {
                    let room = user_room(driver_id);
                    state.send_to_room(&room, envelope).await;
                    return;
                }
            }
        }
        // default broadcast to all clients by sending to a special room "broadcast"
        state.send_to_room("broadcast", envelope).await;
    }
}
