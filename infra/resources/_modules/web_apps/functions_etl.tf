module "etl_func" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=b7a84bd876d31797ac87daf9cefebd8f6a579c08"

  environment = merge(var.environment, {
    app_name        = "etl",
    instance_number = "01"
  })

  application_insights_connection_string   = var.application_insights.connection_string
  application_insights_sampling_percentage = 5

  tier = "m"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/health"

  app_settings = {
    NODE_ENVIRONMENT = "production",
  }

  sticky_app_setting_names = ["NODE_ENVIRONMENT"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.notif_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags

  action_group_id = var.action_group_id
}

output "function_app_messages_sending" {
  value = {
    id                   = module.etl_func.function_app.function_app.id
    name                 = module.etl_func.function_app.function_app.name
    resource_group_name  = module.etl_func.function_app.resource_group_name
    principal_id         = module.etl_func.function_app.function_app.principal_id
    staging_principal_id = module.etl_func.function_app.function_app.slot.principal_id
  }
}