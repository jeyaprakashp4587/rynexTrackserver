use actix_web::web;
use actix_ws::{CloseCode, CloseReason, Message, MessageStream, Session};
use futures::StreamExt;
use std::time::Duration;
use tokio::{
    sync::mpsc::{UnboundedReceiver, UnboundedSender},
    time::Instant,
};
use uuid::Uuid;

use crate::auth::{
    validate_driver_role, verify_jwt, AuthError, AuthErrorCode, RateLimiter,
};
use crate::models::{ClientMessage, ServerEvent, TypedClientMessage};
use crate::state::AppState;

pub enum SessionAuth {
    Unauthenticated {
        deadline: Instant,
    },
    Authenticated {
        user_id: String,
        role: String,
        exp_instant: Instant,
    },
}

pub async fn run(
    state: web::Data<AppState>,
    mut auth: SessionAuth,
    session_id: Uuid,
    mut session: Session,
    mut stream: MessageStream,
    mut rx: UnboundedReceiver<String>,
    tx: UnboundedSender<String>,
) {
    let config = state.settings.socket.clone();
    let auth_config = state.settings.auth.clone();
    let mut rate_limiter =
        RateLimiter::new(auth_config.rate_limit_per_sec, auth_config.rate_limit_burst);
    let mut last_heartbeat = Instant::now();
    let mut ticker = tokio::time::interval(config.heartbeat_interval);

    let reason: Option<CloseReason> = loop {
        // Compute timer target depending on authentication state
        let auth_timer_target = match &auth {
            SessionAuth::Unauthenticated { deadline } => *deadline,
            SessionAuth::Authenticated { exp_instant, .. } => *exp_instant,
        };

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

                    // Check message rate limit
                    if !rate_limiter.check_and_consume() {
                        log::warn!("Rate limit exceeded for session {}", session_id);
                        let _ = session.text(ServerEvent::ErrorWithCode {
                            code: AuthErrorCode::RateLimitExceeded.as_str(),
                            message: "Message rate limit exceeded. Please slow down.",
                        }.to_json()).await;
                        continue;
                    }

                    match handle_client_message(&state, &mut auth, session_id, &tx, &text).await {
                        Ok(Some(response_json)) => {
                            let _ = session.text(response_json).await;
                        }
                        Ok(None) => {}
                        Err(auth_err) => {
                            log::warn!("Session {} auth error: {:?}", session_id, auth_err);
                            let code = auth_err.code();
                            let _ = session.text(ServerEvent::ErrorWithCode {
                                code: code.as_str(),
                                message: &auth_err.to_string(),
                            }.to_json()).await;

                            let close_code = if code == AuthErrorCode::Unauthorized {
                                CloseCode::Other(4403)
                            } else {
                                CloseCode::Other(4401)
                            };

                            let close_reason = CloseReason {
                                code: close_code,
                                description: Some(code.as_str().to_string()),
                            };
                            break Some(close_reason);
                        }
                    }
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

            _ = tokio::time::sleep_until(auth_timer_target) => {
                match &auth {
                    SessionAuth::Unauthenticated { .. } => {
                        log::warn!("Session {} authentication timeout", session_id);
                        let err_json = ServerEvent::ErrorWithCode {
                            code: AuthErrorCode::AuthenticationRequired.as_str(),
                            message: "Authentication timeout: no token provided.",
                        }.to_json();
                        let _ = session.text(err_json).await;
                        let close_reason = CloseReason {
                            code: CloseCode::Other(4401),
                            description: Some("AUTHENTICATION_REQUIRED".to_string()),
                        };
                        break Some(close_reason);
                    }
                    SessionAuth::Authenticated { user_id, .. } => {
                        log::warn!("Session {} token expired for user {}", session_id, user_id);
                        let err_json = ServerEvent::ErrorWithCode {
                            code: AuthErrorCode::TokenExpired.as_str(),
                            message: "JWT access token has expired. Authentication required.",
                        }.to_json();
                        let _ = session.text(err_json).await;
                        let close_reason = CloseReason {
                            code: CloseCode::Other(4401),
                            description: Some("AUTH_TOKEN_EXPIRED".to_string()),
                        };
                        break Some(close_reason);
                    }
                }
            }

            _ = ticker.tick() => {
                if last_heartbeat.elapsed() > config.client_timeout {
                    log::warn!("Session {} heartbeat timeout", session_id);
                    break None;
                }
                if session.ping(b"").await.is_err() {
                    break None;
                }
            }
        }
    };

    // Clean up room memberships when connection closes
    if let SessionAuth::Authenticated { user_id, .. } = &auth {
        state.rooms.leave_user(user_id, session_id);
        log::info!("session closed and left rooms: userId={}, sessionId={}", user_id, session_id);
    }

    let _ = session.close(reason).await;
}

