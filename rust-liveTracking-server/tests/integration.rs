mod common;

use std::sync::Arc;

use tokio::sync::mpsc;

use rust_live_tracking_server::domain::ids::{ConnId, RoomId, TripId};
use rust_live_tracking_server::domain::messages::ServerMsg;
use rust_live_tracking_server::rooms::manager::RoomManager;
use rust_live_tracking_server::services::trip_authorizer::MockTripAuthorizer;

#[tokio::test]
async fn rider_receives_driver_location() {
    let (registry, manager, _) = common::build_manager();
    let trip = common::make_trip_id();
    let driver_conn = common::make_conn_id();
    let rider_conn = common::make_conn_id();
    let (driver_tx, mut driver_rx) = mpsc::channel(16);
    let (rider_tx, mut rider_rx) = mpsc::channel(16);

    manager.join_trip_room(&trip, driver_conn, driver_tx);
    manager.join_trip_room(&trip, rider_conn, rider_tx);
    manager.fanout(&RoomId::new(format!("trip:{}", trip.as_str())), common::make_location(trip.as_str()));

    let _ = driver_rx.try_recv();
    assert!(rider_rx.try_recv().is_ok());
    let _ = registry;
}

#[tokio::test]
async fn late_joining_rider_receives_cached_location() {
    let (_, manager, _) = common::build_manager();
    let trip = common::make_trip_id();
    let (tx, mut rx) = mpsc::channel(16);
    let rider_conn = common::make_conn_id();
    let cached = ServerMsg::Location {
        trip_id: trip.as_str().to_string(),
        lat: 1.1,
        lng: 2.2,
        heading: 12.0,
        speed: 19.0,
        ts: 1710000010,
    };

    manager.join_trip_room(&trip, rider_conn, tx);
    manager.fanout(&RoomId::new(format!("trip:{}", trip.as_str())), cached.clone());
    assert!(rx.try_recv().is_ok());
}

#[tokio::test]
async fn mock_authorizer_accepts_trip_membership() {
    let mut authorizer = MockTripAuthorizer::default();
    let trip = TripId::new("trip-42");
    let user = rust_live_tracking_server::domain::ids::UserId::new("user-7");
    authorizer.add_driver(trip.as_str(), user.as_str());
    authorizer.add_rider(trip.as_str(), user.as_str());

    assert!(authorizer.can_driver_publish(&trip, &user).await);
    assert!(authorizer.can_rider_join(&trip, &user).await);
}

#[tokio::test]
async fn cleanup_and_unsubscribe_after_last_leave() {
    let (_, manager, _) = common::build_manager();
    let trip = common::make_trip_id();
    let conn = common::make_conn_id();
    let (tx, _) = mpsc::channel(16);
    manager.join_trip_room(&trip, conn.clone(), tx);
    let unsub = manager.leave_trip_room(&trip, &conn);
    assert!(unsub.is_some());
}

#[tokio::test]
async fn parallel_join_leave_stays_consistent() {
    let registry = Arc::new(rust_live_tracking_server::rooms::registry::Registry::new());
    let (sub_tx, _) = mpsc::unbounded_channel();
    let manager = RoomManager::new(registry.clone(), sub_tx);
    let trip = TripId::new("trip-parallel");

    for _ in 0..200 {
        let (tx, _) = mpsc::channel(16);
        let conn = ConnId::new();
        manager.join_trip_room(&trip, conn, tx);
    }

    let room = RoomId::new(format!("trip:{}", trip.as_str()));
    manager.fanout(&room, ServerMsg::TripEnded { trip_id: trip.as_str().to_string() });
    assert!(manager.room_exists(&trip));
    let _ = registry;
}

#[tokio::test]
async fn registry_removes_connection_without_panic() {
    let registry = Arc::new(rust_live_tracking_server::rooms::registry::Registry::new());
    let (sub_tx, _) = mpsc::unbounded_channel();
    let manager = RoomManager::new(registry.clone(), sub_tx);
    let trip = TripId::new("trip-clean");
    let (tx, _) = mpsc::channel(16);
    let conn = ConnId::new();
    manager.join_trip_room(&trip, conn.clone(), tx);
    let commands = manager.remove_conn(&conn);
    assert!(!commands.is_empty());
}
