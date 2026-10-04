use actix_web::{web, Error, HttpRequest, HttpResponse};
use serde::Deserialize;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::errors::AppError;
use crate::models::ServerEvent;
use crate::socket::session;
use crate::state::AppState;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectQuery {
    pub user_id: String,
}

pub async fn connect(
    req: HttpRequest,
    body: web::Payload,
    query: web::Query<ConnectQuery>,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let user_id = query.into_inner().user_id.trim().to_string();
    if user_id.is_empty() {
        return Err(AppError::BadRequest("userId is required".into()).into());
    }

    let (response, ws_session, msg_stream) = actix_ws::handle(&req, body)?;

    let (tx, rx) = mpsc::unbounded_channel::<String>();
    let session_id = Uuid::new_v4();

    state.rooms.join_user(&user_id, session_id, tx);
    state
        .rooms
        .send_to_user(&user_id, &ServerEvent::Connected { user_id: &user_id }.to_json());

    actix_web::rt::spawn(session::run(
        state,
        user_id,
        session_id,
        ws_session,
        msg_stream,
        rx,
    ));

    Ok(response)
}
