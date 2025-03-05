module "comsosdb_sql_container_messages_ingestion_test_lease" {
  source = "github.com/pagopa/terraform-azurerm-v4//cosmosdb_sql_container?ref=v1.2.1"

  name                = "dataplan-ingestion-lease"
  resource_group_name = var.cosmosdb_account.resource_group_name

  account_name  = var.cosmosdb_account.name
  database_name = "db"

  throughput = 800

  partition_key_paths = ["/id"]
  default_ttl         = "-1"
}
