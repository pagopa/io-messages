module "comsosdb_sql_container_messages_ingestion_test" {
  source = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_container?ref=v8.28.2"

  name                = "messages-dataplan-ingestion-test"
  resource_group_name = var.cosmosdb_account.resource_group_name

  account_name  = var.cosmosdb_account.name
  database_name = "db"

  partition_key_path = "/fiscalCode"
  default_ttl        = "-1"
}

module "comsosdb_sql_container_messages_ingestion_test_lease" {
  source = "github.com/pagopa/terraform-azurerm-v3//cosmosdb_sql_container?ref=v8.28.2"

  name                = "messages-dataplan-ingestion-test-lease"
  resource_group_name = var.cosmosdb_account.resource_group_name

  account_name  = var.cosmosdb_account.name
  database_name = "db"

  partition_key_path = "/id"
  default_ttl        = "-1"
}
