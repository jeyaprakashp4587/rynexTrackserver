use std::sync::Arc;

use actix_web::web::Data;
use actix_ws::{Message, MessageStream, Session};
use futures::StreamExt;
use tokio::sync::mpsc;

use crate::app_state::AppState;
use crate::auth::claims::Claims;
use crate::domain::ids::{ConnId, RoomId, TripId, UserId};
use crate::domain::messages::{ClientMsg, ServerMsg};
use crate::domain::location::Location;

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

        // simple writer task: send serialized ServerMsg to the websocket
        let writer = tokio::spawn(async move {
            while let Some(msg) = send_rx.recv().await {
                if let Ok(payload) = serde_json::to_string(&*msg) {
                    let _ = writer_session.text(payload).await;
                }
            }
        });

        // join user's personal room
        if let Some(cmd) = self.app.room_manager.join_user_room(&user_id, self.conn_id.clone(), send_tx.clone()) {
            self.app.sub_tx.send(cmd).ok();
        }

        while let Some(msg) = self.msg_stream.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    let client: Result<ClientMsg, _> = serde_json::from_str(&text);
                    match client {
                        Ok(ClientMsg::JoinTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            if let Some(cmd) = self.app.room_manager.join_trip_room(&trip_id, self.conn_id.clone(), send_tx.clone()) {
                                self.app.sub_tx.send(cmd).ok();
                            }
                            let _ = send_tx
                                .send(Arc::new(ServerMsg::Joined { trip_id: trip_id.as_str().to_string() }))
                                .await;
                        }
                        Ok(ClientMsg::LeaveTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            if let Some(cmd) = self.app.room_manager.leave_trip_room(&trip_id, &self.conn_id) {
                                self.app.sub_tx.send(cmd).ok();
                            }
                            let _ = send_tx
                                .send(Arc::new(ServerMsg::Left { trip_id: trip_id.as_str().to_string() }))
                                .await;
                        }
                        Ok(ClientMsg::Location { trip_id, lat, lng, heading, speed, ts }) => {
                            let trip_id = TripId::new(trip_id);
                            let msg = ServerMsg::Location { trip_id: trip_id.as_str().to_string(), lat, lng, heading, speed, ts };
                            // fanout to local room members
                            self.app.room_manager.fanout(&RoomId::new(format!("trip:{}", trip_id.as_str())), msg.clone());
                            // publish to redis so other instances can receive
                            if let Ok(payload) = serde_json::to_string(&msg) {
                                let _ = self.app.redis.publish(&format!("trip:{}", trip_id.as_str()), &payload).await;
                                let _ = self.app.redis.set_last_location(trip_id.as_str(), &payload, 60).await;
                            }
                        }
                        Ok(ClientMsg::EndTrip { trip_id }) => {
                            let trip_id = TripId::new(trip_id);
                            self.app.room_manager.end_trip(&trip_id);
                            let payload = serde_json::to_string(&ServerMsg::TripEnded { trip_id: trip_id.as_str().to_string() }).unwrap_or_default();
                            let _ = self.app.redis.publish(&format!("trip:{}", trip_id.as_str()), &payload).await;
                        }
                        Ok(ClientMsg::Ping) => {
                            let _ = send_tx.send(Arc::new(ServerMsg::Pong)).await;
                        }
                        Err(err) => {
                            let _ = send_tx
                                .send(Arc::new(ServerMsg::Error { code: "invalid_message".to_string(), message: err.to_string() }))
                                .await;
                        }
                    }
                }
                Ok(Message::Close(_)) => break,
                Ok(Message::Ping(bytes)) => {
                    let _ = session.pong(&bytes).await;
                }
                _ => {}
            }
        }

        // cleanup: remove connection and notify redis subscriber if rooms become empty
        let cmds = self.app.room_manager.remove_conn(&self.conn_id);
        for cmd in cmds {
            self.app.sub_tx.send(cmd).ok();
        }
        writer.abort();
        let _ = session.close(None).await;
    }
}
