use actix_web::web;

use crate::handlers;

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.route("/health", web::get().to(handlers::health::health))
        .route("/connect", web::get().to(handlers::connect::connect))
        .route("/tripRoom", web::post().to(handlers::trip_room::join_trip_room))
        .route(
            "/update-vehicle-location",
            web::post().to(handlers::location::update_vehicle_location),
        );
}
