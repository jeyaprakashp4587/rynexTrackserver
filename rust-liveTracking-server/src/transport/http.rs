use actix_web::{web::{self, Data}, HttpRequest, HttpResponse, Responder};

use crate::app_state::AppState;
use crate::error::AppError;
use crate::transport::ws::handler::handle_ws_upgrade;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(health))
        .route("/ws", web::get().to(ws_route));
}

async fn health(state: Data<AppState>) -> Result<impl Responder, AppError> {
    state.redis.ping().await.map_err(|err| AppError::Redis(err.to_string()))?;
    Ok(HttpResponse::Ok().json(serde_json::json!({ "status": "ok" })))
}

async fn ws_route(req: HttpRequest, payload: web::Payload, state: Data<AppState>) -> Result<HttpResponse, AppError> {
    handle_ws_upgrade(req, payload, state).await
}
