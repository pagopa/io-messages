output "messages_error_table_storage_account" {
  value = {
    id = azurerm_storage_table.messages_ingestion_error.id
  }
}