async fn handle_client_message(
    state: &AppState,
    auth: &mut SessionAuth,
    session_id: Uuid,
    tx: &UnboundedSender<String>,
    text: &str,
) -> Result<Option<String>, AuthError> {
    let msg = match serde_json::from_str::<ClientMessage>(text) {
        Ok(m) => m,
        Err(err) => {
            log::warn!("Failed to parse client message: {} | error: {}", text, err);
            return Ok(Some(
                ServerEvent::Error {
                    message: "Invalid JSON or message format",
                }
                .to_json(),
            ));
        }
    };

    match auth {
        SessionAuth::Unauthenticated { .. } => {
            let token_opt = match &msg {
                ClientMessage::AuthEnvelope { auth } => Some(&auth.token),
                ClientMessage::Typed(TypedClientMessage::Auth { token }) => Some(token),
                _ => None,
            };

            let token = match token_opt {
                Some(t) => t,
                None => {
                    log::warn!("Rejecting unauthenticated client message: {}", text);
                    return Err(AuthError::AuthenticationRequired);
                }
            };

            let claims = verify_jwt(
                token,
                &state.settings.auth.jwt_secret,
                state.settings.auth.jwt_issuer.as_deref(),
                state.settings.auth.jwt_audience.as_deref(),
            )?;

            validate_driver_role(&claims)?;

            let user_id = claims.user_id.clone();
            let role = claims.role.clone();
            let exp_secs = claims.seconds_until_expiration();
            let exp_instant = Instant::now() + Duration::from_secs(exp_secs);

            log::info!(
                "Session {} authenticated via auth packet: userId={}, role={}",
                session_id,
                user_id,
                role
            );

            state.rooms.join_user(&user_id, session_id, tx.clone());

            *auth = SessionAuth::Authenticated {
                user_id: user_id.clone(),
                role,
                exp_instant,
            };

            Ok(Some(ServerEvent::Connected { user_id: &user_id }.to_json()))
        }

        SessionAuth::Authenticated {
            user_id,
            role,
            exp_instant,
        } => {
            match msg {
                ClientMessage::AuthEnvelope { auth } => {
                    // In-band token refresh
                    let claims = verify_jwt(
                        &auth.token,
                        &state.settings.auth.jwt_secret,
                        state.settings.auth.jwt_issuer.as_deref(),
                        state.settings.auth.jwt_audience.as_deref(),
                    )?;
                    validate_driver_role(&claims)?;
                    let exp_secs = claims.seconds_until_expiration();
                    *exp_instant = Instant::now() + Duration::from_secs(exp_secs);
                    log::info!("Session {} token refreshed in-band for user {}", session_id, user_id);
                    Ok(Some(ServerEvent::Connected { user_id }.to_json()))
                }
                ClientMessage::Typed(TypedClientMessage::Auth { token }) => {
                    let claims = verify_jwt(
                        &token,
                        &state.settings.auth.jwt_secret,
                        state.settings.auth.jwt_issuer.as_deref(),
                        state.settings.auth.jwt_audience.as_deref(),
                    )?;
                    validate_driver_role(&claims)?;
                    let exp_secs = claims.seconds_until_expiration();
                    *exp_instant = Instant::now() + Duration::from_secs(exp_secs);
                    log::info!("Session {} token refreshed in-band for user {}", session_id, user_id);
                    Ok(Some(ServerEvent::Connected { user_id }.to_json()))
                }
                ClientMessage::Typed(TypedClientMessage::JoinTrip { trip_id }) => {
                    if state.rooms.join_trip(&trip_id, user_id) {
                        Ok(Some(
                            ServerEvent::TripJoined {
                                trip_id: &trip_id,
                            }
                            .to_json(),
                        ))
                    } else {
                        Ok(None)
                    }
                }
                ClientMessage::Typed(TypedClientMessage::LeaveTrip { trip_id }) => {
                    state.rooms.leave_trip(&trip_id, user_id);
                    Ok(Some(
                        ServerEvent::TripLeft {
                            trip_id: &trip_id,
                        }
                        .to_json(),
                    ))
                }
                ClientMessage::Typed(TypedClientMessage::Ping) => {
                    Ok(Some(r#"{"event":"pong"}"#.to_string()))
                }
                ClientMessage::Typed(TypedClientMessage::VehicleLocation {
                    vehicle_id,
                    trip_id,
                    location,
                    lat,
                    lon,
                    time,
                    ..
                }) => {
                    let role_upper = role.trim().to_uppercase();
                    if role_upper != "DRIVER" && role_upper != "ADMIN" {
                        log::warn!(
                            "User {} with role {} tried to publish vehicle location",
                            user_id,
                            role
                        );
                        return Err(AuthError::Unauthorized(
                            "Only drivers are allowed to publish vehicle locations".into(),
                        ));
                    }

                    // Cryptographically enforce driver_id from verified JWT
                    let authenticated_driver_id = user_id.clone();
                    let resolved_lat = location.as_ref().map(|p| p.lat).or(lat).unwrap_or_default();
                    let resolved_lon = location.as_ref().map(|p| p.lon).or(lon).unwrap_or_default();
                    let resolved_time = time.unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

                    let vehicle_id_for_store = vehicle_id.clone();
                    let driver_id_for_store = authenticated_driver_id.clone();
                    let state_clone = state.clone();

                    // Optional Trip validation
                    if let Some(trip_id_val) = &trip_id {
                        let is_assigned = validate_driver_trip_assignment(
                            state,
                            &authenticated_driver_id,
                            trip_id_val,
                        )
                        .await;

                        if !is_assigned {
                            log::warn!(
                                "Driver {} is not assigned to trip {}",
                                authenticated_driver_id,
                                trip_id_val
                            );
                            return Err(AuthError::Unauthorized(
                                "Driver is not assigned to the specified trip".into(),
                            ));
                        }
                    }

                    tokio::spawn(async move {
                        if let Some(trip_id) = trip_id {
                            let trip_update = crate::models::LocationUpdate {
                                trip_id: Some(trip_id.clone()),
                                vehicle_id: Some(vehicle_id_for_store.clone()),
                                driver_id: Some(driver_id_for_store.clone()),
                                location: Some(crate::models::location::LocationPoint {
                                    lat: resolved_lat,
                                    lon: resolved_lon,
                                }),
                                lat: Some(resolved_lat),
                                lon: Some(resolved_lon),
                                time: Some(resolved_time.clone()),
                            };

                            if let Err(err) =
                                crate::services::publisher::publish_location(&state_clone, &trip_update)
                                    .await
                            {
                                log::error!(
                                    "Failed to broadcast location for trip {}: {}",
                                    trip_id,
                                    err
                                );
                            }
                        }

                        if let Err(err) = crate::services::publisher::store_vehicle_location(
                            &state_clone,
                            &vehicle_id_for_store,
                            &driver_id_for_store,
                            resolved_lat,
                            resolved_lon,
                            &resolved_time,
                        )
                        .await
                        {
                            log::error!(
                                "Failed to store location for vehicle {}: {}",
                                vehicle_id_for_store,
                                err
                            );
                        }
                    });

                    Ok(None)
                }
            }
        }
    }
}

async fn validate_driver_trip_assignment(
    state: &AppState,
    driver_user_id: &str,
    trip_id: &str,
) -> bool {
    let mut conn = match state.redis_client.get_multiplexed_async_connection().await {
        Ok(c) => c,
        Err(_) => return true, // Fail-open on transient redis error
    };

    let driver_key = format!("driver:user:{}", driver_user_id);
    let driver_json: Option<String> = redis::cmd("GET")
        .arg(&driver_key)
        .query_async(&mut conn)
        .await
        .unwrap_or(None);

    if let Some(json_str) = driver_json {
        if let Ok(driver_val) = serde_json::from_str::<serde_json::Value>(&json_str) {
            if let Some(active_trip_id) = driver_val
                .get("activeTrip")
                .and_then(|at| at.get("activeTripId"))
                .and_then(|id| id.as_str())
            {
                if active_trip_id == trip_id {
                    return true;
                }
            }
        }
    }

    let trip_key = format!("trip_data:{}", trip_id);
    let trip_json: Option<String> = redis::cmd("GET")
        .arg(&trip_key)
        .query_async(&mut conn)
        .await
        .unwrap_or(None);

    if let Some(json_str) = trip_json {
        if json_str.contains(driver_user_id) {
            return true;
        }
    }

    true
}
