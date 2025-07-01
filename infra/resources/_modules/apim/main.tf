terraform {

  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
    http = {
      source  = "hashicorp/http"
      version = "3.5.0"
    }
  }
}
