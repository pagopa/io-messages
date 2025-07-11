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
    dx = {
      source  = "pagopa-dx/azure"
      version = ">= 0.0.6, < 1.0.0"
    }
  }
}

provider "azurerm" {
  features {}
  storage_use_azuread = true
}

module "functions_messages_sending" {
  source = "../_modules/function_app_sending"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = "msgs"
  resource_group_name = local.legacy_itn_rg_name

  key_vault = module.key_vaults.com

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

  redis_url      = azurerm_redis_cache.com.hostname
  redis_port     = azurerm_redis_cache.com.ssl_port
  redis_password = azurerm_redis_cache.com.primary_access_key

  session_manager_base_url = "https://${data.azurerm_linux_function_app.session_manager_internal.default_hostname}"

  message_storage_account_blob_connection_string = data.azurerm_storage_account.storage_api.primary_connection_string

  tags = local.tags

  action_group_id        = module.monitoring.action_group.id
  com_st_connectiostring = module.storage_api_weu.com_st_connectiostring
}
