use std::env;

pub struct Env {
	pub port: u16,
	pub redis_url: String,
	pub jwt_secret: String,
	pub cors_origin: Option<String>,
}

impl Env {
	pub fn from_env() -> Self {
		let port = env::var("PORT").ok().and_then(|s| s.parse().ok()).unwrap_or(8080);
		let redis_url = env::var("REDIS_URL").unwrap_or_else(|_| "redis://127.0.0.1/".into());
		let jwt_secret = env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
		let cors_origin = env::var("CORS_ORIGIN").ok();
		Env { port, redis_url, jwt_secret, cors_origin }
	}
}
