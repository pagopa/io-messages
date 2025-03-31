module "com_st" {
  source  = "pagopa/dx-azure-storage-account/azurerm"
  version = "0.0.9"

  subnet_pep_id       = var.subnet_pep_id
  tags                = var.tags
  tier                = "s"
  environment         = merge(var.environment, { app_name = "com", instance_number = "01" })
  resource_group_name = var.resource_group_name

  subservices_enabled = {
    blob  = false
    file  = false
    queue = true
    table = true
  }
}

resource "azurerm_storage_table" "messages_ingestion_error" {
  name                 = "MessagesDataplanIngestionErrors"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notifications" {
  name                 = "push-notifications"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notif_notifymessage" {
  name                 = "notify-message"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notif_notifymessage_poison" {
  name                 = "${azurerm_storage_queue.push_notif_notifymessage.name}-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_queue" "push_notifications_poison" {
  name                 = "push-notifications-poison"
  storage_account_name = module.com_st.name
}

resource "azurerm_storage_table" "push_notif_betausertests" {
  name                 = "notificationhub"
  storage_account_name = module.com_st.name
}

