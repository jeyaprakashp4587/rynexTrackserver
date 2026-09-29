use std::sync::Arc;

use tokio::sync::mpsc;

use rust_live_tracking_server::domain::ids::{ConnId, TripId};
use rust_live_tracking_server::domain::messages::ServerMsg;
use rust_live_tracking_server::rooms::manager::RoomManager;
use rust_live_tracking_server::rooms::registry::Registry;

pub fn build_manager() -> (Arc<Registry>, RoomManager, mpsc::UnboundedReceiver<rust_live_tracking_server::rooms::sub_cmd::SubCmd>) {
    let registry = Arc::new(Registry::new());
    let (sub_tx, sub_rx) = mpsc::unbounded_channel();
    let manager = RoomManager::new(registry.clone(), sub_tx);
    (registry, manager, sub_rx)
}

pub fn make_location(trip_id: &str) -> ServerMsg {
    ServerMsg::Location {
        trip_id: trip_id.to_string(),
        lat: 12.5,
        lng: 34.6,
        heading: 90.0,
        speed: 30.0,
        ts: 1710000000,
    }
}

pub fn make_trip_id() -> TripId {
    TripId::new("trip-123")
}

pub fn make_conn_id() -> ConnId {
    ConnId::new()
}
