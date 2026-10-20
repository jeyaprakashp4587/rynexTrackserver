use serde::{Deserialize, Serialize};

use crate::errors::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LocationPoint {
    pub lat: f64,
    pub lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct LocationUpdate {
    #[serde(default)]
    pub trip_id: Option<String>,
    #[serde(default)]
    pub vehicle_id: Option<String>,
    #[serde(default)]
    pub driver_id: Option<String>,
    #[serde(default)]
    pub location: Option<LocationPoint>,
    #[serde(default)]
    pub lat: Option<f64>,
    #[serde(default)]
    pub lon: Option<f64>,
    #[serde(default, alias = "dateTime", alias = "datetime")]
    pub time: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleLocationUpdate {
    pub vehicle_id: String,
    pub driver_id: String,
    pub lat: f64,
    pub lon: f64,
    pub time: String,
}

impl LocationUpdate {
    pub fn has_trip(&self) -> bool {
        self.trip_id.as_ref().is_some_and(|value| !value.trim().is_empty())
    }

    pub fn resolved_lat(&self) -> Option<f64> {
        self.location.as_ref().map(|point| point.lat).or(self.lat)
    }

    pub fn resolved_lon(&self) -> Option<f64> {
        self.location.as_ref().map(|point| point.lon).or(self.lon)
    }

    pub fn resolved_driver_id(&self) -> Option<&str> {
        self.driver_id.as_deref().filter(|value| !value.trim().is_empty())
    }

    pub fn resolved_vehicle_id(&self) -> Option<&str> {
        self.vehicle_id.as_deref().filter(|value| !value.trim().is_empty())
    }

    pub fn resolved_time(&self) -> Option<&str> {
        self.time.as_deref().filter(|value| !value.trim().is_empty())
    }

    pub fn validate(&self) -> Result<(), AppError> {
        let lat = self.resolved_lat().ok_or_else(|| AppError::BadRequest("lat is required".into()))?;
        let lon = self.resolved_lon().ok_or_else(|| AppError::BadRequest("lon is required".into()))?;
        let driver_id = self.resolved_driver_id().ok_or_else(|| AppError::BadRequest("driverId is required".into()))?;

        if !self.has_trip() && self.resolved_vehicle_id().is_none() {
            return Err(AppError::BadRequest("vehicleId is required when tripId is missing".into()));
        }

        if !driver_id.trim().is_empty() && !(-90.0..=90.0).contains(&lat) {
            return Err(AppError::BadRequest("lat must be between -90 and 90".into()));
        }
        if !driver_id.trim().is_empty() && !(-180.0..=180.0).contains(&lon) {
            return Err(AppError::BadRequest("lon must be between -180 and 180".into()));
        }
        Ok(())
    }
}

impl VehicleLocationUpdate {
    pub fn validate(&self) -> Result<(), AppError> {
        if self.vehicle_id.trim().is_empty() {
            return Err(AppError::BadRequest("vehicleId is required".into()));
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
