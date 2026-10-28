terraform {

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
    azuread = {
      source = "hashicorp/azuread"
    }
    http = {
      source  = "hashicorp/http"
      version = "3.5.0"
    }
  }
}
