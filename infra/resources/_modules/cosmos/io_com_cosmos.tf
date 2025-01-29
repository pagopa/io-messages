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

resource "azurerm_cosmosdb_sql_database" "data_lake" {
  name                = "data-lake"
  resource_group_name = var.resource_group
  account_name        = module.io_com_cosmos_account.name
}

resource "azurerm_cosmosdb_sql_database" "remote_content" {
  name                = "remote-content"
  resource_group_name = var.resource_group
  account_name        = module.io_com_cosmos_account.name
}

resource "azurerm_cosmosdb_sql_container" "messages_summary" {
  name                = "messages-summary"
  resource_group_name = var.resource_group

  account_name        = module.io_com_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.data_lake.name
  partition_key_paths = ["/year"]
}

resource "azurerm_cosmosdb_sql_container" "message_configuration" {
  name                = "message-configuration"
  resource_group_name = var.resource_group

  account_name        = module.io_com_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.remote_content.name
  partition_key_paths = ["/configurationId"]
}

resource "azurerm_cosmosdb_sql_container" "user_configuration" {
  name                = "user-configuration"
  resource_group_name = var.resource_group

  account_name        = module.io_com_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.remote_content.name
  partition_key_paths = ["/userId"]
}

resource "azurerm_cosmosdb_sql_container" "remote_content_lease" {
  name                = "remote-content-lease"
  resource_group_name = var.resource_group

  account_name        = module.io_com_cosmos_account.name
  database_name       = azurerm_cosmosdb_sql_database.remote_content.name
  partition_key_paths = ["/id"]
}
