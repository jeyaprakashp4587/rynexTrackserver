use crate::auth::claims::Claims;
use crate::error::{AppError, AppResult};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};

pub fn encode_jwt(claims: &Claims, secret: &str) -> AppResult<String> {
    let token = encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|err| AppError::InvalidJwt(err.to_string()))?;
    Ok(token)
}

pub fn decode_jwt(token: &str, secret: &str) -> AppResult<Claims> {
    let validation = Validation::new(Algorithm::HS256);
    let claims = decode::<Claims>(token, &DecodingKey::from_secret(secret.as_bytes()), &validation)
        .map_err(|err| AppError::InvalidJwt(err.to_string()))?
        .claims;
    if claims.exp < chrono::Utc::now().timestamp() as u64 {
        return Err(AppError::InvalidToken);
    }
    Ok(claims)
}
