mod app;
mod config;
mod errors;
mod handlers;
mod models;
mod services;
mod socket;
mod state;

use std::io;

use actix_web::{middleware::Logger, web, App, HttpServer};

use crate::config::Settings;
use crate::state::AppState;

#[actix_web::main]
async fn main() -> io::Result<()> {
    dotenvy::dotenv().ok();
    env_logger::init_from_env(env_logger::Env::default().default_filter_or("info"));

    let settings = Settings::from_env();
    let bind_addr = (settings.host.clone(), settings.port);

    let state = AppState::build(settings)
        .await
        .map_err(|e| io::Error::new(io::ErrorKind::Other, e.to_string()))?;

    services::subscriber::spawn(
        state.redis_client.clone(),
        state.rooms.clone(),
        state.settings.redis.clone(),
    );

    let data = web::Data::new(state);

    log::info!("listening on {}:{}", bind_addr.0, bind_addr.1);

    HttpServer::new(move || {
        App::new()
            .app_data(data.clone())
            .wrap(Logger::default())
            .configure(app::configure)
    })
    .bind(bind_addr)?
    .run()
    .await
}
