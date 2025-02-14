module "dx-azure-storage-account" {
  source  = "pagopa/dx-azure-storage-account/azurerm"
  version = "0.0.9"

  subnet_pep_id       = var.subnet_pep_id
  tags                = var.tags
  tier                = "s"
  environment         = merge(var.environment, { app_name = "com" })
  resource_group_name = var.resource_group_name

  subservices_enabled = {
    blob  = false
    file  = false
    queue = false
    table = true
  }
}

resource "azurerm_storage_table" "messages_ingestion_error" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.dx-azure-storage-account.name
}
