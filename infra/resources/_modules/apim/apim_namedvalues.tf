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

resource "azurerm_api_management_named_value" "io_p_itn_com_services_func_key" {
  name                = "io-p-itn-com-services-func-key"
  display_name        = "io-p-itn-com-services-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value               = data.azurerm_key_vault_secret.services_func_key.value
  secret              = "true"
}

resource "azurerm_api_management_named_value" "io-p-itn-com-pushnotif-func-key" {
  name                = "io-p-itn-com-pushnotif-func-key"
  display_name        = "io-p-itn-com-pushnotif-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value               = data.azurerm_key_vault_secret.pushnotif_func_key.value
  secret              = "true"
}
