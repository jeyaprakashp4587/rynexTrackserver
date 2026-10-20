use actix_web::{web, HttpResponse};

use crate::errors::AppError;
use crate::models::LocationUpdate;
use crate::services::publisher;
use crate::state::AppState;

pub async fn update_vehicle_location(
    state: web::Data<AppState>,
    payload: web::Json<LocationUpdate>,
) -> Result<HttpResponse, AppError> {
    let update = payload.into_inner();
    update.validate()?;

    let trip_id = update.trip_id.clone();
    let vehicle_id = update.vehicle_id.clone();
    let driver_id = update.driver_id.clone();
    let lat = update.resolved_lat().unwrap_or_default();
    let lon = update.resolved_lon().unwrap_or_default();
    let time = update.resolved_time().unwrap_or("0").to_string();

    let receivers = if let Some(_) = trip_id.clone() {
        let trip_update = update.clone();
        publisher::publish_location(&state, &trip_update).await?
    } else {
        0
    };

    if let (Some(vehicle_id), Some(driver_id)) = (vehicle_id, driver_id) {
        publisher::store_vehicle_location(&state, &vehicle_id, &driver_id, lat, lon, &time).await?;
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "tripId": trip_id,
        "receivers": receivers
    })))
}
