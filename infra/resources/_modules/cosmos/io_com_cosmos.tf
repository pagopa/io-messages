module "io_com_cosmos_account" {
  source = "github.com/pagopa/dx//infra/modules/azure_cosmos_account?ref=79b311a72bed34867e6ea9dff9495a44b5419afc"

  subnet_pep_id = var.subnet_pep_id

  alerts = {
    enabled         = true
    action_group_id = var.action_group_id
    thresholds = {
      provisioned_throughput_exceeded = 1000
    }
  }

  environment = var.environment

  tags = var.tags

  consistency_policy = {
    consistency_preset = "Default"
  }

  resource_group_name = var.resource_group
}

module "cosmosdb_sql_database_data_lake" {
  source              = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_database?ref=v8.77.0"
  name                = "data-lake"
  resource_group_name = var.resource_group
  account_name        = module.io_com_cosmos_account.name
}

module "cosmosdb_sql_database_remote_content" {
  source              = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_database?ref=v8.77.0"
  name                = "remote-content"
  resource_group_name = var.resource_group
  account_name        = module.io_com_cosmos_account.name
}

module "cosmosdb_sql_container_messages_summary" {
  source              = "git::https://github.com/pagopa/terraform-azurerm-v3.git//cosmosdb_sql_container?ref=v8.77.0"
  name                = "messages-summary"
  account_name        = module.io_com_cosmos_account.name
  database_name       = module.cosmosdb_sql_database_data_lake.name
  resource_group_name = var.resource_group
}

module "cosmosdb_sql_container_message_configuration" {
  source              = "git::https://github.com/pagopa/terraform-azurerm-v3.git//cosmosdb_sql_container?ref=v8.77.0"
  name                = "message-configuration"
  account_name        = module.io_com_cosmos_account.name
  database_name       = module.cosmosdb_sql_database_remote_content.name
  resource_group_name = var.resource_group
}

module "cosmosdb_sql_container_user_configuration" {
  source              = "git::https://github.com/pagopa/terraform-azurerm-v3.git//cosmosdb_sql_container?ref=v8.77.0"
  name                = "user-configuration"
  account_name        = module.io_com_cosmos_account.name
  database_name       = module.cosmosdb_sql_database_remote_content.name
  resource_group_name = var.resource_group
}

module "cosmosdb_sql_container_remote_content_lease" {
  source              = "git::https://github.com/pagopa/terraform-azurerm-v3.git//cosmosdb_sql_container?ref=v8.77.0"
  name                = "remote-content-lease"
  account_name        = module.io_com_cosmos_account.name
  database_name       = module.cosmosdb_sql_database_remote_content.name
  resource_group_name = var.resource_group
}
