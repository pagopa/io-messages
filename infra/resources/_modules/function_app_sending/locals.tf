locals {
  messages_sending = {
    app_settings = {
      "AzureWebJobs.CosmosRemoteContentMessageConfigurationChangeFeed.Disabled" = "1"

      NODE_ENV = "production"

      // IO COSMOSDB
      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmosdb_api.endpoint

      // REMOTE CONTENT COSMOSDB
      REMOTE_CONTENT_COSMOSDB_NAME             = "remote-content-cosmos-01"
      REMOTE_CONTENT_COSMOSDB__accountEndpoint = var.cosmosdb_com.endpoint
      REMOTE_CONTENT_COSMOSDB_URI              = var.cosmosdb_com.endpoint

      // BLOB STORAGE
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_storage_account_blob_connection_string
      MESSAGE_CONTAINER_NAME                    = "message-content"

      // QUEUE STORAGE
      NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING = var.com_st_connectiostring
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      // REDIS
      REDIS_URL      = var.redis_url
      REDIS_PORT     = var.redis_port
      REDIS_PASSWORD = var.redis_password

      SESSION_MANAGER_API_KEY  = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=session-manager-api-key)",
      SESSION_MANAGER_BASE_URL = var.session_manager_base_url,

      // INTERNAL USE PROPERTIES
      INTERNAL_USER_ID           = "@Microsoft.KeyVault(VaultName=${var.key_vault.name};SecretName=apim-internal-user-id)",
      RC_CONFIGURATION_CACHE_TTL = "28800"

      // Keepalive fields are all optionals
      FETCH_KEEPALIVE_ENABLED             = "true"
      FETCH_KEEPALIVE_SOCKET_ACTIVE_TTL   = "110000"
      FETCH_KEEPALIVE_MAX_SOCKETS         = "40"
      FETCH_KEEPALIVE_MAX_FREE_SOCKETS    = "10"
      FETCH_KEEPALIVE_FREE_SOCKET_TIMEOUT = "30000"
      FETCH_KEEPALIVE_TIMEOUT             = "60000"
    }
  }
}
