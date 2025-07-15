data "azurerm_linux_function_app" "session_manager_internal" {
  name                = format("io-p-weu-auth-sm-int-func-01")
  resource_group_name = format("io-p-itn-auth-main-rg-01")
}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "weu_common" {
  name = "${local.project_legacy}-rg-common"
}

data "azurerm_resource_group" "itn_common_01" {
  name = "${local.project}-common-rg-01"
}

data "azurerm_resource_group" "operations_weu" {
  name = "${local.project_legacy}-rg-operations"
}

data "azurerm_resource_group" "internal_rg" {
  name = format("%s-rg-internal", local.project_legacy)
}

### TODO: THIS weu_common KEY VAULT HAS TO BE DISMISSED IN FAVOUR OF weu_messages ###
data "azurerm_key_vault" "weu_common" {
  name                = "${local.project_legacy}-kv-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_virtual_network" "vnet_common_itn" {
  name                = "${local.project}-common-vnet-01"
  resource_group_name = data.azurerm_resource_group.itn_common_01.name
}

data "azurerm_subnet" "pep" {
  name                 = "${local.project}-pep-snet-01"
  virtual_network_name = data.azurerm_virtual_network.vnet_common_itn.name
  resource_group_name  = data.azurerm_virtual_network.vnet_common_itn.resource_group_name
}

data "azurerm_nat_gateway" "itn_ng" {
  name                = "${local.project}-ng-01"
  resource_group_name = data.azurerm_resource_group.itn_common_01.name
}

data "azurerm_private_dns_zone" "privatelink_redis_cache" {
  name                = "privatelink.redis.cache.windows.net"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_application_insights" "common" {
  name                = "${local.project_legacy}-ai-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_log_analytics_workspace" "common" {
  name                = "${local.project_legacy}-law-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_cosmosdb_account" "cosmos_api" {
  name                = format("%s-cosmos-api", local.project_legacy)
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_storage_account" "storage_api" {
  name                = replace("${local.project_legacy}stapi", "-", "")
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_storage_container" "messages_content_container" {
  name                 = "message-content"
  storage_account_name = data.azurerm_storage_account.storage_api.name
}

data "azurerm_user_assigned_identity" "infra_cd_01" {
  name                = "${local.project}-msgs-infra-github-cd-id-01"
  resource_group_name = local.legacy_itn_rg_name
}

data "azurerm_user_assigned_identity" "app_cd_01" {
  name                = "${local.project}-msgs-app-github-cd-id-01"
  resource_group_name = local.legacy_itn_rg_name
}

data "azuread_group" "adgroup_io_admins" {
  display_name = "${local.project_legacy}-adgroup-admin"
}

data "azuread_group" "adgroup_com_admins" {
  display_name = "${local.project_legacy}-adgroup-com-admins"
}

data "azuread_group" "adgroup_com_devs" {
  display_name = "${local.project_legacy}-adgroup-com-developers"
}
