resource "azurerm_role_assignment" "remote_content_slot_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = data.azurerm_api_management.apim_itn_api.identity[0].principal_id
}

resource "azurerm_role_assignment" "apim_platform_key_vault_secrets_user" {
  scope                = var.key_vault.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = data.azurerm_api_management.apim_itn_platform_api.identity[0].principal_id
}
