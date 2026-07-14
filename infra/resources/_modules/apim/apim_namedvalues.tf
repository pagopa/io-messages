resource "azurerm_api_management_named_value" "io_p_itn_com_rc_func_key" {
  name                = "io-p-itn-com-rc-func-key"
  display_name        = "io-p-itn-com-rc-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value_from_key_vault {
    secret_id = "${local.key_vault.vault_uri}secrets/rc-func-key"
  }
  secret = "true"
}

resource "azurerm_api_management_named_value" "io_p_itn_com_services_func_key" {
  name                = "io-p-itn-com-services-func-key"
  display_name        = "io-p-itn-com-services-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value_from_key_vault {
    secret_id = "${local.key_vault.vault_uri}secrets/services-func-key"
  }
  secret = "true"
}

resource "azurerm_api_management_named_value" "io-p-itn-com-pushnotif-func-key" {
  name                = "io-p-itn-com-pushnotif-func-key"
  display_name        = "io-p-itn-com-pushnotif-func-key"
  api_management_name = data.azurerm_api_management.apim_itn_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_api.resource_group_name
  value_from_key_vault {
    secret_id = "${local.key_vault.vault_uri}secrets/pushnotif-func-key"
  }
  secret = "true"
}

resource "azurerm_api_management_named_value" "app_backend_key" {
  name                = "io-communications-app-backend-key"
  api_management_name = data.azurerm_api_management.apim_itn_platform_api.name
  resource_group_name = data.azurerm_api_management.apim_itn_platform_api.resource_group_name
  display_name        = "io-communications-app-backend-key"
  value_from_key_vault {
    secret_id = "${local.key_vault.vault_uri}secrets/appbackend-APP-BACKEND-PRIMARY-KEY"
  }

  secret = true
}
