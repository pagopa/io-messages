locals {
  messages_sending = {
    app_settings = {
      FUNCTIONS_WORKER_RUNTIME       = "node"
      WEBSITE_RUN_FROM_PACKAGE       = "1"
      WEBSITE_DNS_SERVER             = "168.63.129.16"
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"
      
      MESSAGE_STORAGE_ACCOUNT_URI = var.message_storage_account_blob_uri
      MESSAGE_CONTAINER_NAME = "message-content"

      BACKEND_BASE_URL = "https://io-p-app-appbackendli.azurewebsites.net"
      BACKEND_TOKEN    = var.appbackendli_token

      NOTIFICATION_STORAGE_ACCOUNT_URI             = var.notification_storage_account_queue_uri
      NOTIFICATION_QUEUE_NAME                      = "push-notifications"

      COSMOSDB_NAME              = "db"
      COSMOSDB_URI               = var.cosmos_db_api_endpoint

      REMOTE_CONTENT_COSMOSDB_URI               = var.cosmos_db_remote_content_endpoint
      REMOTE_CONTENT_COSMOSDB_NAME              = "remote-content"

      // REDIS
      REDIS_URL      = "dummy"
      REDIS_PORT     = "dummy"
      REDIS_PASSWORD = "dummy"

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
