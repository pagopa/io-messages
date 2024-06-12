terraform {

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfappprodio"
    container_name       = "terraform-state"
    key                  = "io-messages.resources.tfstate"
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.106.1"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "itn_messages" {
  name     = "${local.project}-${local.domain}-rg-01"
  location = local.location
}

module "redis_messages" {
  source = "github.com/pagopa/terraform-azurerm-v3//redis_cache?ref=v8.8.0"

  name                = "${local.product}-redis-app-messages-std-v6"
  resource_group_name = azurerm_resource_group.itn_messages.name
  location            = azurerm_resource_group.itn_messages.location

  capacity              = 1
  family                = "P"
  sku_name              = "Premium"
  redis_version         = "6"
  enable_authentication = true
  zones                 = 2

  // when azure can apply patch?
  patch_schedules = [{
    day_of_week    = "Sunday"
    start_hour_utc = 23
    },
    {
      day_of_week    = "Monday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Tuesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Wednesday"
      start_hour_utc = 23
    },
    {
      day_of_week    = "Thursday"
      start_hour_utc = 23
    },
  ]

  private_endpoint = {
    enabled              = true
    subnet_id            = data.azurerm_subnet.pep.id
    virtual_network_id   = data.azurerm_virtual_network.vnet_common_itn.id
    private_dns_zone_ids = [data.azurerm_private_dns_zone.privatelink_redis_cache.id]
  }

  tags = var.tags
}

module "functions_messages_sending" {
  source = "../_modules/function_apps_msgs_sending"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = local.domain
  resource_group_name = azurerm_resource_group.itn_messages.name

  cidr_subnet_messages_sending_func    = "10.20.1.0/24"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  cosmos_db_api_endpoint = data.azurerm_cosmosdb_account.cosmos_api.endpoint
  cosmos_db_api_key      = data.azurerm_cosmosdb_account.cosmos_api.primary_key

  cosmos_db_remote_content_endpoint = data.azurerm_cosmosdb_account.cosmos_remote_content.endpoint
  cosmos_db_remote_content_key      = data.azurerm_cosmosdb_account.cosmos_remote_content.primary_key

  cosmos_database_names = []

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  key_vault_weu_id          = data.azurerm_key_vault.weu.id
  key_vault_weu_messages_id = data.azurerm_key_vault.weu_messages.id

  appbackendli_token = data.azurerm_key_vault_secret.appbackendli_token.value

  message_storage_account_blob_connection_string       = data.azurerm_storage_account.storage_api.primary_blob_endpoint
  notification_storage_account_queue_connection_string = data.azurerm_storage_account.storage_push_notifications.primary_queue_endpoint

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value

  tags = local.tags
}
