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

module "functions_messages_sending" {
  source = "../_modules/function_app_sending"

  prefix              = local.prefix
  env_short           = local.env_short
  location            = local.location
  project             = local.project
  domain              = "msgs"
  resource_group_name = data.azurerm_resource_group.itn_messages.name

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
  cosmosdb_com = data.azurerm_cosmosdb_account.io_com_cosmos

  redis_url      = module.redis_messages.hostname
  redis_port     = module.redis_messages.ssl_port
  redis_password = module.redis_messages.primary_access_key

  appbackendli_token       = data.azurerm_key_vault_secret.appbackendli_token.value
  session_manager_base_url = "https://${data.azurerm_linux_function_app.session_manager_internal.default_hostname}"

  message_storage_account_blob_connection_string       = data.azurerm_storage_account.storage_api.primary_connection_string
  notification_storage_account_queue_connection_string = data.azurerm_storage_account.storage_push_notifications.primary_connection_string

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value

  tags = local.tags

  action_group_id        = module.monitoring.action_group.io_com_error_id
  com_st_connectiostring = data.azurerm_storage_account.storage_api_com.primary_connection_string
}
