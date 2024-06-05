data "azurerm_user_assigned_identity" "identity_prod_ci" {
  name                = "io-p-messages-github-ci-identity"
  resource_group_name = local.identity_resource_group_name
}

data "azurerm_user_assigned_identity" "identity_prod_cd" {
  name                = "io-p-messages-github-cd-identity"
  resource_group_name = local.identity_resource_group_name
}

data "azurerm_key_vault" "messages" {
  name                = "io-p-messages-kv"
  resource_group_name = "io-p-messages-sec-rg"
}

data "github_organization_teams" "all" {
  root_teams_only = true
  summary_only    = true
}
