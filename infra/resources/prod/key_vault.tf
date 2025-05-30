module "key_valuts" {
  source = "../_modules/key_vaults"

  location            = local.location
  resource_group_name = azurerm_resource_group.itn_com.name

  tags = local.tags

  environment = {
    prefix      = "io"
    location    = local.location
    name        = "com",
    domain      = "",
    environment = "p",
  }

  tenant_id = data.azurerm_client_config.current.tenant_id
}
