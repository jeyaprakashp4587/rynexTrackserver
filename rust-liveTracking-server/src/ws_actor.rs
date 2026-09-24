use actix::prelude::*;
use actix_web_actors::ws;
use actix_web_actors::ws::Message;
use crate::state::AppState;

pub struct WsConn {
    state: AppState,
}

impl WsConn {
    pub fn new(state: AppState) -> Self {
        Self { state }
    }
}

impl Actor for WsConn {
    type Context = ws::WebsocketContext<Self>;
}

impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsConn {
    fn handle(&mut self, item: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match item {
            Ok(Message::Text(text)) => ctx.text(text),
            Ok(Message::Ping(msg)) => ctx.pong(&msg),
            Ok(Message::Pong(_)) => (),
            Ok(Message::Binary(_)) => (),
            Ok(Message::Close(reason)) => {
                ctx.close(reason);
                ctx.stop();
            }
            _ => (),
        }
    }
}
