resource "azurerm_monitor_action_group" "io_com_error" {
  name                = "io-p-com-error-ag-01"
  resource_group_name = var.resource_group_name
  short_name          = "iocom-error"

  email_receiver {
    name                    = "slack"
    email_address           = var.io_com_slack_email
    use_common_alert_schema = true
  }
}
