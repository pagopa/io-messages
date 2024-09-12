module "function_app_messages_citizen" {
  source = "github.com/pagopa/dx//infra/modules/azure_function_app?ref=f339355788f12e5e4719159dca45d7c0b5c0c537"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "citizen"
    instance_number = var.instance_number
  }

  resource_group_name = var.resource_group_name
  health_check_path   = "/api/v1/info"
  node_version        = 20

  subnet_cidr                          = var.cidr_subnet_messages_citizen_func
  subnet_pep_id                        = var.private_endpoint_subnet_id
  private_dns_zone_resource_group_name = var.private_dns_zone_resource_group_name

  virtual_network = {
    name                = var.virtual_network.name
    resource_group_name = var.virtual_network.resource_group_name
  }

  app_settings      = local.messages_citizen.app_settings
  slot_app_settings = local.messages_citizen.app_settings

  tags = var.tags
}

# NAT Gateway

resource "azurerm_subnet_nat_gateway_association" "functions_messages_citizen_subnet" {
  subnet_id      = module.function_app_messages_citizen.subnet.id
  nat_gateway_id = var.nat_gateway_id
}