module "storage_api_replica" {
  source = "github.com/pagopa/terraform-azurerm-v4//storage_account?ref=v1.2.1"

  name                             = replace(try(local.nonstandard[var.location_short].api_replica, "${var.project}apireplicast01"), "-", "")
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

  network_rules = {
    default_action = "Deny"
    ip_rules       = []
    bypass = [
      "Logging",
      "Metrics",
      "AzureServices",
    ]
    virtual_network_subnet_ids = []
  }

  tags = var.tags
}
