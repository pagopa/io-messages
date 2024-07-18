locals {
  messages_sending = {
    app_settings = {
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // IO COSMOSDB
      COSMOSDB_NAME = "db"
      COSMOSDB_URI  = var.cosmos_db_api_endpoint
      COSMOSDB_KEY  = var.cosmos_db_api_key

      // REMOTE CONTENT COSMOSDB
      REMOTE_CONTENT_COSMOSDB_NAME = "remote-content"
      REMOTE_CONTENT_COSMOSDB_URI  = var.cosmos_db_remote_content_endpoint
      REMOTE_CONTENT_COSMOSDB_KEY  = var.cosmos_db_remote_content_key

      // BLOB STORAGE
      MESSAGE_CONTENT_STORAGE_CONNECTION_STRING = var.message_storage_account_blob_connection_string
      MESSAGE_CONTAINER_NAME                    = "message-content"

      // QUEUE STORAGE
      NOTIFICATION_QUEUE_STORAGE_CONNECTION_STRING = var.notification_storage_account_queue_connection_string
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      // REDIS
      REDIS_URL      = var.redis_url
      REDIS_PORT     = var.redis_port
      REDIS_PASSWORD = var.redis_password

      // BACKEND COMMUNICATION
      BACKEND_BASE_URL = "https://io-p-app-appbackendli.azurewebsites.net"
      BACKEND_TOKEN    = var.appbackendli_token

      // INTERNAL USE PROPERTIES
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
