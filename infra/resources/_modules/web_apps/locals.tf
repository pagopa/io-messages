
locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  app_settings = {
    NODE_ENVIRONMENT                = "production",
    FUNCTIONS_WORKER_RUNTIME        = "node",
    MESSAGE_CONTENT_STORAGE_URI     = var.etl_app_settings.message_content_storage_uri
    MESSAGE_EVENTHUB_CONNECTION_URI = var.etl_app_settings.message_eventhub_connection_uri,
  }
}
