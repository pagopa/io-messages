locals {
  notif_func = {
    common_app_settings = {
    }
  }
}

module "admin_func" {
  source = "git::https://github.com/pagopa/dx.git//infra/modules/azure_function_app?ref=main"

  environment = merge(var.environment, {
    app_name        = "notif",
    instance_number = "01"
  })

  tier = "test"

  resource_group_name                  = var.resource_group_name
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  health_check_path = "/api/health"

  app_settings = merge(local.notif_func.common_app_settings, {
    NODE_ENVIRONMENT = "production"
  })

  slot_app_settings = merge(local.notif_func.common_app_settings, {
    NODE_ENVIRONMENT = "staging"
  })

  sticky_app_setting_names = ["NODE_ENVIRONMENT"]

  virtual_network = var.virtual_network

  subnet_cidr   = var.subnet_cidrs.notif_func
  subnet_pep_id = var.subnet_pep_id

  tags = var.tags
}
