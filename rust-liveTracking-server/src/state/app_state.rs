use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{mpsc::UnboundedSender, Mutex, broadcast};

#[derive(Clone)]
pub struct AppState {
	/// map client_id -> sender to that websocket connection
	pub clients: Arc<Mutex<HashMap<String, UnboundedSender<String>>>>,
	/// map room -> set of client ids
	pub rooms: Arc<Mutex<HashMap<String, HashSet<String>>>>,
	/// simple in-memory rate limiting: driver_id -> last_ts_millis
	pub last_location_ts: Arc<Mutex<HashMap<String, u128>>>,
	pub pubsub_tx: broadcast::Sender<String>,
}

impl AppState {
	pub fn new() -> Self {
		let (tx, _rx) = broadcast::channel(1024);
		AppState {
			clients: Arc::new(Mutex::new(HashMap::new())),
			rooms: Arc::new(Mutex::new(HashMap::new())),
			last_location_ts: Arc::new(Mutex::new(HashMap::new())),
			pubsub_tx: tx,
		}
	}

	pub async fn register_client(&self, client_id: String, tx: UnboundedSender<String>) {
		self.clients.lock().await.insert(client_id, tx);
	}

	pub async fn unregister_client(&self, client_id: &str) {
		self.clients.lock().await.remove(client_id);
		// remove from all rooms
		let mut rooms = self.rooms.lock().await;
		for (_room, set) in rooms.iter_mut() {
			set.remove(client_id);
		}
	}

	pub async fn join_room(&self, room: &str, client_id: &str) {
		let mut rooms = self.rooms.lock().await;
		let entry = rooms.entry(room.to_string()).or_insert_with(HashSet::new);
		entry.insert(client_id.to_string());
	}

	pub async fn leave_room(&self, room: &str, client_id: &str) {
		let mut rooms = self.rooms.lock().await;
		if let Some(set) = rooms.get_mut(room) {
			set.remove(client_id);
		}
	}

	pub async fn send_to_room(&self, room: &str, message: &str) {
		let rooms = self.rooms.lock().await;
		if let Some(set) = rooms.get(room) {
			let clients = self.clients.lock().await;
			for client_id in set.iter() {
				if let Some(tx) = clients.get(client_id) {
					let _ = tx.send(message.to_string());
				}
			}
		}
	}
}
