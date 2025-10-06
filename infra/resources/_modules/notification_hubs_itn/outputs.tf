output "nh_itn_partition_1" {
  value = {
    id       = azurerm_notification_hub.partition_1.id
    name     = azurerm_notification_hub.partition_1.name
    endpoint = azurerm_notification_hub_authorization_rule.partition_1_default_full.primary_connection_string
    # endpoint = "https://${azurerm_notification_hub.partition_1.namespace_name}.servicebus.windows.net/${azurerm_notification_hub.partition_1.name}/"
  }
}
output "nh_itn_partition_2" {
  value = {
    id       = azurerm_notification_hub.partition_2.id
    name     = azurerm_notification_hub.partition_2.name
    endpoint = azurerm_notification_hub_authorization_rule.partition_2_default_full.primary_connection_string
  }
}
output "nh_itn_partition_3" {
  value = {
    id       = azurerm_notification_hub.partition_3.id
    name     = azurerm_notification_hub.partition_3.name
    endpoint = azurerm_notification_hub_authorization_rule.partition_3_default_full.primary_connection_string
  }
}
output "nh_itn_partition_4" {
  value = {
    id       = azurerm_notification_hub.partition_4.id
    name     = azurerm_notification_hub.partition_4.name
    endpoint = azurerm_notification_hub_authorization_rule.partition_4_default_full.primary_connection_string
  }
}
