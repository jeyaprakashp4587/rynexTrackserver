use serde::{Deserialize, Serialize};

use super::location::{LocationUpdate, VehicleLocationUpdate};

#[derive(Debug, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum ServerEvent<'a> {
    Connected {
        #[serde(rename = "userId")]
        user_id: &'a str,
    },
    TripJoined {
        #[serde(rename = "tripId")]
        trip_id: &'a str,
    },
    TripLeft {
        #[serde(rename = "tripId")]
        trip_id: &'a str,
    },
    VehicleJoined {
        #[serde(rename = "vehicleId")]
        vehicle_id: &'a str,
    },
    VehicleLeft {
        #[serde(rename = "vehicleId")]
        vehicle_id: &'a str,
    },
    VehicleLocation(&'a VehicleLocationUpdate),
    Error {
        message: &'a str,
    },
}

impl ServerEvent<'_> {
    pub fn to_json(&self) -> String {
        serde_json::to_string(self).unwrap_or_else(|_| "{}".into())
    }
}

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ClientMessage {
    JoinTrip {
        #[serde(rename = "tripId")]
        trip_id: String,
    },
    LeaveTrip {
        #[serde(rename = "tripId")]
        trip_id: String,
    },
    JoinVehicle {
        #[serde(rename = "vehicleId")]
        vehicle_id: String,
    },
    LeaveVehicle {
        #[serde(rename = "vehicleId")]
        vehicle_id: String,
    },
    VehicleLocation {
        #[serde(rename = "vehicleId")]
        vehicle_id: String,
        lat: f64,
        lon: f64,
        time: String,
    },
}
