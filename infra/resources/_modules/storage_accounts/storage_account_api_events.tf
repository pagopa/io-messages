module "storage_api_events" {
  source = "github.com/pagopa/terraform-azurerm-v4//storage_account?ref=v1.2.1"

  name                            = replace(try(local.nonstandard[var.location_short].api_events, "${var.project}apieventsst01"), "-", "")
  account_kind                    = "StorageV2"
  account_tier                    = "Standard"
  access_tier                     = "Hot"
  account_replication_type        = "GZRS"
  resource_group_name             = var.legacy_resource_group_name
  location                        = var.location
  allow_nested_items_to_be_public = false
  public_network_access_enabled   = true

  advanced_threat_protection    = false
  enable_low_availability_alert = false

  blob_versioning_enabled = true

  tags = var.tags
}

resource "azurerm_storage_queue" "events" {
  name                 = "events"
  storage_account_name = module.storage_api_events.name
}

