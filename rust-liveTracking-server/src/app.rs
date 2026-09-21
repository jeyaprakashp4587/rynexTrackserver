use actix_web::{web, HttpResponse};

pub fn configure(cfg: &mut web::ServiceConfig) {
	cfg.route("/", web::get().to(index))
	   .route("/health", web::get().to(health));
}

async fn index() -> HttpResponse {
	HttpResponse::Ok().body("Actix server running")
}

async fn health() -> HttpResponse {
	HttpResponse::Ok().body("OK")
}