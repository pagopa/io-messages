module "comsosdb_sql_container_messages_ingestion_test" {
  source = "github.com/pagopa/terraform-azurerm-v4//cosmosdb_sql_container?ref=v1.2.1"

  name                = "messages-dataplan-ingestion-test"
  resource_group_name = var.cosmosdb_account.resource_group_name

  account_name  = var.cosmosdb_account.name
  database_name = "db"

  partition_key_paths = ["/fiscalCode"]
  default_ttl         = "-1"
}

module "comsosdb_sql_container_messages_ingestion_test_lease" {
  source = "github.com/pagopa/terraform-azurerm-v4//cosmosdb_sql_container?ref=v1.2.1"

  name                = "messages-dataplan-ingestion-test-lease"
  resource_group_name = var.cosmosdb_account.resource_group_name

  account_name  = var.cosmosdb_account.name
  database_name = "db"

  partition_key_paths = ["/id"]
  default_ttl         = "-1"
}
