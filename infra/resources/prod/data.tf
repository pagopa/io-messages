data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "weu_common" {
  name = "${local.project_legacy}-rg-common"
}

data "azurerm_resource_group" "weu_sec" {
  name = "${local.project_legacy}-sec-rg"
}

data "azurerm_resource_group" "weu_messages_sec" {
  name = "${local.project_legacy}-messages-sec-rg"
}

data "azurerm_resource_group" "notifications_rg" {
  name = format("%s-weu-messages-notifications-rg", local.project_legacy)
}

data "azurerm_key_vault" "weu" {
  name                = "${local.project_legacy}-kv"
  resource_group_name = data.azurerm_resource_group.weu_sec.name
}

data "azurerm_key_vault" "weu_messages" {
  name                = "${local.project_legacy}-messages-kv"
  resource_group_name = data.azurerm_resource_group.weu_messages_sec.name
}

data "azurerm_virtual_network" "vnet_common_itn" {
  name                = "${local.project}-common-vnet-01"
  resource_group_name = "${local.project}-common-rg-01"
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
}

data "azurerm_private_dns_zone" "privatelink_redis_cache" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_application_insights" "common" {
  name                = "${local.project_legacy}-ai-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_key_vault_secret" "appbackendli_token" {
  name         = "appbackendli-token"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_key_vault_secret" "internal_user" {
  name         = "internal-user-id-to-skip"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_cosmosdb_account" "cosmos_api" {
  name                = format("%s-cosmos-api", local.project_legacy)
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_cosmosdb_account" "cosmos_remote_content" {
  name                = "${local.project_legacy}-messages-remote-content"
  resource_group_name = "${local.project_legacy}-messages-data-rg"
}

data "azurerm_storage_account" "storage_api" {
  name                = replace("${local.project_legacy}stapi", "-", "")
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_storage_account" "storage_push_notifications" {
  name                = replace(format("%s-weu-messages-notifst", local.project_legacy), "-", "")
  resource_group_name = data.azurerm_resource_group.notifications_rg.name
}