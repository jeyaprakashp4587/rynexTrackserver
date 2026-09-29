#[derive(Clone, Debug, PartialEq, Eq)]
pub enum SubCmd {
    Subscribe(String),
    Unsubscribe(String),
}
