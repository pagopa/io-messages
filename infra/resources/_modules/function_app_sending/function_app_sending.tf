module "function_app_messages_sending" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=f339355788f12e5e4719159dca45d7c0b5c0c537"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "sending"
    instance_number = "01"
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_messages_sending_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  subnet_service_endpoints = {
    web = true
  }

  app_settings      = local.messages_sending.app_settings
  slot_app_settings = local.messages_sending.app_settings

  tags = var.tags
}
