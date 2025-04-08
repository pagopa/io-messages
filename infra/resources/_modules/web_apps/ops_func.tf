locals {
  app_settings = {
    COSMOS_URI                  = var.cosmosdb_account_api.endpoint,
    COSMOS_DATABASE_NAME        = var.cosmosdb_account_api.name,
    COMMON_STORAGE_ACCOUNT_URL  = var.message_content_storage.endpoint,
    STORAGE_ACCOUNT__serviceUri = var.app_settings.message_error_table_storage_uri
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

  subnet_cidr   = var.subnet_cidrs.etl_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}
