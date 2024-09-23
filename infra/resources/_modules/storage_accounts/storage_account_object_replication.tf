resource "azurerm_storage_object_replication" "api_replica" {

  source_storage_account_id      = module.storage_api.id
  destination_storage_account_id = module.storage_api_replica.id

  rules {
    source_container_name      = azurerm_storage_container.message_content.name
    destination_container_name = azurerm_storage_container.message_content.name
    copy_blobs_created_after   = "Everything"
  }
}
