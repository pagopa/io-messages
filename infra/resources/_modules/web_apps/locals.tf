
locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"
  etl_func = {
    app_settings = {
      NODE_ENV                       = "production",
      FUNCTIONS_WORKER_RUNTIME       = "node",
      MESSAGE_CONTENT_STORAGE_URI    = var.app_settings.message_content_storage_uri
      EVENTHUB_CONNECTION_URI        = var.app_settings.eventhub_connection_uri,
      MESSAGE_CONTENT_CONTAINER_NAME = "message-content",
      MESSAGE_EVENTHUB_NAME          = "io-p-itn-com-etl-messages-evh-01"
      PDV_TOKENIZER_API_KEY          = "@Microsoft.KeyVault(VaultName=${var.common_key_vault.name};SecretName=func-elt-PDV-TOKENIZER-API-KEY)"
      PDV_TOKENIZER_BASE_URL         = "https://api.tokenizer.pdv.pagopa.it/tokenizer/v1"
      REDIS_ACCESS_KEY               = var.redis_cache.access_key
      REDIS_PING_INTERVAL            = 1000 * 60 * 9
      REDIS_URL                      = var.redis_cache.url
      COSMOS__accountEndpoint        = var.cosmosdb_account_api.endpoint
      COSMOS_DBNAME                  = "db",
      COSMOS_MESSAGES_CONTAINER_NAME = "messages-dataplan-ingestion-test"
    }
  }
}
