use redis::AsyncCommands;

use crate::errors::AppError;
use crate::models::{LocationUpdate, ServerEvent, VehicleLocationUpdate};
use crate::state::AppState;

pub async fn publish_location(state: &AppState, update: &LocationUpdate) -> Result<i64, AppError> {
    let channel = state.settings.redis.trip_channel(&update.trip_id);
    let payload = ServerEvent::VehicleLocation(update).to_json();

    let mut conn = state.publisher.clone();
    let receivers: i64 = conn.publish(channel, payload).await?;

    Ok(receivers)
}

pub async fn store_vehicle_location(
    state: &AppState,
    vehicle_id: &str,
    driver_id: &str,
    lat: f64,
    lon: f64,
    time: &str,
) -> Result<i64, AppError> {
    let update = VehicleLocationUpdate {
        vehicle_id: vehicle_id.to_string(),
        driver_id: driver_id.to_string(),
        lat,
        lon,
        time: time.to_string(),
    };
    update.validate()?;

    let key = state.settings.redis.vehicle_key(vehicle_id);
    let mut conn = state.redis_client.get_async_connection().await?;
    let _: () = redis::cmd("HSET")
        .arg(&key)
        .arg("vehicleId")
        .arg(&update.vehicle_id)
        .arg("driverId")
        .arg(&update.driver_id)
        .arg("lat")
        .arg(update.lat)
        .arg("lon")
        .arg(update.lon)
        .arg("updatedAt")
        .arg(&update.time)
        .query_async(&mut conn)
        .await?;

    let channel = state.settings.redis.vehicle_channel(vehicle_id);
    let payload = ServerEvent::VehicleLocation(&update).to_json();
    let mut publisher = state.publisher.clone();
    let receivers: i64 = publisher.publish(channel, payload).await?;

    log::info!(
        "stored vehicle location in redis: key={}, vehicleId={}, driverId={}, lat={}, lon={}, receivers={}",
        key,
        update.vehicle_id,
        update.driver_id,
        update.lat,
        update.lon,
        receivers
    );

    Ok(receivers)
}
