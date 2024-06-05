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

  cosmos_db_api_endpoint            = data.azurerm_cosmosdb_account.cosmos_api.endpoint
  cosmos_db_remote_content_endpoint = data.azurerm_cosmosdb_account.cosmos_remote_content.endpoint
  cosmos_database_names             = []

  key_vault_weu_id          = data.azurerm_key_vault.weu.id
  key_vault_weu_messages_id = data.azurerm_key_vault.weu_messages.id

  appbackendli_token = data.azurerm_key_vault_secret.appbackendli_token.value

  message_storage_account_blob_uri       = data.azurerm_storage_account.storage_api.primary_blob_endpoint
  notification_storage_account_queue_uri = data.azurerm_storage_account.storage_push_notifications.primary_queue_endpoint

  internal_user_id = data.azurerm_key_vault_secret.internal_user.value

  tags = local.tags
}
