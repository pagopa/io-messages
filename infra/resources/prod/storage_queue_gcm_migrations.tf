resource "azurerm_storage_queue" "gcm_migrations" {
  name                 = "gcm-migrations"
  storage_account_name = data.azurerm_storage_account.iopstexportdata.name
}
