use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMsg {
    JoinTrip { trip_id: String },
    LeaveTrip { trip_id: String },
    Location {
        trip_id: String,
        lat: f64,
        lng: f64,
        heading: f64,
        speed: f64,
        ts: i64,
    },
    EndTrip { trip_id: String },
    Ping,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMsg {
    Joined { trip_id: String },
    Left { trip_id: String },
    Location {
        trip_id: String,
        lat: f64,
        lng: f64,
        heading: f64,
        speed: f64,
        ts: i64,
    },
    TripEnded { trip_id: String },
    Error { code: String, message: String },
    Pong,
}

impl ServerMsg {
    pub fn trip_id(&self) -> Option<&str> {
        match self {
            Self::Joined { trip_id }
            | Self::Left { trip_id }
            | Self::Location { trip_id, .. }
            | Self::TripEnded { trip_id } => Some(trip_id),
            Self::Error { .. } | Self::Pong => None,
        }
    }
}
