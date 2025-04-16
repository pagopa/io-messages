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
  storage_account_name  = module.com_st.name
  container_access_type = "private"
}

resource "azurerm_storage_table" "messages_ingestion_error" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "delete_messages" {
  name                 = "delete-messages"
  storage_account_name = module.com_st.name
}
