data "azurerm_key_vault_secret" "sending_func_key" {
  name         = "sending-func-key"
  key_vault_id = local.key_vault.id
}

resource "azurerm_api_management_named_value" "io_p_messages_sending_func_key_itn" {
  name                = "io-p-messages-sending-func-key"
  display_name        = "io-p-messages-sending-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value               = data.azurerm_key_vault_secret.sending_func_key.value
  secret              = "true"
}

data "azurerm_key_vault_secret" "rc_func_key" {
  name         = "rc-func-key"
  key_vault_id = local.key_vault.id
}

resource "azurerm_api_management_named_value" "io_p_itn_com_rc_func_key" {
  name                = "io-p-itn-com-rc-func-key"
  display_name        = "io-p-itn-com-rc-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value               = data.azurerm_key_vault_secret.rc_func_key.value
  secret              = "true"
}
