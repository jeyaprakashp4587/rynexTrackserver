use serde::{Deserialize, Serialize};

use super::location::LocationUpdate;

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
    TripLocation(&'a LocationUpdate),
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
    #[serde(rename = "vehicleLocation", alias = "VehicleLocation")]
    VehicleLocation {
        #[serde(rename = "vehicleId")]
        vehicle_id: String,
        #[serde(default)]
        #[serde(rename = "driverId")]
        driver_id: Option<String>,
        #[serde(default)]
        #[serde(rename = "tripId")]
        trip_id: Option<String>,
        #[serde(default)]
        location: Option<super::location::LocationPoint>,
        #[serde(default)]
        lat: Option<f64>,
        #[serde(default)]
        lon: Option<f64>,
        #[serde(default, alias = "dateTime", alias = "datetime")]
        time: Option<String>,
    },
}
