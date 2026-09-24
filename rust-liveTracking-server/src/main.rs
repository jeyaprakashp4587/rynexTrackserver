use actix_web::{App, HttpServer, web};
use std::sync::Arc;

mod app;
mod state;

use state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();

    let redis_url = std::env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".into());
    let redis_client = redis::Client::open(redis_url.as_str()).expect("Failed to create Redis client");

    let app_state = Arc::new(AppState::new(redis_client));

    let addr = "127.0.0.1:8080";
    println!("Starting Actix server at http://{}", addr);

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::from(app_state.clone()))
            .configure(app::configure)
    })
    .bind(addr)?
    .run()
    .await
}