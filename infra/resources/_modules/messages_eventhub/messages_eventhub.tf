resource "azurerm_eventhub" "messages-evh" {
  name                = var.eventhub_name
  namespace_name      = local.eventhub_namespace_name
  resource_group_name = local.eventhub_resource_group_name
  partition_count     = local.eventhub_partition_count
  message_retention   = local.eventhub_message_retention
}

resource "azurerm_eventhub_authorization_rule" "messages_authorization_rule" {
  name                = local.eventhub_auth_messages_key.name
  namespace_name      = local.eventhub_namespace_name
  eventhub_name       = var.eventhub_name
  resource_group_name = local.eventhub_resource_group_name

  listen = local.eventhub_auth_messages_key.listen
  send   = local.eventhub_auth_messages_key.send
  manage = local.eventhub_auth_messages_key.manage
}


resource "azurerm_eventhub_authorization_rule" "pdnd_authorization_rule" {
  name                = local.eventhub_auth_pdnd_key.name
  namespace_name      = local.eventhub_namespace_name
  eventhub_name       = var.eventhub_name
  resource_group_name = local.eventhub_resource_group_name

  listen = local.eventhub_auth_pdnd_key.listen
  send   = local.eventhub_auth_pdnd_key.send
  manage = local.eventhub_auth_pdnd_key.manage
}
