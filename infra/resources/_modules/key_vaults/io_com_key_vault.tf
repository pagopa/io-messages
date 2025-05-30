resource "azurerm_key_vault" "com" {
  name                     = "io-p-itn-com-kv"
  location                 = var.location
  resource_group_name      = var.resource_group_name
  tenant_id                = var.tenant_id
  purge_protection_enabled = false

  tags = var.tags

  sku_name = "standard"

  enable_rbac_authorization = true

}
