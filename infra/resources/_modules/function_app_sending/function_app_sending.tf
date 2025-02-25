data "azurerm_nat_gateway" "nat_gateway" {
  name                = "io-p-itn-ng-01"
  resource_group_name = "io-p-itn-common-rg-01"
}

module "function_app_messages_sending" {
  source  = "pagopa/dx-azure-function-app/azurerm"
  version = "~>0"

  environment = {
    prefix          = var.prefix
    env_short       = var.env_short
    location        = var.location
    domain          = var.domain
    app_name        = "sending"
    instance_number = "01"
  }

  tier = "xl"

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

  application_insights_connection_string   = var.ai_connection_string
  application_insights_sampling_percentage = var.ai_sampling_percentage

  tags = var.tags

  action_group_id = var.action_group_id
}

resource "azurerm_subnet_nat_gateway_association" "net_gateway_association_subnet" {
  nat_gateway_id = data.azurerm_nat_gateway.nat_gateway.id
  subnet_id      = module.function_app_messages_sending.subnet.id
}

resource "azurerm_role_assignment" "sending_cosmosdb_api" {
  for_each = toset([
    module.function_app_messages_sending.function_app.function_app.principal_id,
    module.function_app_messages_sending.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_api.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "cosmosdb_api" {
  for_each = toset([
    module.function_app_messages_sending.function_app.function_app.principal_id,
    module.function_app_messages_sending.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_api.resource_group_name
  account_name        = var.cosmosdb_api.name
  scope               = var.cosmosdb_api.id
  role_definition_id  = "${var.cosmosdb_api.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}

resource "azurerm_role_assignment" "sending_cosmosdb_com" {
  for_each = toset([
    module.function_app_messages_sending.function_app.function_app.principal_id,
    module.function_app_messages_sending.function_app.function_app.slot.principal_id
  ])
  scope                = var.cosmosdb_com.id
  role_definition_name = "SQL DB Contributor"
  principal_id         = each.value
}

resource "azurerm_cosmosdb_sql_role_assignment" "cosmosdb_com" {
  for_each = toset([
    module.function_app_messages_sending.function_app.function_app.principal_id,
    module.function_app_messages_sending.function_app.function_app.slot.principal_id
  ])
  resource_group_name = var.cosmosdb_com.resource_group_name
  account_name        = var.cosmosdb_com.name
  scope               = var.cosmosdb_com.id
  role_definition_id  = "${var.cosmosdb_com.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002"
  principal_id        = each.value
}
