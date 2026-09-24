use actix_web::{web, HttpResponse, Error, HttpRequest, Responder};
use actix_web::web::Data;
use actix_web_actors::ws;

use crate::state::AppState;

mod ws_actor;

pub fn configure(cfg: &mut web::ServiceConfig) {
	cfg.route("/", web::get().to(index))
	   .route("/health", web::get().to(health))
	   .route("/ws/", web::get().to(ws_index));
}

async fn index() -> impl Responder {
	HttpResponse::Ok().body("Actix server running")
}

async fn health() -> impl Responder {
	HttpResponse::Ok().body("OK")
}

async fn ws_index(req: HttpRequest, stream: web::Payload, state: Data<AppState>) -> Result<HttpResponse, Error> {
	let actor = ws_actor::WsConn::new(state.get_ref().clone());
	let resp = ws::start(actor, &req, stream)?;
	Ok(resp)
}