use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TripRoomRequest {
    pub user_id: String,
    pub trip_id: String,
}
