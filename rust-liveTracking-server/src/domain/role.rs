use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Role {
    Driver,
    Rider,
}

impl Role {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Driver => "driver",
            Self::Rider => "rider",
        }
    }
}

impl TryFrom<&str> for Role {
    type Error = String;

    fn try_from(value: &str) -> Result<Self, Self::Error> {
        match value.trim().to_ascii_lowercase().as_str() {
            "driver" => Ok(Self::Driver),
            "rider" => Ok(Self::Rider),
            _ => Err(format!("unsupported role: {value}")),
        }
    }
}
