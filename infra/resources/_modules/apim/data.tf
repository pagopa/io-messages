data "azurerm_api_management" "apim_itn_api" {
  name                = local.apim_itn_name
  resource_group_name = local.apim_itn_resource_group_name
}

data "azurerm_api_management" "apim_itn_platform_api" {
  name                = local.apim_itn_platform_name
  resource_group_name = local.apim_itn_platform_resource_group_name
}

data "azurerm_key_vault_secret" "services_func_key" {
  name         = "services-func-key"
  key_vault_id = local.key_vault.id
}

data "azurerm_key_vault_secret" "pushnotif_func_key" {
  name         = "pushnotif-func-key"
  key_vault_id = local.key_vault.id
}

data "azurerm_resource_group" "internal" {
  name = "io-p-rg-internal"
}

data "azurerm_linux_web_app" "session_manager_app_weu" {
  name                = "io-p-weu-session-manager-app-03"
  resource_group_name = "io-p-weu-session-manager-rg-01"
}


data "azurerm_key_vault_secret" "app_backend_api_key_secret" {
  name         = "pushnotif-func-key" # TODO: replace with"appbackend-APP-BACKEND-PRIMARY-KEY"
  key_vault_id = local.key_vault.id
}
