use std::time::{Duration, Instant};

#[derive(Clone, Debug)]
pub struct RateLimiter {
    window: Duration,
    last_tick: Instant,
    count: usize,
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self {
            window: Duration::from_secs(1),
            last_tick: Instant::now(),
            count: 0,
        }
    }
}

impl RateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn allow(&mut self, limit: usize) -> bool {
        let now = Instant::now();
        if now.duration_since(self.last_tick) >= self.window {
            self.last_tick = now;
            self.count = 0;
        }
        if self.count < limit {
            self.count += 1;
            true
        } else {
            false
        }
    }
}
