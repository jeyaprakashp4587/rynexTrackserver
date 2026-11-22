use std::time::Instant;

#[derive(Debug, Clone)]
pub struct RateLimiter {
    rate_per_sec: f64,
    burst_capacity: f64,
    tokens: f64,
    last_update: Instant,
}

impl RateLimiter {
    pub fn new(rate_per_sec: u32, burst_capacity: u32) -> Self {
        let rate = (rate_per_sec.max(1)) as f64;
        let burst = (burst_capacity.max(rate_per_sec)) as f64;
        Self {
            rate_per_sec: rate,
            burst_capacity: burst,
            tokens: burst,
            last_update: Instant::now(),
        }
    }

    pub fn check_and_consume(&mut self) -> bool {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_update).as_secs_f64();
        self.last_update = now;

        self.tokens = (self.tokens + elapsed * self.rate_per_sec).min(self.burst_capacity);

        if self.tokens >= 1.0 {
            self.tokens -= 1.0;
            true
        } else {
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rate_limiter_burst_and_exhaustion() {
        let mut limiter = RateLimiter::new(5, 5);
        for _ in 0..5 {
            assert!(limiter.check_and_consume());
        }
        // Sixth immediate request should be rejected
        assert!(!limiter.check_and_consume());
    }
}
