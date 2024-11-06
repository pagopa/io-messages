
locals {
  location_short = var.environment.location == "italynorth" ? "itn" : var.environment.location == "westeurope" ? "weu" : var.environment.location == "germanywestcentral" ? "gwc" : "neu"
  project        = "${var.environment.prefix}-${var.environment.env_short}-${local.location_short}"

  app_settings = {
    NODE_ENVIRONMENT = "production",
    FUNCTIONS_WORKER_RUNTIME : "node",
    MESSAGE_CONTENT_STORAGE_URI : "https://testgiovannist.blob.core.windows.net/",
    MESSAGE_CONTENT_CONTAINER_NAME : "messages",
    MESSAGE_EVENTHUB_CONNECTION_URI : "https://io-d-evh-cdc.servicebus.windows.net",
    MESSAGE_EVENTHUB_NAME : "message-events-test"
  }
}
