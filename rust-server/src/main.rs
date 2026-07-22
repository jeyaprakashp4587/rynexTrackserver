mod app;
mod infrastructure;
mod routes;
mod state;

#[tokio::main]

async fn main () {
    let app = app::build().await;
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    println!("🚀 Server running on http://localhost:3000");

    axum::serve(listener, app).await.unwrap();
}
