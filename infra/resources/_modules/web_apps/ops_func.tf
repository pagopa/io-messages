locals {
  app_settings = {
    COSMOS_URI                       = var.cosmosdb_account_api.endpoint,
    COSMOS_DATABASE_NAME             = var.cosmosdb_account_api.name,
    COMMON_STORAGE_ACCOUNT_URL       = var.message_content_storage.endpoint,
    STORAGE_ACCOUNT__serviceUri      = var.com_st_uri
    STORAGE_ACCOUNT__queueServiceUri = var.com_st_queue_uri
  }
}

# TODO: this function should be updated to use container app when the terraform
# provider supports it
module "ops_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 0.0"

  # for cost purposes we use the same plan of the etl function app till we can
  # use container app
  app_service_plan_id = module.etl_func.function_app.plan.id

  environment = merge(var.environment, {
    app_name        = "ops",
    instance_number = "01"
  })

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = var.application_insights_sampling_percentage

  tier = "s"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings      = local.app_settings
  slot_app_settings = local.app_settings

  sticky_app_setting_names = ["NODE_ENV"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.ops_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_role_assignment" "message_content_container_contributor_app" {
  scope                = "${var.messages_storage_account.id}/blobServices/default/containers/${var.messages_content_container.name}"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.ops_func.function_app.function_app.principal_id
}

resource "azurerm_role_assignment" "message_content_container_contributor_slot" {
  scope                = "${var.messages_storage_account.id}/blobServices/default/containers/${var.messages_content_container.name}"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = module.ops_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "ops_func_slot" {
  for_each             = toset(["Storage Blob Data Owner", "Storage Queue Data Contributor", "Storage Queue Data Message Processor", "Storage Queue Data Message Sender"])
  scope                = var.com_st_id
  role_definition_name = each.key
  principal_id         = module.ops_func.function_app.function_app.slot.principal_id
}

resource "azurerm_role_assignment" "ops_func" {
  for_each             = toset(["Storage Blob Data Owner", "Storage Queue Data Contributor", "Storage Queue Data Message Processor", "Storage Queue Data Message Sender"])
  scope                = var.com_st_id
  role_definition_name = each.key
  principal_id         = module.ops_func.function_app.function_app.principal_id
}

resource "azurerm_cosmosdb_sql_role_assignment" "ops_func" {
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.ops_func.function_app.function_app.principal_id
  scope               = var.cosmosdb_account_api.id
}

resource "azurerm_cosmosdb_sql_role_assignment" "ops_func_slot" {
  resource_group_name = var.cosmosdb_account_api.resource_group_name
  account_name        = var.cosmosdb_account_api.name
  role_definition_id  = "${var.cosmosdb_account_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = module.ops_func.function_app.function_app.slot.principal_id
  scope               = var.cosmosdb_account_api.id
}
