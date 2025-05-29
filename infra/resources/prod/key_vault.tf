module "key_valuts" {
  source = "../_modules/key_vaults"

  location            = "Italy North"
  resource_group_name = azurerm_resource_group.itn_com.name

  tags = local.tags

  tenant_id = data.azurerm_client_config.current.tenant_id
  object_id = data.azurerm_client_config.current.object_id
}
