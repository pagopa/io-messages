data "azurerm_api_management" "apim_itn_api" {
  name                = local.apim_itn_name
  resource_group_name = local.apim_itn_resource_group_name
}

data "azurerm_key_vault_secret" "services_func_key" {
  name         = "services-func-key"
  key_vault_id = local.key_vault.id
}

data "azurerm_key_vault_secret" "pushnotif_func_key" {
  name         = "pushnotif-func-key"
  key_vault_id = local.key_vault.id
}
