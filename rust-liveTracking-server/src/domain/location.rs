use crate::error::{AppError, AppResult};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Location {
    pub lat: f64,
    pub lng: f64,
    pub heading: f64,
    pub speed: f64,
    pub ts: i64,
}

impl Location {
    pub fn validate(&self) -> AppResult<()> {
        if !(-90.0..=90.0).contains(&self.lat) {
            return Err(AppError::Validation(format!("lat out of range: {}", self.lat)));
        }
        if !(-180.0..=180.0).contains(&self.lng) {
            return Err(AppError::Validation(format!("lng out of range: {}", self.lng)));
        }
        if self.ts <= 0 {
            return Err(AppError::Validation("timestamp must be > 0".to_string()));
        }
        Ok(())
    }
}
