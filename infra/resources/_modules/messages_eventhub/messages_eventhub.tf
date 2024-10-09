resource "azurerm_eventhub" "messages-evh" {
  name                = local.eventhub_name
  namespace_name      = local.eventhub_namespace_name
  resource_group_name = local.eventhub_resource_group_name
  partition_count     = local.eventhub_partition_count
  message_retention   = local.eventhub_message_retention
}

resource "azurerm_eventhub_authorization_rule" "authorization_rule" {
  for_each = local.eventhub_authorization_rule_keys.key

  name                = each.value.key.name
  namespace_name      = local.eventhub_namespace_name
  eventhub_name       = local.eventhub_name
  resource_group_name = local.eventhub_resource_group_name

  listen = each.value.key.listen
  send   = each.value.key.send
  manage = each.value.key.manage
}
