use actix_web::web;
use actix_ws::{CloseReason, Message, MessageStream, Session};
use futures::StreamExt;
use tokio::{sync::mpsc::UnboundedReceiver, time::Instant};
use uuid::Uuid;

use crate::models::{ClientMessage, ServerEvent};
use crate::state::AppState;

pub async fn run(
    state: web::Data<AppState>,
    user_id: String,
    session_id: Uuid,
    mut session: Session,
    mut stream: MessageStream,
    mut rx: UnboundedReceiver<String>,
) {
    let config = state.settings.socket.clone();
    let mut last_heartbeat = Instant::now();
    let mut ticker = tokio::time::interval(config.heartbeat_interval);

    let reason: Option<CloseReason> = loop {
        tokio::select! {
            incoming = stream.next() => match incoming {
                Some(Ok(Message::Ping(bytes))) => {
                    last_heartbeat = Instant::now();
                    if session.pong(&bytes).await.is_err() {
                        break None;
                    }
                }
                Some(Ok(Message::Pong(_))) => {
                    last_heartbeat = Instant::now();
                }
                Some(Ok(Message::Text(text))) => {
                    last_heartbeat = Instant::now();
                    handle_text(&state, &user_id, &text).await;
                }
                Some(Ok(Message::Close(reason))) => break reason,
                Some(Ok(_)) => {}
                Some(Err(_)) | None => break None,
            },
            outgoing = rx.recv() => match outgoing {
                Some(payload) => {
                    if session.text(payload).await.is_err() {
                        break None;
                    }
                }
                None => break None,
            },
            _ = ticker.tick() => {
                if last_heartbeat.elapsed() > config.client_timeout {
                    break None;
                }
                if session.ping(b"").await.is_err() {
                    break None;
                }
            }
        }
    };

    state.rooms.leave_user(&user_id, session_id);
    let _ = session.close(reason).await;
}

async fn handle_text(state: &AppState, user_id: &str, text: &str) {
    match serde_json::from_str::<ClientMessage>(text) {
        Ok(ClientMessage::JoinTrip { trip_id }) => {
            if state.rooms.join_trip(&trip_id, user_id) {
                state
                    .rooms
                    .send_to_user(user_id, &ServerEvent::TripJoined { trip_id: &trip_id }.to_json());
            }
        }
        Ok(ClientMessage::LeaveTrip { trip_id }) => {
            state.rooms.leave_trip(&trip_id, user_id);
            state
                .rooms
                .send_to_user(user_id, &ServerEvent::TripLeft { trip_id: &trip_id }.to_json());
        }
        Ok(ClientMessage::JoinVehicle { vehicle_id }) => {
            if state.rooms.join_vehicle(&vehicle_id, user_id) {
                state.rooms.send_to_user(
                    user_id,
                    &ServerEvent::VehicleJoined { vehicle_id: &vehicle_id }.to_json(),
                );
                log::info!("user {} joined vehicle room {}", user_id, vehicle_id);
            }
        }
        Ok(ClientMessage::LeaveVehicle { vehicle_id }) => {
            state.rooms.leave_vehicle(&vehicle_id, user_id);
            state.rooms.send_to_user(
                user_id,
                &ServerEvent::VehicleLeft { vehicle_id: &vehicle_id }.to_json(),
            );
        }
        Ok(ClientMessage::VehicleLocation {
            vehicle_id,
            lat,
            lon,
            time,
        }) => {
            let driver_id = user_id.to_string();
            let vehicle_id_for_store = vehicle_id.clone();
            let state = state.clone();
            let time_for_store = time.clone();

            log::info!(
                "received vehicle socket update: vehicleId={}, driverId={}, lat={}, lon={}, time={}",
                vehicle_id,
                driver_id,
                lat,
                lon,
                time
            );

            tokio::spawn(async move {
                if let Err(err) = crate::services::publisher::store_vehicle_location(
                    &state,
                    &vehicle_id_for_store,
                    &driver_id,
                    lat,
                    lon,
                    &time_for_store,
                )
                .await
                {
                    log::error!(
                        "failed to store vehicle location for vehicle {}: {}",
                        vehicle_id_for_store,
                        err
                    );
                }
            });
        }
        Err(_) => {
            state.rooms.send_to_user(
                user_id,
                &ServerEvent::Error { message: "invalid message" }.to_json(),
            );
        }
    }
}
