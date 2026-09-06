use crate::state::app_state::AppState;
use std::sync::Arc;

pub struct RateLimitService {
    pub min_interval_ms: u128,
}

impl RateLimitService {
    pub fn new(min_interval_ms: u128) -> Self {
        Self { min_interval_ms }
    }

    pub async fn allow_location_update(&self, state: Arc<AppState>, driver_id: &str) -> bool {
        use std::time::{SystemTime, UNIX_EPOCH};

        let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
        let mut map = state.last_location_ts.lock().await;
        match map.get(driver_id) {
            Some(&last) => {
                if now.saturating_sub(last) < self.min_interval_ms {
                    return false;
                }
            }
            None => {}
        }
        map.insert(driver_id.to_string(), now);
        true
    }
}
