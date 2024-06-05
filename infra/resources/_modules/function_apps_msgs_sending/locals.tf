locals {
  messages_sending = {
    app_settings = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      WEBSITE_DNS_SERVER             = "168.63.129.16"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"
      
      # MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = data.azurerm_storage_account.storage_api.primary_connection_string
      MESSAGE_STORAGE_ACCOUNT_URI = var.message_storage_account_blob_uri
      MESSAGE_CONTAINER_NAME = "message-content"

      BACKEND_BASE_URL = "https://io-p-app-appbackendli.azurewebsites.net"
      BACKEND_TOKEN    = var.appbackendli_token

      # QueueStorageConnection                       = data.azurerm_storage_account.services_storage.primary_connection_string
      # NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING = data.azurerm_storage_account.push_notifications_storage.primary_connection_string
      NOTIFICATION_STORAGE_ACCOUNT_URI             = var.notification_storage_account_queue_uri
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      COSMOSDB_NAME              = "db"
      COSMOSDB_URI               = var.cosmos_db_api_endpoint
      # COSMOSDB_KEY               = data.azurerm_cosmosdb_account.cosmos_api.primary_key
      # COSMOSDB_CONNECTION_STRING = format("AccountEndpoint=%s;AccountKey=%s;", data.azurerm_cosmosdb_account.cosmos_api.endpoint, data.azurerm_cosmosdb_account.cosmos_api.primary_key)

      REMOTE_CONTENT_COSMOSDB_URI               = var.cosmos_db_remote_content_endpoint
      # REMOTE_CONTENT_COSMOSDB_KEY               = data.azurerm_cosmosdb_account.cosmos_remote_content.primary_key
      REMOTE_CONTENT_COSMOSDB_NAME              = "remote-content"
      # REMOTE_CONTENT_COSMOSDB_CONNECTION_STRING = format("AccountEndpoint=%s;AccountKey=%s;", data.azurerm_cosmosdb_account.cosmos_remote_content.endpoint, data.azurerm_cosmosdb_account.cosmos_remote_content.primary_key)

      MESSAGE_CONFIGURATION_CHANGE_FEED_LEASE_PREFIX = "RemoteContentMessageConfigurationChangeFeed-00"
      MESSAGE_CONFIGURATION_CHANGE_FEED_START_TIME   = "0"

      // REDIS
      # REDIS_URL      = data.azurerm_redis_cache.redis_messages.hostname
      # REDIS_PORT     = data.azurerm_redis_cache.redis_messages.ssl_port
      # REDIS_PASSWORD = data.azurerm_redis_cache.redis_messages.primary_access_key

      INTERNAL_USER_ID           = var.internal_user_id
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
