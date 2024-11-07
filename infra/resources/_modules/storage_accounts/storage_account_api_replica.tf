module "storage_api_replica" {
  source = "github.com/pagopa/terraform-azurerm-v3//storage_account?ref=v8.27.0"

  name                             = replace(try(local.nonstandard[var.location_short].api_replica, "${var.project}apireplicast01"), "-", "")
  account_kind                     = "StorageV2"
  account_tier                     = "Standard"
  access_tier                      = "Hot"
  account_replication_type         = "GZRS"
  resource_group_name              = var.resource_group_name
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

module "azure_storage_account" {
  source = "github.com/pagopa/dx//infra/modules/azure_storage_account?ref=main"

  environment         = local.itn_environment
  resource_group_name = var.resource_group_name
  access_tier         = "Hot"

  subnet_pep_id                        = data.azurerm_subnet.subnet_pep_itn.id
  private_dns_zone_resource_group_name = "${local.prefix}-${local.env_short}-itn-common-rg-01"

  subservices_enabled = {
    blob  = true
    file  = false
    queue = false
    table = true
  }

  force_public_network_access_enabled = false

  tags = var.tags
}
