module "mongo" {
  source = "../_modules/mongo"

  project_legacy      = local.project_legacy
  resource_group_name = azurerm_resource_group.itn_com.name

  key_vault_id = module.key_vaults.com.id

  tags = local.tags
}
