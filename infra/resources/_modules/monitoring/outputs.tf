output "action_group" {
  value = {
    io_com_error_id = resource.azurerm_monitor_action_group.io_com_error.id
  }
}