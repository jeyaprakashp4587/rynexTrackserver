use anyhow::{Context, Result};
use redis::aio::ConnectionManager;

#[derive(Clone)]
pub struct RedisClient {
    client: redis::Client,
    manager: ConnectionManager,
}

impl RedisClient {
    pub async fn new(url: &str) -> Result<Self> {
        let client = redis::Client::open(url).with_context(|| format!("invalid redis url: {url}"))?;
        let manager = ConnectionManager::new(client.clone()).await?;
        Ok(Self { client, manager })
    }

    pub async fn ping(&self) -> Result<()> {
        let mut conn = self.client.get_multiplexed_async_connection().await?;
        let reply: String = redis::cmd("PING").query_async(&mut conn).await?;
        if reply.eq_ignore_ascii_case("pong") {
            Ok(())
        } else {
            anyhow::bail!("redis ping response was not pong: {reply}");
        }
    }

    pub async fn publish(&self, channel: &str, payload: &str) -> Result<()> {
        let mut manager = self.manager.clone();
        let _: i64 = redis::cmd("PUBLISH")
            .arg(channel)
            .arg(payload)
            .query_async(&mut manager)
            .await?;
        Ok(())
    }

    pub async fn set_last_location(&self, trip_id: &str, payload: &str, ttl_secs: u64) -> Result<()> {
        let mut manager = self.manager.clone();
        let _: () = redis::cmd("SET")
            .arg(format!("trip:{trip_id}:last"))
            .arg(payload)
            .arg("EX")
            .arg(ttl_secs)
            .query_async(&mut manager)
            .await?;
        Ok(())
    }

    pub async fn get_last_location(&self, trip_id: &str) -> Result<Option<String>> {
        let mut manager = self.manager.clone();
        let value: Option<String> = redis::cmd("GET")
            .arg(format!("trip:{trip_id}:last"))
            .query_async(&mut manager)
            .await?;
        Ok(value)
    }

    pub async fn get_pubsub(&self) -> Result<redis::aio::PubSub> {
        let pubsub = self.client.get_async_pubsub().await?;
        Ok(pubsub)
    }

    pub fn client(&self) -> &redis::Client {
        &self.client
    }
}
