module "storage_api" {
  source = "github.com/pagopa/terraform-azurerm-v4//storage_account?ref=v1.2.1"

  name                             = replace(try(local.nonstandard[var.location_short].api, "${var.project}apist01"), "-", "")
  account_kind                     = "StorageV2"
  account_tier                     = "Standard"
  access_tier                      = "Hot"
  account_replication_type         = "GZRS"
  resource_group_name              = var.legacy_resource_group_name
  location                         = var.location
  advanced_threat_protection       = true
  use_legacy_defender_version      = false
  allow_nested_items_to_be_public  = false
  cross_tenant_replication_enabled = true
  public_network_access_enabled    = true

  blob_versioning_enabled              = true
  blob_container_delete_retention_days = 7
  blob_delete_retention_days           = 7
  blob_change_feed_enabled             = true
  blob_change_feed_retention_in_days   = 10
  blob_storage_policy = {
    enable_immutability_policy = false
    blob_restore_policy_days   = 6
  }

  tags = var.tags
}

resource "azurerm_storage_container" "message_content" {
  name                  = "message-content"
  storage_account_name  = module.storage_api.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "cached" {
  name                  = "cached"
  storage_account_name  = module.storage_api.name
  container_access_type = "private"
}

resource "azurerm_storage_table" "subscriptionsfeedbyday" {
  name                 = "SubscriptionsFeedByDay"
  storage_account_name = module.storage_api.name
}

resource "azurerm_storage_table" "faileduserdataprocessing" {
  name                 = "FailedUserDataProcessing"
  storage_account_name = module.storage_api.name
}

resource "azurerm_storage_table" "validationtokens" {
  name                 = "ValidationTokens"
  storage_account_name = module.storage_api.name
}

resource "azurerm_storage_table" "messages-dataplan-ingestion-errors" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.storage_api.name
}

resource "azurerm_storage_table" "message-statuses-dataplan-ingestion-errors" {
  name                 = "MessageStatusesDataplanIngestionErrors"
  storage_account_name = module.storage_api.name
}

