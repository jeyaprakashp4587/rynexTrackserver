use actix_web::{http::StatusCode, HttpResponse, ResponseError};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AuthErrorCode {
    #[serde(rename = "AUTH_TOKEN_MISSING")]
    TokenMissing,
    #[serde(rename = "AUTH_TOKEN_INVALID")]
    TokenInvalid,
    #[serde(rename = "AUTH_TOKEN_EXPIRED")]
    TokenExpired,
    #[serde(rename = "AUTH_UNAUTHORIZED")]
    Unauthorized,
    #[serde(rename = "AUTH_SIGNATURE_INVALID")]
    SignatureInvalid,
    #[serde(rename = "AUTHENTICATION_REQUIRED")]
    AuthenticationRequired,
    #[serde(rename = "RATE_LIMIT_EXCEEDED")]
    RateLimitExceeded,
}

impl AuthErrorCode {
    pub fn as_str(&self) -> &'static str {
        match self {
            AuthErrorCode::TokenMissing => "AUTH_TOKEN_MISSING",
            AuthErrorCode::TokenInvalid => "AUTH_TOKEN_INVALID",
            AuthErrorCode::TokenExpired => "AUTH_TOKEN_EXPIRED",
            AuthErrorCode::Unauthorized => "AUTH_UNAUTHORIZED",
            AuthErrorCode::SignatureInvalid => "AUTH_SIGNATURE_INVALID",
            AuthErrorCode::AuthenticationRequired => "AUTHENTICATION_REQUIRED",
            AuthErrorCode::RateLimitExceeded => "RATE_LIMIT_EXCEEDED",
        }
    }

    pub fn http_status(&self) -> StatusCode {
        match self {
            AuthErrorCode::Unauthorized => StatusCode::FORBIDDEN,
            _ => StatusCode::UNAUTHORIZED,
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Authentication token missing")]
    MissingToken,

    #[error("Authentication token expired")]
    ExpiredToken,

    #[error("Invalid token signature")]
    InvalidSignature,

    #[error("Invalid authentication token: {0}")]
    InvalidToken(String),

    #[error("Unauthorized: insufficient permissions")]
    Unauthorized(String),

    #[error("Authentication required")]
    AuthenticationRequired,

    #[error("Rate limit exceeded")]
    RateLimitExceeded,
}

impl AuthError {
    pub fn code(&self) -> AuthErrorCode {
        match self {
            AuthError::MissingToken => AuthErrorCode::TokenMissing,
            AuthError::ExpiredToken => AuthErrorCode::TokenExpired,
            AuthError::InvalidSignature => AuthErrorCode::SignatureInvalid,
            AuthError::InvalidToken(_) => AuthErrorCode::TokenInvalid,
            AuthError::Unauthorized(_) => AuthErrorCode::Unauthorized,
            AuthError::AuthenticationRequired => AuthErrorCode::AuthenticationRequired,
            AuthError::RateLimitExceeded => AuthErrorCode::RateLimitExceeded,
        }
    }
}

impl ResponseError for AuthError {
    fn status_code(&self) -> StatusCode {
        self.code().http_status()
    }

    fn error_response(&self) -> HttpResponse {
        let code = self.code();
        HttpResponse::build(code.http_status()).json(serde_json::json!({
            "success": false,
            "code": code.as_str(),
            "error": self.to_string()
        }))
    }
}
