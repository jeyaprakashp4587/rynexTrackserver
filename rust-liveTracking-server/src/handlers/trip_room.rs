use actix_web::{web, HttpResponse};

use crate::errors::AppError;
use crate::models::{ServerEvent, TripRoomRequest};
use crate::state::AppState;

pub async fn join_trip_room(
    state: web::Data<AppState>,
    payload: web::Json<TripRoomRequest>,
) -> Result<HttpResponse, AppError> {
    let TripRoomRequest { user_id, trip_id } = payload.into_inner();

    if user_id.trim().is_empty() || trip_id.trim().is_empty() {
        return Err(AppError::BadRequest("userId and tripId are required".into()));
    }

    if !state.rooms.join_trip(&trip_id, &user_id) {
        return Err(AppError::NotFound("user is not connected".into()));
    }

    state
        .rooms
        .send_to_user(&user_id, &ServerEvent::TripJoined { trip_id: &trip_id }.to_json());

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "userId": user_id,
        "tripId": trip_id
    })))
}
