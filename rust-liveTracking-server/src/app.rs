use crate::config::env::Env;
use crate::state::app_state::AppState;
use axum::{extract::ws::{Message, WebSocket, WebSocketUpgrade}, response::IntoResponse, routing::get, Router, Extension, Json};
use futures::{sink::SinkExt, stream::StreamExt};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::mpsc::unbounded_channel;
use uuid::Uuid;
use crate::services::rate_limit::RateLimitService;
use crate::services::location_service;
use chrono::Utc;

pub async fn build(state: Arc<AppState>) -> Router {
	let shared = state;

	Router::new()
		.route("/health", get(|| async { Json(serde_json::json!({"status":"ok","service":"rust-realtime"})) }))
		.route("/ws", get(ws_handler))
		.layer(Extension(shared))
}

async fn ws_handler(ws: WebSocketUpgrade, Extension(state): Extension<Arc<AppState>>) -> impl IntoResponse {
	ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: Arc<AppState>) {
	// extract token from first message or from query not implemented here; expect client to send auth JSON first
	// create a client id and register outgoing sender
	let client_id = Uuid::new_v4().to_string();
	let (tx, mut rx) = unbounded_channel::<String>();

	// register client sender
	state.register_client(client_id.clone(), tx).await;

	// writer task: forward messages from rx to websocket
	let mut wsocket = socket.split();
	let mut sender = wsocket.0;
	let mut receiver = wsocket.1;

	let write_task = tokio::spawn(async move {
		while let Some(msg) = rx.recv().await {
			if sender.send(Message::Text(msg)).await.is_err() {
				break;
			}
		}
	});

	// read loop
	while let Some(Ok(msg)) = receiver.next().await {
		match msg {
			Message::Text(txt) => {
				if let Ok(v) = serde_json::from_str::<Value>(&txt) {
					// expect envelope { type: "...", data: {...} }
					let ev_type = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
					let data = v.get("data").cloned().unwrap_or(Value::Null);

					// basic handlers: trip.join, trip.leave, location.update
					if ev_type == "trip.join" {
						if let Some(trip_id) = data.get("tripId").and_then(|t| t.as_str()) {
							let room = format!("trip:{}", trip_id);
							state.join_room(&room, &client_id).await;
							// publish to Redis channel for trip events
							let _ = crate::infrastructure::redis_pubsub::publish(
								&std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".into()),
								"events:trip",
								&serde_json::to_string(&v).unwrap(),
							).await;
						}
					} else if ev_type == "trip.leave" {
						if let Some(trip_id) = data.get("tripId").and_then(|t| t.as_str()) {
							let room = format!("trip:{}", trip_id);
							state.leave_room(&room, &client_id).await;
						}
					} else if ev_type == "location.update" || ev_type == "location:update" {
						// expect driverId, tripId, latitude, longitude, timestamp
						if let (Some(trip_id), Some(driver_id), Some(lat), Some(lon)) = (
							data.get("tripId").and_then(|t| t.as_str()),
							data.get("driverId").and_then(|t| t.as_str()),
							data.get("latitude").and_then(|t| t.as_f64()),
							data.get("longitude").and_then(|t| t.as_f64()),
						) {
							let timestamp = data.get("timestamp").and_then(|t| t.as_str()).map(|s| s.to_string()).unwrap_or_else(|| Utc::now().to_rfc3339());
							// rate limit
							let rl = RateLimitService::new(800);
							if !rl.allow_location_update(state.clone(), driver_id).await {
								// optional: send rate_limited response
								continue;
							}
							// update location via service
							let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".into());
							let _ = location_service::update_driver_location(
								state.clone(),
								&redis_url,
								driver_id,
								trip_id,
								lat,
								lon,
								&timestamp,
							).await;
						}
					}
				}
			}
			Message::Close(_) => break,
			_ => {}
		}
	}

	// cleanup
	state.unregister_client(&client_id).await;
	let _ = write_task.await;
}

