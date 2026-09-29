use std::sync::Arc;

use actix_web::web::Data;
use actix_ws::{Message, MessageStream, Session};
use futures::StreamExt;
use tokio::sync::mpsc;

use crate::app_state::AppState;
use crate::auth::claims::Claims;
use crate::domain::ids::{ConnId, RoomId, TripId, UserId};
use crate::domain::location::Location;
use crate::domain::messages::{ClientMsg, ServerMsg};
use crate::domain::role::Role;
use crate::error::WsErrorCode;
use crate::transport::ws::rate_limit::RateLimiter;

pub struct WsSession {
    app: Data<AppState>,
    claims: Claims,
    conn_id: ConnId,
    session: Session,
    msg_stream: MessageStream,
}

impl WsSession {
    pub fn new(
        app: Data<AppState>,
        claims: Claims,
        conn_id: ConnId,
        session: Session,
        msg_stream: MessageStream,
    ) -> Self {
        Self {
            app,
            claims,
            conn_id,
            session,
            msg_stream,
        }
    }

    pub async fn run(mut self) {
        let user_id = UserId::new(self.claims.sub.clone());
        let (send_tx, mut send_rx) = mpsc::channel::<Arc<ServerMsg>>(256);
        let mut session = self.session.clone();
        let mut writer_session = session.clone();

        let writer = tokio::spawn(async move {
            while let Some(msg) = send_rx.recv().await {
                if let Ok(payload) = serde_json::to_string(&*msg) {
                    let _ = writer_session.text(payload).await;
                }
            }
        });

        if let Some(cmd) = self.app.room_manager.join_user_room(&user_id, self.conn_id.clone(), send_tx.clone()) {
            self.app.sub_tx.send(cmd).ok();
        }

        let mut rate_limiter = RateLimiter::new();
        while let Some(msg) = self.msg_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let text = text.to_string();
                    if !rate_limiter.allow(5) {
                        continue;
                    }
                    let client: Result<ClientMsg, _> = serde_json::from_str(&text);
                    match client {
                        Ok(ClientMsg::JoinTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            if let Some(cmd) = self.app.room_manager.join_trip_room(&trip_id, self.conn_id.clone(), send_tx.clone()) {
                                self.app.sub_tx.send(cmd).ok();
                            }
                            let _ = send_tx.send(Arc::new(ServerMsg::Joined { trip_id: trip_id.as_str().to_string() })).await;
                        }
                        Ok(ClientMsg::LeaveTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            if let Some(cmd) = self.app.room_manager.leave_trip_room(&trip_id, &self.conn_id) {
                                self.app.sub_tx.send(cmd).ok();
                            }
                            let _ = send_tx.send(Arc::new(ServerMsg::Left { trip_id: trip_id.as_str().to_string() })).await;
                        }
                        Ok(ClientMsg::Location { trip_id, lat, lng, heading, speed, ts }) => {
                            let trip_id = TripId::new(trip_id);
                            if self.claims.role != Role::Driver {
                                let _ = send_tx.send(Arc::new(ServerMsg::Error { code: WsErrorCode::Unauthorized.to_string(), message: "driver role required".to_string() })).await;
                                continue;
                            }
                            let location = Location { lat, lng, heading, speed, ts };
                            if let Err(err) = location.validate() {
                                let _ = send_tx.send(Arc::new(ServerMsg::Error { code: WsErrorCode::Validation.to_string(), message: err.to_string() })).await;
                                continue;
                            }
                            let allowed = self.app.authorizer.can_driver_publish(&trip_id, &user_id).await;
                            if !allowed {
                                let _ = send_tx.send(Arc::new(ServerMsg::Error { code: WsErrorCode::TripForbidden.to_string(), message: "trip authorization failed".to_string() })).await;
                                continue;
                            }
                            self.app.room_manager.fanout(&RoomId::new(format!("trip:{}", trip_id.as_str())), ServerMsg::Location { trip_id: trip_id.as_str().to_string(), lat, lng, heading, speed, ts });
                            if let Ok(payload) = serde_json::to_string(&ServerMsg::Location { trip_id: trip_id.as_str().to_string(), lat, lng, heading, speed, ts }) {
                                self.app.redis.publish(&format!("trip:{}", trip_id.as_str()), &payload).await.ok();
                                self.app.redis.set_last_location(trip_id.as_str(), &payload, 60).await.ok();
                            }
                        }
                        Ok(ClientMsg::EndTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            self.app.room_manager.end_trip(&trip_id);
                            let _ = self.app.redis.publish(&format!("trip:{}", trip_id.as_str()), &serde_json::to_string(&ServerMsg::TripEnded { trip_id: trip_id.as_str().to_string() }).unwrap_or_default()).await;
                        }
                        Ok(ClientMsg::Ping) => {
                            let _ = send_tx.send(Arc::new(ServerMsg::Pong)).await;
                        }
                        Err(err) => {
                            let _ = send_tx.send(Arc::new(ServerMsg::Error { code: WsErrorCode::InvalidMessage.to_string(), message: err.to_string() })).await;
                        }
                    }
                }
                Ok(Message::Pong(_)) => {}
                Ok(Message::Ping(bytes)) => {
                    let _ = session.pong(&bytes).await;
                }
                Ok(Message::Close(reason)) => {
                    if let Some(reason) = reason {
                        let _ = session.clone().close(Some(reason)).await;
                    }
                    break;
                }
                Err(err) => {
                    let _ = send_tx.send(Arc::new(ServerMsg::Error { code: WsErrorCode::Internal.to_string(), message: err.to_string() })).await;
                    break;
                }
                _ => {}
            }
        }

        let cmds = self.app.room_manager.remove_conn(&self.conn_id);
        for cmd in cmds {
            self.app.sub_tx.send(cmd).ok();
        }
        writer.abort();
        let _ = session.clone().close(None).await;
    }
}
