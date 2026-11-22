use actix_web::{http::header::AUTHORIZATION, web, Error, HttpRequest, HttpResponse};
use serde::Deserialize;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::time::Instant;
use uuid::Uuid;

use crate::auth::{validate_driver_role, verify_jwt};
use crate::models::ServerEvent;
use crate::socket::session::{self, SessionAuth};
use crate::state::AppState;

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectQuery {
    pub token: Option<String>,
    pub auth_token: Option<String>,
    pub user_id: Option<String>,
}

pub async fn connect(
    req: HttpRequest,
    body: web::Payload,
    query: web::Query<ConnectQuery>,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let token_from_header = req
        .headers()
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let token_opt = query
        .token
        .clone()
        .or_else(|| query.auth_token.clone())
        .or(token_from_header);

    let (response, ws_session, msg_stream) = actix_ws::handle(&req, body)?;

    let (tx, rx) = mpsc::unbounded_channel::<String>();
    let session_id = Uuid::new_v4();

    if let Some(token) = token_opt {
        // Authenticate immediately at handshake level
        let claims = match verify_jwt(
            &token,
            &state.settings.auth.jwt_secret,
            state.settings.auth.jwt_issuer.as_deref(),
            state.settings.auth.jwt_audience.as_deref(),
        ) {
            Ok(c) => c,
            Err(err) => {
                log::warn!("WebSocket handshake auth failed: {:?}", err);
                return Err(err.into());
            }
        };

        if let Err(err) = validate_driver_role(&claims) {
            log::warn!("WebSocket handshake role check failed: {:?}", err);
            return Err(err.into());
        }

        let user_id = claims.user_id.clone();
        let role = claims.role.clone();
        let secs_until_exp = claims.seconds_until_expiration();
        let exp_instant = Instant::now() + Duration::from_secs(secs_until_exp);

        log::info!(
            "socket connected (authenticated): userId={}, role={}, sessionId={}, expInSecs={}",
            user_id,
            role,
            session_id,
            secs_until_exp
        );

        state.rooms.join_user(&user_id, session_id, tx.clone());
        state
            .rooms
            .send_to_user(&user_id, &ServerEvent::Connected { user_id: &user_id }.to_json());

        let initial_auth = SessionAuth::Authenticated {
            user_id,
            role,
            exp_instant,
        };

        actix_web::rt::spawn(session::run(
            state,
            initial_auth,
            session_id,
            ws_session,
            msg_stream,
            rx,
            tx,
        ));
    } else {
        // Unauthenticated connection: client must send auth frame within 5 seconds
        log::info!(
            "socket connected (unauthenticated, awaiting auth packet): sessionId={}",
            session_id
        );

        let initial_auth = SessionAuth::Unauthenticated {
            deadline: Instant::now() + Duration::from_secs(5),
        };

        actix_web::rt::spawn(session::run(
            state,
            initial_auth,
            session_id,
            ws_session,
            msg_stream,
            rx,
            tx,
        ));
    }

    Ok(response)
}
