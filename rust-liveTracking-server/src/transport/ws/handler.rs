use actix_web::{web, HttpRequest, HttpResponse};
use tracing::info;

use crate::app_state::AppState;
use crate::auth::jwt::decode_jwt;
use crate::domain::ids::ConnId;
use crate::error::AppError;

pub async fn handle_ws_upgrade(
    req: HttpRequest,
    payload: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, AppError> {
    let token = extract_token(&req)?;
    let claims = decode_jwt(token, &state.config.jwt_secret)?;
    let (response, session, msg_stream) = actix_ws::handle(&req, payload)
        .map_err(|err| AppError::WebSocket(err.to_string()))?;

    let conn_id = ConnId::new();
    let app = state.clone();
    let claims_for_task = claims.clone();
    info!(conn_id = %conn_id.as_str(), user_id = %claims.sub, "ws connected");

    actix_web::rt::spawn(async move {
        let ws_session = crate::transport::ws::session::WsSession::new(
            app,
            claims_for_task,
            conn_id,
            session,
            msg_stream,
        );
        ws_session.run().await;
    });

    Ok(response)
}

fn extract_token(req: &HttpRequest) -> Result<&str, AppError> {
    let query = req.query_string();
    let mut token = None;
    for pair in query.split('&') {
        let (key, value) = match pair.split_once('=') {
            Some(value) => value,
            None => continue,
        };
        if key == "token" {
            token = Some(value);
            break;
        }
    }
    token.ok_or(AppError::InvalidToken).map(|value| value.trim())
}
