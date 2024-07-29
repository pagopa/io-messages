locals {
  messages_citizen = {
    app_settings = {
      FUNCTIONS_WORKER_PROCESS_COUNT = 4
      NODE_ENV                       = "production"

      // APP INSIGHTS
      APPINSIGHTS_INSTRUMENTATIONKEY = var.ai_instrumentation_key
      APPINSIGHTS_CONNECTION_STRING = var.ai_connection_string
      APPINSIGHTS_SAMPLING_PERCENTAGE = var.ai_sampling_percentage

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

      // REDIS
      REDIS_URL      = var.redis_url
      REDIS_PORT     = var.redis_port
      REDIS_PASSWORD = var.redis_password

      // INTERNAL USE PROPERTIES
      PN_SERVICE_ID              = var.pn_service_id
      SERVICE_CACHE_TTL_DURATION = "28800" // 8 hours
      RC_CONFIGURATION_CACHE_TTL = "28800"
      SERVICE_TO_RC_CONFIGURATION_MAP = jsonencode({
        "${var.pn_service_id}"               = var.pn_remote_config_id,
        "${var.io_sign_service_id}"          = var.io_sign_remote_config_id,
        "${var.io_receipt_service_test_id}"  = var.io_receipt_remote_config_test_id,
        "${var.io_receipt_service_id}"       = var.io_receipt_remote_config_id,
        "${var.third_party_mock_service_id}" = var.third_party_mock_remote_config_id
      })

      // MESSAGE VIEW FF
      USE_FALLBACK        = var.use_fallback
      FF_TYPE             = var.ff_type
      FF_BETA_TESTER_LIST = var.ff_beta_tester_list
      FF_CANARY_USERS_REGEX = var.ff_canary_users_regex

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
