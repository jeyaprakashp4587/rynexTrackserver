use redis::Client;
use tokio::sync::Mutex;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub redis: Arc<Client>,
    // placeholder for shared websocket registry or other shared resources
    pub ws_registry: Arc<Mutex<()>>,
}

impl AppState {
    pub fn new(redis_client: Client) -> Self {
        Self {
            redis: Arc::new(redis_client),
            ws_registry: Arc::new(Mutex::new(())),
        }
    }
}
