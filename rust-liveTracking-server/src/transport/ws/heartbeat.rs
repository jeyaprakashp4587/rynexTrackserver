use std::time::{Duration, Instant};

#[derive(Clone, Debug)]
pub struct Heartbeat {
    interval: Duration,
    last_seen: Instant,
}

impl Heartbeat {
    pub fn new(interval: Duration) -> Self {
        Self {
            interval,
            last_seen: Instant::now(),
        }
    }

    pub fn tick(&mut self) -> bool {
        self.last_seen = Instant::now();
        true
    }

    pub fn elapsed(&self) -> Duration {
        self.last_seen.elapsed()
    }

    pub fn interval(&self) -> Duration {
        self.interval
    }
}
