mod app;
mod config;
mod infrastructure;
mod state;

#[tokio::main]
async fn main() -> Result<(), anyhow::Error> {
    tracing_subscriber::fmt::init();
    let env = config::env::Env::from_env();
    let state = state::app_state::AppState::new();
    let shared_state = std::sync::Arc::new(state);

    // start in-process pubsub subscriber (legacy) and Redis pubsub subscriber
    infrastructure::pubsub::start_subscriber(shared_state.clone()).await;
    if let Err(err) = infrastructure::redis_pubsub::start_subscriber(shared_state.clone(), &env.redis_url).await {
        tracing::error!("redis:subscriber:start:error", ?err);
    }

    let app = app::build(shared_state.clone()).await;

    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], env.port));
    tracing::info!("Server listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();

    Ok(())
}
