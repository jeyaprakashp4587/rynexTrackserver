use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocationUpdate {
    pub lat: f64,
    pub lon: f64,
    pub trip_id: String,
    pub time: String,
    pub driver_id: String,
}

impl LocationUpdate {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.trip_id.trim().is_empty() {
            return Err(AppError::BadRequest("tripId is required".into()));
        }
        if self.driver_id.trim().is_empty() {
            return Err(AppError::BadRequest("driverId is required".into()));
        }
        if !(-90.0..=90.0).contains(&self.lat) {
            return Err(AppError::BadRequest("lat must be between -90 and 90".into()));
        }
        if !(-180.0..=180.0).contains(&self.lon) {
            return Err(AppError::BadRequest("lon must be between -180 and 180".into()));
        }
        Ok(())
    }
}
