data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_resource_group" "weu_common" {
  name = "${local.project_legacy}-rg-common"
}

data "azurerm_resource_group" "itn_messages" {
  name = "${local.project}-msgs-rg-01"
}

data "azurerm_resource_group" "itn_common_01" {
  name = "${local.project}-common-rg-01"
}

data "azurerm_resource_group" "weu_sec" {
  name = "${local.project_legacy}-sec-rg"
}

data "azurerm_resource_group" "operations_weu" {
  name = "${local.project_legacy}-rg-operations"
}

data "azurerm_resource_group" "weu_messages_sec" {
  name = "${local.project_legacy}-messages-sec-rg"
}

data "azurerm_resource_group" "notifications_rg" {
  name = format("%s-weu-messages-notifications-rg", local.project_legacy)
}

data "azurerm_resource_group" "internal_rg" {
  name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_resource_group" "evt-rg" {
  name = "${local.prefix}-${local.env_short}-evt-rg"
}

### TODO: THIS weu_common KEY VAULT HAS TO BE DISMISSED IN FAVOUR OF weu_messages ###
data "azurerm_key_vault" "weu_common" {
  name                = "${local.project_legacy}-kv-common"
  resource_group_name = data.azurerm_resource_group.weu_common.name
}

data "azurerm_key_vault" "weu_messages" {
  name                = "${local.project_legacy}-messages-kv"
  resource_group_name = data.azurerm_resource_group.weu_messages_sec.name
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

data "azurerm_key_vault_secret" "appbackendli_token" {
  name         = "appbackendli-token"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_key_vault_secret" "io_com_slack_email" {
  name         = "alert-slack-channel-email"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_key_vault_secret" "internal_user" {
  name         = "internal-user-id-to-skip"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_key_vault_secret" "fn_messages_APP_MESSAGES_BETA_FISCAL_CODES" {
  name         = "BETA-FISCAL-CODES"
  key_vault_id = data.azurerm_key_vault.weu_messages.id
}

data "azurerm_cosmosdb_account" "io_com_cosmos" {
  name                = format("io-p-itn-com-cosno-01")
  resource_group_name = "io-p-itn-com-rg-01"
}

data "azurerm_cosmosdb_account" "cosmos_api" {
  name                = format("%s-cosmos-api", local.project_legacy)
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_storage_account" "storage_api" {
  name                = replace("${local.project_legacy}stapi", "-", "")
  resource_group_name = format("%s-rg-internal", local.project_legacy)
}

data "azurerm_storage_account" "storage_api_com" {
  name                = module.storage_api_weu.com_st_name
  resource_group_name = module.storage_api_weu.com_st_rg
}

data "azurerm_storage_container" "messages_content_container" {
  name                 = "message-content"
  storage_account_name = data.azurerm_storage_account.storage_api.name
}

data "azurerm_storage_account" "storage_push_notifications" {
  name                = replace(format("%s-weu-messages-notifst", local.project_legacy), "-", "")
  resource_group_name = data.azurerm_resource_group.notifications_rg.name
}

data "azurerm_storage_account" "iopstexportdata" {
  name                = "iopstexportdata"
  resource_group_name = data.azurerm_resource_group.operations_weu.name
}

data "azurerm_monitor_action_group" "io_com_action_group" {
  resource_group_name = "${local.project}-com-rg-01"
  name                = "${local.project_legacy}-com-error-ag-01"
}

data "azurerm_user_assigned_identity" "infra_ci_01" {
  name                = "${local.project}-msgs-infra-github-ci-id-01"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
}

data "azurerm_user_assigned_identity" "infra_cd_01" {
  name                = "${local.project}-msgs-infra-github-cd-id-01"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
}

data "azurerm_user_assigned_identity" "app_cd_01" {
  name                = "${local.project}-msgs-app-github-cd-id-01"
  resource_group_name = data.azurerm_resource_group.itn_messages.name
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

data "azurerm_container_registry" "acr" {
  name                = "iopcommonacr"
  resource_group_name = "io-p-container-registry-rg"
}
