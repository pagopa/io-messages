module "storage_api" {
  source = "github.com/pagopa/terraform-azurerm-v3//storage_account?ref=v8.27.0"

  name                             = replace(try(local.nonstandard[var.location_short].api, "${var.project}apist01"), "-", "")
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


module "CES-484-migrate-iopstapi" {
  source = "github.com/pagopa/dx//infra/modules/azure_storage_account?ref=main"

  environment                          = local.itn_environment
  resource_group_name                  = var.resource_group_name
  tier                                 = "l"
  subnet_pep_id                        = data.azurerm_subnet.subnet_pep_itn.id
  private_dns_zone_resource_group_name = "${local.prefix}-${local.env_short}-rg-common"
  subservices_enabled = {
    blob  = true
    file  = true
    queue = true
    table = true
  }


  force_public_network_access_enabled = false

  blob_features = {
    immutability_policy = {
      enabled                       = true
      allow_protected_append_writes = true
      period_since_creation_in_days = 730
    }
    delete_retention_days = 7
    versioning            = true
    last_access_time      = true
    change_feed = {
      enabled           = true
      retention_in_days = 30
    }
  }

  # network_rules = {
  #   default_action             = "Allow"
  #   bypass                     = ["AzureServices"]
  #   ip_rules                   = ["10.0.130.0/24", "10.0.122.0/24", "10.0.121.0/24", "10.0.123.0/24", "10.0.111.0/24", "10.0.109.0/24", "10.0.108.0/24"]
  #   virtual_network_subnet_ids = [azurerm_subnet.example.id]
  # }

  action_group_id = var.error_action_group_id
  tags            = var.tags
}
