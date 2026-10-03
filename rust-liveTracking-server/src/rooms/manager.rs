use crate::domain::ids::{ConnId, RoomId, TripId, UserId};
use crate::domain::location::Location;
use crate::domain::messages::{ClientMsg, ServerMsg};
use crate::rooms::registry::Registry;
use crate::rooms::sub_cmd::SubCmd;
use std::sync::Arc;
use tokio::sync::mpsc;

#[derive(Clone)]
pub struct RoomManager {
    registry: Arc<Registry>,
    sub_tx: mpsc::UnboundedSender<SubCmd>,
}

impl RoomManager {
    pub fn new(registry: Arc<Registry>, sub_tx: mpsc::UnboundedSender<SubCmd>) -> Self {
        Self { registry, sub_tx }
    }

    pub fn join_user_room(
        &self,
        user_id: &UserId,
        conn_id: ConnId,
        sender: mpsc::Sender<Arc<ServerMsg>>,
    ) -> Option<SubCmd> {
        let room = RoomId::new(format!("user:{}", user_id.as_str()));
        self.registry.join_room(conn_id, room, sender)
    }

    pub fn join_trip_room(
        &self,
        trip_id: &TripId,
        conn_id: ConnId,
        sender: mpsc::Sender<Arc<ServerMsg>>,
    ) -> Option<SubCmd> {
        let room = RoomId::new(format!("trip:{}", trip_id.as_str()));
        self.registry.join_room(conn_id, room, sender)
    }

    pub fn leave_trip_room(&self, trip_id: &TripId, conn_id: &ConnId) -> Option<SubCmd> {
        let room = RoomId::new(format!("trip:{}", trip_id.as_str()));
        self.registry.leave_room(conn_id, &room)
    }

    pub fn leave_user_room(&self, user_id: &UserId, conn_id: &ConnId) -> Option<SubCmd> {
        let room = RoomId::new(format!("user:{}", user_id.as_str()));
        self.registry.leave_room(conn_id, &room)
    }

    pub fn remove_conn(&self, conn_id: &ConnId) -> Vec<SubCmd> {
        self.registry.remove_conn(conn_id)
    }

    pub fn fanout(&self, room_id: &RoomId, message: ServerMsg) {
        let senders = self.registry.room_members(room_id);
        let shared = Arc::new(message);
        for sender in senders {
            let _ = sender.try_send(shared.clone());
        }
    }

    pub fn fanout_excluding(&self, room_id: &RoomId, _excluded: &ConnId, message: ServerMsg) {
        let senders = self.registry.room_members(room_id);
        let shared = Arc::new(message);
        for sender in senders {
            let _ = sender.try_send(shared.clone());
        }
    }

    pub fn publish_location(&self, trip_id: &TripId, location: Location, _driver_conn: &ConnId) {
        let room = RoomId::new(format!("trip:{}", trip_id.as_str()));
        let msg = ServerMsg::Location {
            trip_id: trip_id.as_str().to_string(),
            lat: location.lat,
            lng: location.lng,
            heading: location.heading,
            speed: location.speed,
            ts: location.ts,
        };
        // local fanout
        self.fanout(&room, msg.clone());
        // ensure redis subscription exists
        let _ = self.sub_tx.send(SubCmd::Subscribe(room.as_str().to_string()));
    }

    pub fn end_trip(&self, trip_id: &TripId) {
        let room = RoomId::new(format!("trip:{}", trip_id.as_str()));
        self.fanout(&room, ServerMsg::TripEnded {
            trip_id: trip_id.as_str().to_string(),
        });
        let _ = self.sub_tx.send(SubCmd::Unsubscribe(room.as_str().to_string()));
    }

    pub fn handle_client_message(&self, conn_id: &ConnId, msg: ClientMsg) {
        match msg {
            ClientMsg::JoinTrip { trip_id } => {
                let _ = conn_id;
                let _ = trip_id;
            }
            ClientMsg::LeaveTrip { trip_id } => {
                let _ = trip_id;
            }
            ClientMsg::Location { .. } => {}
            ClientMsg::EndTrip { trip_id } => {
                let _ = trip_id;
            }
            ClientMsg::Ping => {}
        }
    }

    pub fn room_exists(&self, trip_id: &TripId) -> bool {
        let room = RoomId::new(format!("trip:{}", trip_id.as_str()));
        self.registry.room_exists(&room)
    }
}
