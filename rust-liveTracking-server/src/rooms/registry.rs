use crate::domain::{ids::{ConnId, RoomId}, messages::ServerMsg};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;

use super::sub_cmd::SubCmd;

#[derive(Clone)]
pub struct ConnHandle {
    pub sender: mpsc::Sender<Arc<ServerMsg>>,
}

#[derive(Default)]
pub struct RegistryState {
    pub rooms: HashMap<RoomId, HashMap<ConnId, ConnHandle>>,
    pub conn_rooms: HashMap<ConnId, HashSet<RoomId>>,
}

#[derive(Clone, Default)]
pub struct Registry {
    inner: Arc<Mutex<RegistryState>>,
}

impl Registry {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn join_room(
        &self,
        conn_id: ConnId,
        room_id: RoomId,
        sender: mpsc::Sender<Arc<ServerMsg>>,
    ) -> Option<SubCmd> {
        let mut state = self.inner.lock().expect("registry lock poisoned");
        let room_len = {
            let room = state.rooms.entry(room_id.clone()).or_default();
            room.insert(conn_id.clone(), ConnHandle { sender });
            room.len()
        };
        state.conn_rooms.entry(conn_id.clone()).or_default().insert(room_id.clone());

        if room_len == 1 {
            Some(SubCmd::Subscribe(room_id.as_str().to_string()))
        } else {
            None
        }
    }

    pub fn leave_room(&self, conn_id: &ConnId, room_id: &RoomId) -> Option<SubCmd> {
        let mut state = self.inner.lock().expect("registry lock poisoned");
        let mut sub = None;

        if let Some(room) = state.rooms.get_mut(room_id) {
            room.remove(conn_id);
            if room.is_empty() {
                state.rooms.remove(room_id);
                sub = Some(SubCmd::Unsubscribe(room_id.as_str().to_string()));
            }
        }

        if let Some(set) = state.conn_rooms.get_mut(conn_id) {
            set.remove(room_id);
            if set.is_empty() {
                state.conn_rooms.remove(conn_id);
            }
        }

        sub
    }

    pub fn remove_conn(&self, conn_id: &ConnId) -> Vec<SubCmd> {
        let mut state = self.inner.lock().expect("registry lock poisoned");
        let room_ids = state.conn_rooms.remove(conn_id).unwrap_or_default();
        let mut cmd_list = Vec::new();

        for room_id in room_ids {
            if let Some(room) = state.rooms.get_mut(&room_id) {
                room.remove(conn_id);
                if room.is_empty() {
                    state.rooms.remove(&room_id);
                    cmd_list.push(SubCmd::Unsubscribe(room_id.as_str().to_string()));
                }
            }
        }

        cmd_list
    }

    pub fn room_members(&self, room_id: &RoomId) -> Vec<mpsc::Sender<Arc<ServerMsg>>> {
        let state = self.inner.lock().expect("registry lock poisoned");
        state
            .rooms
            .get(room_id)
            .map(|room| room.values().map(|handle| handle.sender.clone()).collect())
            .unwrap_or_default()
    }

    pub fn room_exists(&self, room_id: &RoomId) -> bool {
        let state = self.inner.lock().expect("registry lock poisoned");
        state.rooms.contains_key(room_id)
    }
}
