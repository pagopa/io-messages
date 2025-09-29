terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-messages.repository.tfstate"
    use_azuread_auth     = true
  }
}

# GitHub provider configuration
provider "github" {
  owner = "pagopa"
}
