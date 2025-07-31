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

resource "azurerm_api_management_named_value" "session_manager_baseurl" {
  name                = "session-manager-baseurl"
  resource_group_name = data.azurerm_resource_group.internal.name
  api_management_name = local.apim_itn_name
  display_name        = "session-manager-baseurl"
  value               = data.azurerm_linux_web_app.session_manager_app_weu.default_hostname
}

resource "azurerm_api_management_named_value" "session_manager_introspection_url" {
  name                = "session-manager-introspection-url"
  resource_group_name = data.azurerm_resource_group.internal.name
  api_management_name = local.apim_itn_name
  display_name        = "session-manager-introspection-url"
  value               = "/api/v1/user-identity"
}
