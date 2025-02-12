module "etl_func" {
  source  = "pagopa/dx-azure-function-app/azurerm"
  version = "~>0"

  environment = merge(var.environment, {
    app_name        = "etl",
    instance_number = "01"
  })

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = var.application_insights_sampling_percentage

  tier = "m"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings      = local.etl_func.app_settings
  slot_app_settings = local.etl_func.app_settings

  sticky_app_setting_names = ["NODE_ENV"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.etl_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_role_assignment" "eventhub_namespace_write" {
  scope                = var.eventhub_namespace.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "message_content_container_read" {
  scope                = "${var.messages_storage_account.id}/blobServices/default/containers/${var.messages_content_container.name}"
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "messages_error_table" {
  for_each             = toset(["Storage Table Data Contributor"])
  scope                = var.messages_error_table_storage_account.id
  role_definition_name = each.key
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "etl_func" {
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.etl_func.function_app.function_app.principal_id
  scope               = var.cosmosdb_account_api.id
}

resource "azurerm_cosmosdb_sql_role_assignment" "io_com_cosmos_etl_func" {
  resource_group_name = var.io_com_cosmos.resource_group_name
  account_name        = var.io_com_cosmos.name
  role_definition_id  = "${var.io_com_cosmos.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.etl_func.function_app.function_app.principal_id
  scope               = var.io_com_cosmos.id
}

resource "azurerm_role_assignment" "key_vault_etl_func_secrets_user" {
  scope                = var.common_key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = module.etl_func.function_app.function_app.principal_id
}

resource "azurerm_key_vault_access_policy" "etl_func_kv_access_policy" {
  key_vault_id = var.common_key_vault.id
  tenant_id    = var.tenant_id
  object_id    = module.etl_func.function_app.function_app.principal_id

  secret_permissions      = ["Get", "List"]
  storage_permissions     = []
  certificate_permissions = []
}

resource "azurerm_redis_cache_access_policy_assignment" "etl_func_redis_access_policy" {
  name               = "etl_func"
  redis_cache_id     = var.redis_cache.id
  access_policy_name = "Data Contributor"
  object_id          = module.etl_func.function_app.function_app.principal_id
  object_id_alias    = "ServicePrincipal"
}

output "etl_func" {
  value = {
    id                   = module.etl_func.function_app.function_app.id
    name                 = module.etl_func.function_app.function_app.name
    resource_group_name  = module.etl_func.function_app.resource_group_name
    principal_id         = module.etl_func.function_app.function_app.principal_id
    staging_principal_id = module.etl_func.function_app.function_app.slot.principal_id
  }
}
