use jsonwebtoken::{decode, errors::ErrorKind, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

use super::errors::AuthError;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    #[serde(rename = "userId")]
    pub user_id: String,
    pub role: String,
    pub exp: usize,
    #[serde(default)]
    pub iat: Option<usize>,
    #[serde(default)]
    pub iss: Option<String>,
    #[serde(default)]
    pub aud: Option<String>,
}

impl Claims {
    pub fn is_driver_or_admin(&self) -> bool {
        let role = self.role.trim().to_uppercase();
        role == "DRIVER" || role == "ADMIN"
    }

    pub fn seconds_until_expiration(&self) -> u64 {
        let now = chrono::Utc::now().timestamp() as usize;
        if self.exp > now {
            (self.exp - now) as u64
        } else {
            0
        }
    }
}

pub fn verify_jwt(
    token: &str,
    secret: &str,
    expected_issuer: Option<&str>,
    expected_audience: Option<&str>,
) -> Result<Claims, AuthError> {
    let clean_token = token
        .strip_prefix("Bearer ")
        .or_else(|| token.strip_prefix("bearer "))
        .unwrap_or(token)
        .trim();

    if clean_token.is_empty() {
        return Err(AuthError::MissingToken);
    }

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;

    if let Some(iss) = expected_issuer {
        if !iss.trim().is_empty() {
            validation.set_issuer(&[iss]);
        }
    }

    if let Some(aud) = expected_audience {
        if !aud.trim().is_empty() {
            validation.set_audience(&[aud]);
        }
    }

    let key = DecodingKey::from_secret(secret.as_bytes());

    match decode::<Claims>(clean_token, &key, &validation) {
        Ok(token_data) => {
            if token_data.claims.user_id.trim().is_empty() {
                return Err(AuthError::InvalidToken("Missing userId in token claims".into()));
            }
            Ok(token_data.claims)
        }
        Err(err) => match err.kind() {
            ErrorKind::ExpiredSignature => Err(AuthError::ExpiredToken),
            ErrorKind::InvalidSignature => Err(AuthError::InvalidSignature),
            ErrorKind::InvalidToken => Err(AuthError::InvalidToken("Malformed token".into())),
            ErrorKind::InvalidIssuer => {
                Err(AuthError::InvalidToken("Token issuer validation failed".into()))
            }
            ErrorKind::InvalidAudience => {
                Err(AuthError::InvalidToken("Token audience validation failed".into()))
            }
            _ => Err(AuthError::InvalidToken(err.to_string())),
        },
    }
}

pub fn validate_driver_role(claims: &Claims) -> Result<(), AuthError> {
    if claims.is_driver_or_admin() {
        Ok(())
    } else {
        Err(AuthError::Unauthorized(format!(
            "Role '{}' is not authorized for driver location tracking",
            claims.role
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};

    const SECRET: &str = "test_secret_key_12345";

    #[test]
    fn test_valid_jwt() {
        let claims = Claims {
            user_id: "driver_123".into(),
            role: "DRIVER".into(),
            exp: (chrono::Utc::now().timestamp() + 3600) as usize,
            iat: Some(chrono::Utc::now().timestamp() as usize),
            iss: None,
            aud: None,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        let verified = verify_jwt(&token, SECRET, None, None).unwrap();
        assert_eq!(verified.user_id, "driver_123");
        assert_eq!(verified.role, "DRIVER");
        assert!(validate_driver_role(&verified).is_ok());
    }

    #[test]
    fn test_expired_jwt() {
        let claims = Claims {
            user_id: "driver_123".into(),
            role: "DRIVER".into(),
            exp: (chrono::Utc::now().timestamp() - 100) as usize,
            iat: Some((chrono::Utc::now().timestamp() - 200) as usize),
            iss: None,
            aud: None,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        let result = verify_jwt(&token, SECRET, None, None);
        assert!(matches!(result, Err(AuthError::ExpiredToken)));
    }

    #[test]
    fn test_invalid_signature() {
        let claims = Claims {
            user_id: "driver_123".into(),
            role: "DRIVER".into(),
            exp: (chrono::Utc::now().timestamp() + 3600) as usize,
            iat: None,
            iss: None,
            aud: None,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(b"different_secret"),
        )
        .unwrap();

        let result = verify_jwt(&token, SECRET, None, None);
        assert!(matches!(result, Err(AuthError::InvalidSignature)));
    }

    #[test]
    fn test_unauthorized_role() {
        let claims = Claims {
            user_id: "user_456".into(),
            role: "USER".into(),
            exp: (chrono::Utc::now().timestamp() + 3600) as usize,
            iat: None,
            iss: None,
            aud: None,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(SECRET.as_bytes()),
        )
        .unwrap();

        let verified = verify_jwt(&token, SECRET, None, None).unwrap();
        let role_result = validate_driver_role(&verified);
        assert!(matches!(role_result, Err(AuthError::Unauthorized(_))));
    }
}
