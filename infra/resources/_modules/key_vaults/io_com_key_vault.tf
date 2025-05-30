resource "azurerm_key_vault" "com" {
  name = provider::dx::resource_name({
    prefix          = "io"
    name            = "com",
    domain          = "",
    resource_type   = "key_vault",
    environment     = "p",
    location        = "italynorth"
    instance_number = 1
  })
  location                 = var.location
  resource_group_name      = var.resource_group_name
  tenant_id                = var.tenant_id
  purge_protection_enabled = false

  tags = var.tags

  sku_name = "standard"

  enable_rbac_authorization = true

}
