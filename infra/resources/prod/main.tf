terraform {

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-messages.resources.tfstate"
    use_azuread_auth     = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

module "redis_messages" {
  source = "github.com/pagopa/terraform-azurerm-v4//redis_cache?ref=v1.2.1"

  name                = "${local.project}-msgs-redis-01"
  resource_group_name = var.legacy_itn_rg_name
  location            = local.location

  capacity              = 2
  family                = "C"
  sku_name              = "Standard"
  redis_version         = "6"
  enable_authentication = true
  zones                 = [1, 2]

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

  tags = local.tags
}

module "functions_messages_sending" {
  source = "../_modules/function_app_sending"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = "msgs"
  resource_group_name = var.legacy_itn_rg_name

  cidr_subnet_messages_sending_func    = "10.20.1.0/24"
  private_endpoint_subnet_id           = data.azurerm_subnet.pep.id
  private_dns_zone_resource_group_name = data.azurerm_resource_group.weu_common.name
  virtual_network = {
    resource_group_name = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
    name                = data.azurerm_virtual_network.vnet_common_itn.name
  }

  ai_connection_string   = data.azurerm_application_insights.common.connection_string
  ai_sampling_percentage = 5

  cosmosdb_api = data.azurerm_cosmosdb_account.cosmos_api
  cosmosdb_com = module.cosmos.io_com_cosmos_account

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  appbackendli_token = data.azurerm_key_vault_secret.appbackendli_token.value

  message_storage_account_blob_connection_string       = data.azurerm_storage_account.storage_api.primary_connection_string
  notification_storage_account_queue_connection_string = data.azurerm_storage_account.storage_push_notifications.primary_connection_string

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value

  tags = local.tags

  action_group_id = module.monitoring.action_group.id
}

module "monitoring" {
  source              = "../_modules/monitoring/"
  location            = local.location
  project             = local.project
  domain              = local.domain
  resource_group_name = azurerm_resource_group.itn_com.name
  io_com_slack_email  = data.azurerm_key_vault_secret.io_com_slack_email.value
}

module "cosmos" {
  source           = "../_modules/cosmos"
  cosmosdb_account = data.azurerm_cosmosdb_account.cosmos_api
  tags             = local.tags
  resource_group   = "io-p-itn-com-rg-01"
  action_group_id  = module.monitoring.action_group.id
  subnet_pep_id    = data.azurerm_subnet.pep.id
  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    app_name        = "com"
    instance_number = "01"
  }
}
