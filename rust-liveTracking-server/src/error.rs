use actix_web::http::StatusCode;
use actix_web::{HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use thiserror::Error;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub enum WsErrorCode {
    #[serde(rename = "unauthorized")]
    Unauthorized,
    #[serde(rename = "invalid_message")]
    InvalidMessage,
    #[serde(rename = "trip_forbidden")]
    TripForbidden,
    #[serde(rename = "validation")]
    Validation,
    #[serde(rename = "internal")]
    Internal,
}

impl Display for WsErrorCode {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let value = match self {
            Self::Unauthorized => "unauthorized",
            Self::InvalidMessage => "invalid_message",
            Self::TripForbidden => "trip_forbidden",
            Self::Validation => "validation",
            Self::Internal => "internal",
        };
        write!(f, "{value}")
    }
}

#[derive(Debug, Error)]
pub enum AppError {
    #[error("invalid JWT: {0}")]
    InvalidJwt(String),
    #[error("invalid token")]
    InvalidToken,
    #[error("unauthorized")]
    Unauthorized,
    #[error("trip not authorized")]
    TripNotAuthorized,
    #[error("room not found: {0}")]
    RoomNotFound(String),
    #[error("redis error: {0}")]
    Redis(String),
    #[error("validation failed: {0}")]
    Validation(String),
    #[error("json error: {0}")]
    Json(String),
    #[error("websocket error: {0}")]
    WebSocket(String),
    #[error("internal error: {0}")]
    Internal(String),
}

pub type AppResult<T> = Result<T, AppError>;

impl AppError {
    pub fn ws_code(&self) -> WsErrorCode {
        match self {
            Self::InvalidJwt(_) | Self::InvalidToken | Self::Unauthorized => WsErrorCode::Unauthorized,
            Self::TripNotAuthorized => WsErrorCode::TripForbidden,
            Self::Validation(_) => WsErrorCode::Validation,
            Self::Json(_) | Self::WebSocket(_) | Self::Redis(_) | Self::Internal(_) => WsErrorCode::Internal,
            Self::RoomNotFound(_) => WsErrorCode::InvalidMessage,
        }
    }
}

impl ResponseError for AppError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidJwt(_) | Self::InvalidToken | Self::Unauthorized => StatusCode::UNAUTHORIZED,
            Self::TripNotAuthorized => StatusCode::FORBIDDEN,
            Self::Validation(_) | Self::Json(_) | Self::WebSocket(_) => StatusCode::BAD_REQUEST,
            Self::RoomNotFound(_) => StatusCode::NOT_FOUND,
            Self::Redis(_) | Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn error_response(&self) -> HttpResponse {
        HttpResponse::build(self.status_code()).json(serde_json::json!({
            "error": self.to_string()
        }))
    }
}

impl From<anyhow::Error> for AppError {
    fn from(value: anyhow::Error) -> Self {
        Self::Internal(value.to_string())
    }
}

impl From<redis::RedisError> for AppError {
    fn from(value: redis::RedisError) -> Self {
        Self::Redis(value.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(value: serde_json::Error) -> Self {
        Self::Json(value.to_string())
    }
}
