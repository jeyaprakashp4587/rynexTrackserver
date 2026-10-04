use actix_web::web;
use actix_ws::{CloseReason, Message, MessageStream, Session};
use futures_util::StreamExt;
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
                    handle_text(&state, &user_id, &text);
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

fn handle_text(state: &AppState, user_id: &str, text: &str) {
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
        Err(_) => {
            state.rooms.send_to_user(
                user_id,
                &ServerEvent::Error { message: "invalid message" }.to_json(),
            );
        }
    }
}
