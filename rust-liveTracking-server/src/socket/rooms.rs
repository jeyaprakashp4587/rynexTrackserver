use std::collections::{HashMap, HashSet};

use dashmap::DashMap;
use tokio::sync::mpsc::UnboundedSender;
use uuid::Uuid;

pub type SessionSender = UnboundedSender<String>;

#[derive(Default)]
pub struct RoomManager {
    user_rooms: DashMap<String, HashMap<Uuid, SessionSender>>,
    trip_rooms: DashMap<String, HashSet<String>>,
}

impl RoomManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn join_user(&self, user_id: &str, session_id: Uuid, tx: SessionSender) {
        self.user_rooms
            .entry(user_id.to_string())
            .or_default()
            .insert(session_id, tx);
    }

    pub fn leave_user(&self, user_id: &str, session_id: Uuid) {
        let empty = match self.user_rooms.get_mut(user_id) {
            Some(mut sessions) => {
                sessions.remove(&session_id);
                sessions.is_empty()
            }
            None => return,
        };

        if empty
            && self
                .user_rooms
                .remove_if(user_id, |_, sessions| sessions.is_empty())
                .is_some()
        {
            self.trip_rooms.retain(|_, members| {
                members.remove(user_id);
                !members.is_empty()
            });
        }
    }

    pub fn is_user_connected(&self, user_id: &str) -> bool {
        self.user_rooms.contains_key(user_id)
    }

    pub fn join_trip(&self, trip_id: &str, user_id: &str) -> bool {
        if !self.is_user_connected(user_id) {
            return false;
        }
        self.trip_rooms
            .entry(trip_id.to_string())
            .or_default()
            .insert(user_id.to_string());
        true
    }

    pub fn leave_trip(&self, trip_id: &str, user_id: &str) {
        if let Some(mut members) = self.trip_rooms.get_mut(trip_id) {
            members.remove(user_id);
        }
        self.trip_rooms.remove_if(trip_id, |_, members| members.is_empty());
    }

    pub fn send_to_user(&self, user_id: &str, payload: &str) {
        if let Some(sessions) = self.user_rooms.get(user_id) {
            for tx in sessions.values() {
                let _ = tx.send(payload.to_string());
            }
        }
    }

    pub fn broadcast_trip(&self, trip_id: &str, payload: &str) {
        let members: Vec<String> = match self.trip_rooms.get(trip_id) {
            Some(members) => members.iter().cloned().collect(),
            None => return,
        };

        for user_id in members {
            self.send_to_user(&user_id, payload);
        }
    }
}
