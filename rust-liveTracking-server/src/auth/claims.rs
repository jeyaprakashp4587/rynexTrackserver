use crate::domain::role::Role;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Claims {
    pub sub: String,
    pub role: Role,
    pub exp: u64,
}

impl Claims {
    pub fn new(sub: impl Into<String>, role: Role, exp: u64) -> Self {
        Self {
            sub: sub.into(),
            role,
            exp,
        }
    }
}
