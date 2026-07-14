output "com" {
  value = {
    name      = azurerm_key_vault.com.name
    id        = azurerm_key_vault.com.id
    vault_uri = azurerm_key_vault.com.vault_uri
  }
}
