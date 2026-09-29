use tokio_util::sync::CancellationToken;

pub fn install_shutdown_token() -> CancellationToken {
    let token = CancellationToken::new();
    let clone = token.clone();
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        clone.cancel();
    });
    token
}
