module "com_st" {
  source  = "pagopa-dx/azure-storage-account/azurerm"
  version = "0.0.9"

  subnet_pep_id       = var.subnet_pep_id
  tags                = var.tags
  tier                = "s"
  environment         = merge(var.environment, { app_name = "com", instance_number = "01" })
  resource_group_name = var.resource_group_name

  subservices_enabled = {
    blob  = true
    file  = false
    queue = true
    table = true
  }
}

resource "azurerm_storage_container" "operations" {
  name                  = "operations"
  storage_account_id    = module.com_st.name
  container_access_type = "private"
}

resource "azurerm_storage_container" "deleted_messages_logs" {
  name                  = "deleted-messages-logs"
  storage_account_id    = module.com_st.name
  container_access_type = "private"
}

resource "azurerm_storage_container_immutability_policy" "deleted_messages_logs" {
  storage_container_resource_manager_id = azurerm_storage_container.deleted_messages_logs.resource_manager_id
  immutability_period_in_days           = 146000
  protected_append_writes_all_enabled   = true
  protected_append_writes_enabled       = true
}

resource "azurerm_storage_table" "messages_ingestion_error" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "delete_messages" {
  name                 = "delete-messages"
  storage_account_name = module.com_st.name
}
