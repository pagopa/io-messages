locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  etl_func = {
    app_settings = {
      NODE_ENV                                       = "production",
      FUNCTIONS_WORKER_RUNTIME                       = "node",
      MESSAGE_CONTENT_STORAGE_URI                    = var.message_content_storage.endpoint
      EVENTHUB_CONNECTION_URI                        = var.app_settings.eventhub_connection_uri,
      MESSAGE_CONTENT_CONTAINER_NAME                 = "message-content",
      MESSAGE_EVENTHUB_NAME                          = "io-p-itn-com-etl-messages-evh-01"
      MESSAGE_STATUS_EVENTHUB_NAME                   = "io-p-itn-com-etl-message-status-evh-01"
      PDV_TOKENIZER_API_KEY                          = "@Microsoft.KeyVault(VaultName=${var.common_key_vault.name};SecretName=func-elt-PDV-TOKENIZER-API-KEY)"
      PDV_TOKENIZER_BASE_URL                         = "https://api.tokenizer.pdv.pagopa.it/tokenizer/v1"
      REDIS_PASSWORD                                 = var.redis_cache.access_key
      REDIS_PING_INTERVAL                            = 1000 * 60 * 9
      REDIS_URL                                      = "rediss://${var.redis_cache.hostname}:${var.redis_cache.port}",
      COMMON_COSMOS__accountEndpoint                 = var.cosmosdb_account_api.endpoint
      COMMON_COSMOS_DBNAME                           = "db",
      COMMON_COSMOS_MESSAGES_CONTAINER_NAME          = "messages"
      COMMON_COSMOS_MESSAGE_STATUS_CONTAINER_NAME    = "message-status"
      MESSAGE_ERROR_TABLE_STORAGE_NAME               = "MessagesDataplanIngestionErrors",
      IOCOM_COSMOS__accountEndpoint                  = var.io_com_cosmos.endpoint
      IOCOM_COSMOS_EVENTS_COLLECTOR_DBNAME           = "data-lake-cosmos-01"
      IOCOM_COSMOS_INGESTION_SUMMARY_COLLECTION_NAME = "messages-summary"
      ACCOUNT_STORAGE__tableServiceUri               = var.app_settings.message_error_table_storage_uri
      MESSAGE_STATUS_ERROR_TABLE_STORAGE_NAME        = "MessageStatusesDataplanIngestionErrors",
    }
  }
}
