use actix_web::{App, HttpServer};
use anyhow::Result;

use rust_live_tracking_server::app_state::AppState;
use rust_live_tracking_server::config::Config;
use rust_live_tracking_server::shutdown::install_shutdown_token;
use rust_live_tracking_server::telemetry::init_telemetry;
use rust_live_tracking_server::transport::http::configure;

#[actix_web::main]
async fn main() -> Result<()> {
    init_telemetry();
    let config = Config::from_env()?;
    let shutdown = install_shutdown_token();
    let app_state = AppState::new(config.clone(), shutdown).await?;

    HttpServer::new(move || {
        App::new()
            .app_data(actix_web::web::Data::new(app_state.clone()))
            .configure(configure)
    })
    .bind(&config.bind_addr)?
    .run()
    .await?;
    Ok(())
}
