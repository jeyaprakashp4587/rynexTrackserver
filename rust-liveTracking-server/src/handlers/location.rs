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

    let receivers = publisher::publish_location(&state, &update).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "tripId": update.trip_id,
        "receivers": receivers
    })))
}
