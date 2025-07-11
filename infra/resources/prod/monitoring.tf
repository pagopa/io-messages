data "azurerm_key_vault_secret" "alert_slack_channel_email" {
  name         = "alert-slack-channel-email"
  key_vault_id = module.key_vaults.com.id
}

module "monitoring" {
  source              = "../_modules/monitoring/"
  location            = local.location
  project             = local.project
  domain              = local.domain
  resource_group_name = azurerm_resource_group.itn_com.name
  io_com_slack_email  = data.azurerm_key_vault_secret.alert_slack_channel_email.value
  appi_id             = data.azurerm_application_insights.common.id
}
