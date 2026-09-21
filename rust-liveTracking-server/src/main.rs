use actix_web::{App, HttpServer, web, HttpResponse};

mod app;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env_logger::init();
    let addr = "127.0.0.1:8080";
    println!("Starting Actix server at http://{}", addr);

    HttpServer::new(|| {
        App::new().configure(app::configure)
    })
    .bind(addr)?
    .run()
    .await
}