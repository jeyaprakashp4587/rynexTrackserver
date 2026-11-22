use std::env;

#[derive(Clone, Debug)]
pub struct AuthConfig {
    pub jwt_secret: String,
    pub jwt_issuer: Option<String>,
    pub jwt_audience: Option<String>,
    pub rate_limit_per_sec: u32,
    pub rate_limit_burst: u32,
}

impl AuthConfig {
    pub fn from_env() -> Self {
        let jwt_secret = env::var("JWT_ACCESS_TOKEN_SECRET")
            .or_else(|_| env::var("JWT_SECRET"))
            .unwrap_or_else(|_| "your_jwt_access_token_secret".into());

        let jwt_issuer = env::var("JWT_ISSUER")
            .ok()
            .filter(|s| !s.trim().is_empty());

        let jwt_audience = env::var("JWT_AUDIENCE")
            .ok()
            .filter(|s| !s.trim().is_empty());

        let rate_limit_per_sec = env::var("WS_RATE_LIMIT_PER_SEC")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(15);

        let rate_limit_burst = env::var("WS_RATE_LIMIT_BURST")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(30);

        Self {
            jwt_secret,
            jwt_issuer,
            jwt_audience,
            rate_limit_per_sec,
            rate_limit_burst,
        }
    }
}
