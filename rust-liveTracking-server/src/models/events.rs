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
    VehicleLocation(&'a LocationUpdate),
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
}
