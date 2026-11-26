locals {
  messages_func_app_settings = {
    FUNCTIONS_WORKER_RUNTIME = "node"
    NODE_ENV                 = "production"
  }
}

module "messages_func" {
  source  = "pagopa-dx/azure-function-app/azurerm"
  version = "~> 5.0"

  environment = merge(var.environment, {
    app_name        = "messages"
    instance_number = "01"
  })

  # Reassess shared capacity and isolation before adding queue workers.
  app_service_plan_id = module.etl_func.function_app.plan.id
  size                = "P0v3"
  node_version        = 24

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = var.virtual_network
  subnet_id       = module.etl_func.subnet.id
  subnet_pep_id   = var.subnet_pep_id

  health_check_path = "/api/info"
  app_settings      = local.messages_func_app_settings
  slot_app_settings = local.messages_func_app_settings

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = var.application_insights.sampling_percentage
  action_group_ids                         = [var.action_group_id]

  tags = var.tags
}
